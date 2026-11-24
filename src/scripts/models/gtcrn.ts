/**
 * GTCRN streaming inference adapter.
 *
 * GTCRN is a tiny recurrent spectrogram enhancer whose exported ONNX graph is
 * stateful: every 256-sample hop consumes three cache tensors and returns their
 * replacements alongside an enhanced spectrum. This adapter mirrors sherpa-onnx's
 * `OnlineSpeechDenoiser` front end so the exact same weights work for both file
 * processing and live recording:
 *
 *   256 samples -> 512-sample analysis window (sqrt-Hann) -> FFT -> GTCRN
 *   -> inverse FFT -> weighted overlap-add -> 256 output samples
 *
 * The front end withholds the first overlap-add hop. We emit zeros for it so
 * the engine's output length always matches the samples it consumed; callers
 * then trim `alignmentDelaySamples` exactly as they do for DeepFilterNet3.
 */

import { InferenceSession, Tensor } from "onnxruntime-react-native";

import type { ModelDescriptor, ModelId } from "./registry";
import type { DenoiseEngine, DenoiseOptions, StreamStep } from "./runtime";
import { preferredIntraOpThreads } from "./sessionOptions";
import { applyStrength, strengthToMix } from "./strength";

const HOP = 256;
const FFT = 512;
const BINS = FFT / 2 + 1;
const SPEC_LEN = BINS * 2;

const CONV_CACHE_SHAPE = [2, 1, 16, 16, 33];
const TRA_CACHE_SHAPE = [2, 3, 1, 1, 16];
const INTER_CACHE_SHAPE = [2, 1, 33, 16];

function product(shape: number[]): number {
  return shape.reduce((a, b) => a * b, 1);
}

/** Prepend silence so index i corresponds to input sample i - delay. */
function delaySignal(signal: Float32Array, delay: number): Float32Array {
  if (delay <= 0) return signal;
  const out = new Float32Array(signal.length);
  if (signal.length > delay) out.set(signal.subarray(0, signal.length - delay), delay);
  return out;
}

export class GtcrnAdapter implements DenoiseEngine {
  readonly sampleRate = 16000;
  /** The withheld first hop is emitted as leading zeros in the stream output. */
  readonly alignmentDelaySamples = HOP;
  /** No input prefix is needed — the delay is entirely in our output buffer. */
  readonly alignmentPrefixSamples = 0;
  readonly modelId: ModelId;

  private session: InferenceSession | null = null;

  /** Reused FFT/STFT state (no allocation in the per-hop hot loop). */
  private readonly window = new Float32Array(FFT);
  private readonly fftRe = new Float32Array(FFT);
  private readonly fftIm = new Float32Array(FFT);
  private readonly spec = new Float32Array(SPEC_LEN);
  private readonly enhancedSpec = new Float32Array(SPEC_LEN);
  private readonly bitReverse = new Uint16Array(FFT);
  private readonly cosTable = new Float32Array(FFT / 2);
  private readonly sinTable = new Float32Array(FFT / 2);

  /** Streaming buffers. */
  private readonly analysis = new Float32Array(FFT);
  private readonly overlap = new Float32Array(FFT);
  private primed = false;

  /** Cache tensors, allocated once and copied back after every hop. */
  private convCache!: Float32Array;
  private traCache!: Float32Array;
  private interCache!: Float32Array;
  private convTensor!: Tensor;
  private traTensor!: Tensor;
  private interTensor!: Tensor;

