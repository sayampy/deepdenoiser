/**
 * Model runtime.
 *
 * One entry point for "denoise this PCM buffer with the selected model",
 * regardless of whether the underlying network is DeepFilterNet's recurrent
 * frame model or a MossFormer chunked spectrogram model.
 *
 * Sessions are cached per model id because each `InferenceSession` holds
 * native resources; creating one per run leaked sessions until the app ran
 * out of heap (a shipped bug). Only one model's session is kept warm at a
 * time — the others are released — so peak memory stays flat on low-end
 * devices with several models installed.
 */

import { DeepFilterNet } from "../Denoiser";
import { MODELS, type ModelDescriptor, type ModelId } from "./registry";
import { MossFormerAdapter } from "./mossformer";
import { getInstallState, migrateBundledModel } from "./storage";
import { applyStrength, strengthToMix } from "./strength";

export interface DenoiseOptions {
  /**
   * Denoising strength 0..100. 100 = full model effect, 0 = original audio.
   * Applied as a wet/dry mix so it works identically for every model.
   */
  strength?: number;
  /** Called with 0..1 as work completes. */
  onProgress?: (fraction: number) => void;
}

/** Output of one streaming step. */
export interface StreamStep {
  /** Denoised samples ready to be written, in order. */
  pcm: Float32Array<ArrayBufferLike>;
  /** Input samples that did not fill a whole model chunk; feed them back in. */
  rest: Float32Array<ArrayBufferLike>;
}

/** Anything that can turn noisy mono PCM at its native rate into cleaner PCM. */
export interface DenoiseEngine {
  readonly modelId: ModelId;
  readonly sampleRate: number;
  /** Samples of algorithmic delay to drop from the start of the output. */
  readonly alignmentDelaySamples: number;
  /**
   * Denoise a growing stream.
   *
   * `pcm` is the carried-over remainder plus the newly arrived audio. The
   * engine consumes as many whole model chunks as it can and returns the
   * processed samples plus whatever is left for the next call. Output length
   * always equals the input consumed, so timestamps stay aligned.
   */
  denoiseStream(pcm: Float32Array, options?: DenoiseOptions): Promise<StreamStep>;
  /** Flush the trailing remainder; returns output of the same length. */
  denoiseFinal(rest: Float32Array, options?: DenoiseOptions): Promise<StreamStep>;
  /** Denoise a complete buffer in one call. */
  denoise(pcm: Float32Array, options?: DenoiseOptions): Promise<Float32Array>;
  /** Free native resources. */
  release(): Promise<void>;
}

const engines = new Map<ModelId, Promise<DenoiseEngine>>();

/**
 * Release every cached engine except `keep`.
 *
 * Called after selecting a model so that switching back and forth does not
 * accumulate native sessions.
 */
export async function releaseOtherEngines(keep: ModelId): Promise<void> {
  for (const [id, promise] of engines) {
    if (id === keep) continue;
    engines.delete(id);
    try {
      const engine = await promise;
      await engine.release();
    } catch {
      // A failed engine has nothing to release.
    }
  }
}

/** Release all engines, e.g. on app teardown. */
export async function releaseAllEngines(): Promise<void> {
  const ids = [...engines.keys()];
  for (const id of ids) {
    const promise = engines.get(id);
    engines.delete(id);
    if (!promise) continue;
    try {
      await (await promise).release();
    } catch {
      // ignore
    }
  }
}

/** Get (or lazily create) the engine for a model, loading its weights. */
export function getEngine(id: ModelId): Promise<DenoiseEngine> {
  const cached = engines.get(id);
  if (cached) return cached;

  const created = (async () => {
    const model = MODELS[id];
    let state = await getInstallState(id);
    if (state.status === "missing") {
      throw new Error(`${model.name} is not downloaded yet.`);
    }
    if (!state.path) {
      throw new Error(`${model.name} has no usable weights file.`);
    }
    let modelPath: string = state.path;

    // Prefer a managed copy when one exists so downloads and the bundled asset
    // follow the same code path; fall back to the packaged asset otherwise.
    try {
      const managed = await migrateBundledModel();
      if (managed.status === "installed") {
        state = managed;
        modelPath = managed.path;
      }
    } catch (error) {
      console.warn(`Managed copy for ${id} unavailable, using bundled asset:`, error);
    }

    if (model.family === "deepfilternet") {
      const net = new DeepFilterNet();
      await net.loadModel(modelPath);
      return new DeepFilterNetEngine(id, net, model);
    }

    const adapter = new MossFormerAdapter(model);
    await adapter.load(modelPath);
    return adapter;
  })();

  engines.set(id, created);
  created.catch(() => {
    // Let the next attempt retry instead of caching a rejection forever.
    if (engines.get(id) === created) engines.delete(id);
  });
  return created;
}

/** Prepend silence so index i corresponds to input sample i - delay. */
function delaySignal(signal: Float32Array, delay: number): Float32Array {
  if (delay <= 0) return signal;
  const out = new Float32Array(signal.length);
  if (signal.length > delay) out.set(signal.subarray(0, signal.length - delay), delay);
  return out;
}

class DeepFilterNetEngine implements DenoiseEngine {
  readonly sampleRate: number;
  readonly alignmentDelaySamples: number;

  constructor(
    readonly modelId: ModelId,
    private readonly net: DeepFilterNet,
    model: ModelDescriptor,
  ) {
    this.sampleRate = model.sampleRate;
    this.alignmentDelaySamples = net.alignmentDelaySamples;
  }

  async denoiseStream(
    pcm: Float32Array,
    options: DenoiseOptions = {},
  ): Promise<StreamStep> {
    const hop = MODELS.deepfilternet3.streaming.chunkSamples;
    const frames = Math.floor(pcm.length / hop);
    const consumed = frames * hop;
    if (frames === 0) return { pcm: new Float32Array(0), rest: pcm };

    this.net.setupStreaming();
    const out = new Float32Array(consumed);
    for (let i = 0; i < frames; i++) {
      const frame = pcm.subarray(i * hop, (i + 1) * hop);
      // processFrame's third argument is a SAMPLE offset into `out`, not a
      // frame index. Writing at `i` packed every frame into the first few
      // hundred samples and produced effectively silent output.
      await this.net.processFrame(frame, out, i * hop);
      if (i % 64 === 0) options.onProgress?.(i / frames);
    }
    // The model imposes a fixed delay, so the matching dry signal is the input
    // shifted by the same amount; the caller trims the head afterwards.
    const delayed = delaySignal(pcm.subarray(0, consumed), this.alignmentDelaySamples);
    const mixed = applyStrength(out, delayed, strengthToMix(options.strength ?? 100));
    return { pcm: mixed, rest: pcm.slice(consumed) };
  }

  async denoiseFinal(
    rest: Float32Array,
    options: DenoiseOptions = {},
  ): Promise<StreamStep> {
    if (rest.length === 0) return { pcm: new Float32Array(0), rest };
    const hop = MODELS.deepfilternet3.streaming.chunkSamples;
    // Pad the final partial frame with silence, process it, then trim back to
    // the original length so no trailing zeros reach the output.
    const padded = new Float32Array(hop);
    padded.set(rest.subarray(0, Math.min(rest.length, hop)));
    this.net.setupStreaming();
    const out = new Float32Array(hop);
    await this.net.processFrame(padded, out, 0);
    const delayed = delaySignal(padded, this.alignmentDelaySamples);
    const mixed = applyStrength(out, delayed, strengthToMix(options.strength ?? 100));
    return {
      pcm: mixed.subarray(0, rest.length).slice(),
      rest: new Float32Array(0),
    };
  }

  async denoise(pcm: Float32Array, options: DenoiseOptions = {}): Promise<Float32Array> {
    const { pcm: head, rest } = await this.denoiseStream(pcm, options);
    const { pcm: tail } = await this.denoiseFinal(rest, options);
    const out = new Float32Array(head.length + tail.length);
    out.set(head);
    out.set(tail, head.length);
    options.onProgress?.(1);
    return out;
  }

  async release(): Promise<void> {
    await this.net.release();
  }
}