  constructor(model: ModelDescriptor) {
    this.modelId = model.id;

    // Periodic sqrt-Hann (torch.hann_window(periodic=True), as in sherpa-onnx).
    for (let i = 0; i < FFT; i++) {
      const hann = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / FFT);
      this.window[i] = Math.sqrt(hann);
    }
    // Radix-2 twiddles and bit-reversal permutation for a 512-point FFT.
    let bits = 0;
    while (1 << bits < FFT) bits++;
    for (let i = 0; i < FFT; i++) {
      let reversed = 0;
      for (let b = 0; b < bits; b++) {
        reversed = (reversed << 1) | ((i >> b) & 1);
      }
      this.bitReverse[i] = reversed;
    }
    for (let k = 0; k < FFT / 2; k++) {
      this.cosTable[k] = Math.cos((2 * Math.PI * k) / FFT);
      this.sinTable[k] = Math.sin((2 * Math.PI * k) / FFT);
    }
  }

  async load(path: string): Promise<void> {
    const options: InferenceSession.SessionOptions = {
      executionProviders: ["xnnpack", "cpu"],
      graphOptimizationLevel: "all",
      interOpNumThreads: 1,
      intraOpNumThreads: preferredIntraOpThreads(),
    };
    try {
      this.session = await InferenceSession.create(path, options);
    } catch {
      // XNNPACK covers Conv/MatMul; GRU/ScatterND fall back to CPU. Devices
      // whose ORT build cannot mix the two still get a pure-CPU session.
      this.session = await InferenceSession.create(path, {
        ...options,
        executionProviders: ["cpu"],
      });
    }
    this.initCaches();
  }

  private initCaches(): void {
    this.convCache = new Float32Array(product(CONV_CACHE_SHAPE));
    this.traCache = new Float32Array(product(TRA_CACHE_SHAPE));
    this.interCache = new Float32Array(product(INTER_CACHE_SHAPE));
    this.convTensor = new Tensor("float32", this.convCache, CONV_CACHE_SHAPE);
    this.traTensor = new Tensor("float32", this.traCache, TRA_CACHE_SHAPE);
    this.interTensor = new Tensor("float32", this.interCache, INTER_CACHE_SHAPE);
    this.resetStream();
  }

  /** Clear all stream state before a new file/recording. */
  resetStream(): void {
    this.convCache?.fill(0);
    this.traCache?.fill(0);
    this.interCache?.fill(0);
    this.analysis.fill(0);
    this.overlap.fill(0);
    this.primed = false;
  }

  async denoiseStream(
    pcm: Float32Array,
    options: DenoiseOptions = {},
  ): Promise<StreamStep> {
    // The caller owns the carry: `pcm` is already the previous remainder plus
    // the newly arrived audio (the same contract as DeepFilterNetEngine).
    const pending = pcm;
    const hops = Math.floor(pending.length / HOP);
    if (hops === 0) return { pcm: new Float32Array(0), rest: pending };

    const out = new Float32Array(hops * HOP);
    for (let i = 0; i < hops; i++) {
      await this.processHop(pending.subarray(i * HOP, (i + 1) * HOP), out, i * HOP);
      if (i % 32 === 0) options.onProgress?.((i + 1) / hops);
    }
    const rest = pending.slice(hops * HOP);

    // The model output trails the input by one hop; line the dry signal up with
    // it before applying the wet/dry mix.
    const dry = delaySignal(pending.subarray(0, out.length), HOP);
    return {
      pcm: applyStrength(out, dry, strengthToMix(options.strength ?? 100)),
      rest,
    };
  }

  async denoiseFinal(
    rest: Float32Array,
    options: DenoiseOptions = {},
  ): Promise<StreamStep> {
    // `rest` is the carry returned by the last denoiseStream call; the caller
    // feeds it back explicitly, so do not add the adapter's copy again.
    const pending = new Float32Array(rest.length);
    pending.set(rest);
    // The overlap-add output of the last consumed stream hop is only emitted
    // by the first hop below. Capture its input so the dry mix stays aligned.
    // When no stream hop ran this is simply the leading alignment silence.
    const lastHop = this.primed
      ? this.analysis.subarray(HOP).slice()
      : new Float32Array(HOP);

    // At least one hop is needed even with no remainder: it flushes the last
    // stream hop that the one-hop overlap-add delay withheld. The extra zero
    // hop flushes the remainder itself.
    const paddedHops = Math.max(1, Math.ceil(pending.length / HOP));
    const produced = new Float32Array((paddedHops + 1) * HOP);
    for (let i = 0; i < paddedHops; i++) {
      const from = i * HOP;
      const full = new Float32Array(HOP);
      if (from < pending.length) {
        full.set(pending.subarray(from, Math.min(from + HOP, pending.length)));
      }
      await this.processHop(full, produced, i * HOP);
    }
    await this.processHop(new Float32Array(HOP), produced, paddedHops * HOP);

    // produced[0..HOP) is the withheld stream hop (or leading silence), then
    // the remainder's samples. Callers trim alignmentDelaySamples from the
    // combined stream exactly once, so both cases use the same layout.
    const out = produced.subarray(0, HOP + pending.length).slice();
    const dry = new Float32Array(out.length);
    dry.set(lastHop.subarray(0, HOP), 0);
    dry.set(pending.subarray(0, Math.min(pending.length, out.length - HOP)), HOP);
    this.resetStream();
    options.onProgress?.(1);
    return {
      pcm: applyStrength(out, dry, strengthToMix(options.strength ?? 100)),
      rest: new Float32Array(0),
    };
  }

  async denoise(pcm: Float32Array, options: DenoiseOptions = {}): Promise<Float32Array> {
    this.resetStream();
    const { pcm: head, rest } = await this.denoiseStream(pcm, options);
    const { pcm: tail } = await this.denoiseFinal(rest, options);
    const out = new Float32Array(head.length + tail.length);
    out.set(head);
    out.set(tail, head.length);
    // Drop the one-hop alignment prefix that the stream and final steps emit.
    return out.subarray(this.alignmentDelaySamples).slice();
  }

  async release(): Promise<void> {
    if (this.session) {
      await this.session.release();
      this.session = null;
    }
  }

  /** One 256-sample hop: STFT -> model -> inverse STFT -> overlap-add. */
  private async processHop(
    hop: Float32Array,
    dest: Float32Array,
    offset: number,
  ): Promise<void> {
    if (!this.session) throw new Error("GTCRN session not loaded");

    // Slide the analysis window one hop left, append the new samples and window.
    this.analysis.copyWithin(0, HOP);
    this.analysis.set(hop, FFT - HOP);
    for (let i = 0; i < FFT; i++) this.fftRe[i] = this.analysis[i] * this.window[i];

    this.fft(false); // re/im -> interleaved bins in `spec`
    for (let k = 0; k < BINS; k++) {
      this.spec[k * 2] = this.fftRe[k];
      this.spec[k * 2 + 1] = this.fftIm[k];
    }

    const results = await this.session.run({
      mix: new Tensor("float32", this.spec, [1, BINS, 1, 2]),
      conv_cache: this.convTensor,
      tra_cache: this.traTensor,
      inter_cache: this.interTensor,
    });

    // Copy the returned caches into the pre-allocated input buffers: no new
    // Tensor objects per hop, so a long file does not churn the JS heap.
    this.enhancedSpec.set((results.enh.data as Float32Array).subarray(0, SPEC_LEN));
    this.convCache.set((results.conv_cache_out.data as Float32Array).subarray(0, this.convCache.length));
    this.traCache.set((results.tra_cache_out.data as Float32Array).subarray(0, this.traCache.length));
    this.interCache.set((results.inter_cache_out.data as Float32Array).subarray(0, this.interCache.length));

    // Build the Hermitian-symmetric full spectrum and invert it.
    this.fftRe.fill(0);
    this.fftIm.fill(0);
    this.fftRe[0] = this.enhancedSpec[0];
    this.fftRe[BINS - 1] = this.enhancedSpec[SPEC_LEN - 2];
    for (let k = 1; k < BINS - 1; k++) {
      const re = this.enhancedSpec[k * 2];
      const im = this.enhancedSpec[k * 2 + 1];
      this.fftRe[k] = re;
      this.fftIm[k] = im;
      this.fftRe[FFT - k] = re;
      this.fftIm[FFT - k] = -im;
    }
    this.fft(true); // inverse, result in fftRe

    this.overlap.copyWithin(0, HOP);
    this.overlap.fill(0, FFT - HOP);
    for (let i = 0; i < FFT; i++) this.overlap[i] += this.fftRe[i] * this.window[i];

    if (!this.primed) {
      // First hop has no settled overlap-add output; emit silence for it.
      this.primed = true;
      return;
    }
    dest.set(this.overlap.subarray(0, HOP), offset);
  }

  /** In-place radix-2 FFT over fftRe/fftIm (inverse when `inverse=true`). */
  private fft(inverse: boolean): void {
    const re = this.fftRe;
    const im = this.fftIm;
    const n = re.length;
    for (let i = 0; i < n; i++) {
      const j = this.bitReverse[i];
      if (i < j) {
        let t = re[i]; re[i] = re[j]; re[j] = t;
        t = im[i]; im[i] = im[j]; im[j] = t;
      }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const half = len / 2;
      const step = n / len;
      for (let i = 0; i < n; i += len) {
        for (let k = 0; k < half; k++) {
          const c = this.cosTable[k * step];
          const s = this.sinTable[k * step] * (inverse ? 1 : -1);
          const a = i + k;
          const b = a + half;
          const tr = re[b] * c - im[b] * s;
          const ti = re[b] * s + im[b] * c;
          re[b] = re[a] - tr;
          im[b] = im[a] - ti;
          re[a] += tr;
          im[a] += ti;
        }
      }
    }
    if (inverse) {
      for (let i = 0; i < n; i++) {
        re[i] /= n;
        im[i] /= n;
      }
    }
  }
}
