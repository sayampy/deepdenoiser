/**
 * MossFormer inference adapter.
 *
 * Both MossFormer models operate on spectrogram masks rather than raw frames,
 * so this adapter owns the whole signal path: feature extraction, masked
 * reconstruction, and chunk stitching.
 *
 *  - MossFormer2_SE_48K: 60-dim Kaldi fbank + delta + delta-delta -> a 961-bin
 *    real/imag mask applied to a non-centred STFT.
 *  - MossFormerGAN_SE_16K: power-compressed 201-bin complex spectrogram, fixed
 *    201x201 attention grid, returns real/imag which must be uncompressed.
 *
 * Chunks overlap and are cross-faded at their edges; the discarded margin is
 * `(chunk - stride) / 2` on each side, matching upstream ClearerVoice.
 */

import { InferenceSession, Tensor } from "onnxruntime-react-native";

import type { ModelDescriptor, ModelId } from "./registry";
import type { DenoiseEngine, DenoiseOptions, StreamStep } from "./runtime";
import { applyStrength, strengthToMix } from "./strength";

/** Frames of 25 ms at 48 kHz used for the Kaldi fbank front end. */
const FBANK_FRAME_LENGTH_MS = 40; // 1920 / 48000 * 1000
const FBANK_FRAME_SHIFT_MS = 8; // 384 / 48000 * 1000
const FBANK_MELS = 60;
const FBANK_LOW_FREQ = 20;
const FBANK_HIGH_FREQ = 0;

export class MossFormerAdapter implements DenoiseEngine {
  readonly sampleRate: number;
  readonly alignmentDelaySamples = 0;

  private session: InferenceSession | null = null;
  /** Audio held back because it does not yet fill an overlap window. */
  private carry = new Float32Array(0);
  /** Number of windows emitted so far; the first one has no left margin. */
  private emittedAny = 0;

  constructor(
    private readonly model: ModelDescriptor,
    readonly modelId: ModelId = model.id as ModelId,
  ) {
    this.sampleRate = model.sampleRate;
  }

  async load(path: string): Promise<void> {
    this.session = await InferenceSession.create(path, {
      // CPU only: no other execution provider has been validated on device.
      executionProviders: ["cpu"],
      graphOptimizationLevel: "all",
      interOpNumThreads: 1,
      intraOpNumThreads: 2,
    });
  }

  /**
   * Streaming denoise with overlapping chunks.
   *
   * Upstream ClearerVoice runs chunks at 75% stride and discards the outer
   * margin of each result (seam artefacts live at chunk edges). A naive
   * fixed-boundary stitch would drop those seams into the output, so the
   * adapter keeps a one-chunk overlap buffer and emits only the settled
   * centre of each window.
   */
  async denoiseStream(
    pcm: Float32Array,
    options: DenoiseOptions = {},
  ): Promise<StreamStep> {
    const chunk = this.model.streaming.chunkSamples;
    const stride = Math.floor(chunk * 0.75);
    const giveUp = Math.floor((chunk - stride) / 2);

    const pending = new Float32Array(this.carry.length + pcm.length);
    pending.set(this.carry);
    pending.set(pcm, this.carry.length);

    // The first window is emitted in full; later windows contribute only their
    // settled middle. A tail of one chunk is kept to cover the next window.
    const windows = pending.length < chunk ? 0 : Math.floor((pending.length - chunk) / stride) + 1;
    if (windows === 0) {
      this.carry = pending;
      return { pcm: new Float32Array(0), rest: pending };
    }

    const emitted: Float32Array[] = [];
    for (let i = 0; i < windows; i++) {
      const start = i * stride;
      const segment = pending.subarray(start, start + chunk);
      const raw = await this.runChunk(segment);
      // Cross-fade against the identical dry window so strength applies to the
      // same samples the model saw.
      const enhanced = applyStrength(
        raw,
        segment.length === raw.length ? segment : null,
        strengthToMix(options.strength ?? 100),
      );
      if (this.emittedAny === 0) {
        emitted.push(enhanced.subarray(0, chunk - giveUp).slice());
      } else {
        emitted.push(enhanced.subarray(giveUp, chunk - giveUp).slice());
      }
      this.emittedAny += 1;
      options.onProgress?.((i + 1) / windows);
    }

    const consumed = (windows - 1) * stride + chunk;
    this.carry = pending.slice(consumed);

    const total = emitted.reduce((n, part) => n + part.length, 0);
    const out = new Float32Array(total);
    let offset = 0;
    for (const part of emitted) {
      out.set(part, offset);
      offset += part.length;
    }
    return { pcm: out, rest: this.carry };
  }

  async denoiseFinal(
    rest: Float32Array,
    options: DenoiseOptions = {},
  ): Promise<StreamStep> {
    const pending = rest.length > 0 ? rest : this.carry;
    if (pending.length === 0) return { pcm: new Float32Array(0), rest };
    const chunk = this.model.streaming.chunkSamples;
    const padded = new Float32Array(Math.max(chunk, Math.ceil(pending.length / chunk) * chunk));
    padded.set(pending);
    const raw = await this.runChunk(padded.subarray(0, padded.length));
    const enhanced = applyStrength(
      raw,
      padded.length === raw.length ? padded : null,
      strengthToMix(options.strength ?? 100),
    );
    this.carry = new Float32Array(0);
    options.onProgress?.(1);
    return {
      pcm: enhanced.subarray(0, pending.length).slice(),
      rest: new Float32Array(0),
    };
  }

  async denoise(pcm: Float32Array, options: DenoiseOptions = {}): Promise<Float32Array> {
    this.resetStream();
    const parts: Float32Array[] = [];
    let rest = pcm;
    while (rest.length >= this.model.streaming.chunkSamples) {
      const step = await this.denoiseStream(rest, options);
      if (step.pcm.length === 0) break;
      parts.push(step.pcm);
      rest = step.rest;
    }
    const tail = await this.denoiseFinal(rest, options);
    parts.push(tail.pcm);
    const total = parts.reduce((n, p) => n + p.length, 0);
    const out = new Float32Array(total);
    let offset = 0;
    for (const part of parts) {
      out.set(part, offset);
      offset += part.length;
    }
    return out;
  }

  /** Clear per-run overlap state so a new file starts clean. */
  resetStream(): void {
    this.carry = new Float32Array(0);
    this.emittedAny = 0;
  }

  /** One model inference call for a fixed-size audio segment. */
  private async runChunk(segment: Float32Array): Promise<Float32Array> {
    if (this.model.id === "mossformer2_se_48k") {
      return this.run48k(segment);
    }
    return this.run16k(segment);
  }

  // ---------------------------------------------------------------- 48 kHz ---

  private async run48k(segment: Float32Array): Promise<Float32Array> {
    const session = this.session!;
    const spectrum = this.model.spectrum!;
    const bins = spectrum.bins;

    // Non-centred STFT so frame t covers samples [t*hop, t*hop + win).
    const frames = Math.floor((segment.length - spectrum.windowLength) / spectrum.hopLength) + 1;
    const window = hamming(spectrum.windowLength);
    const spec = stft(segment, frames, spectrum.fftSize, spectrum.windowLength, spectrum.hopLength, window);

    const fbank = fbankFeatures(segment, this.sampleRate, FBANK_MELS, frames);
    const features = new Tensor("float32", fbank, [1, FBANK_MELS * 3, frames]);
    const maskOut = await session.run({ features });
    // Output is [1, frames, bins] where each bin holds a real/imag pair, i.e.
    // two floats per bin per frame, matching the STFT layout below.
    const mask = maskOut.mask.data as Float32Array;
    return istftWithMask(spec, mask, frames, bins, segment.length, spectrum.fftSize, spectrum.windowLength, spectrum.hopLength, window);
  }

  // ---------------------------------------------------------------- 16 kHz ---

  private async run16k(segment: Float32Array): Promise<Float32Array> {
    const session = this.session!;
    const spectrum = this.model.spectrum!;
    const bins = spectrum.bins;

    // The GAN graph is only valid on a fixed 201x201 grid.
    const centred = stftCentered(
      segment,
      bins,
      spectrum.fftSize,
      spectrum.windowLength,
      spectrum.hopLength,
    );

    const spec = new Float32Array(2 * bins * bins);
    const mag = new Float32Array(bins * bins);
    for (let f = 0; f < bins; f++) {
      for (let t = 0; t < bins; t++) {
        const re = centred[0][f * bins + t];
        const im = centred[1][f * bins + t];
        const magnitude = Math.hypot(re, im);
        const compressed = Math.pow(magnitude, spectrum.compression);
        const phase = Math.atan2(im, re);
        spec[0 * bins * bins + f * bins + t] = compressed * Math.cos(phase);
        spec[bins * bins + f * bins + t] = compressed * Math.sin(phase);
        mag[f * bins + t] = magnitude;
      }
    }

    const outputs = await session.run({
      spectrum: new Tensor("float32", spec, [1, 2, bins, bins]),
      mag: new Tensor("float32", mag, [1, 1, bins, bins]),
    });

    const real = outputs.real.data as Float32Array;
    const imag = outputs.imag.data as Float32Array;
    // Upstream compresses magnitude with an exponent of 0.3 and un-compresses
    // with 1/0.3, so the transformed magnitude is raised to the inverse power.
    const reconstructed = new Float32Array(2 * bins * bins);
    const invCompression = 1 / spectrum.compression;
    for (let i = 0; i < bins * bins; i++) {
      const magnitude = Math.hypot(real[i], imag[i]);
      const phase = Math.atan2(imag[i], real[i]);
      const linear = Math.pow(magnitude, invCompression);
      reconstructed[i] = linear * Math.cos(phase);              // real plane
      reconstructed[bins * bins + i] = linear * Math.sin(phase); // imag plane
    }

    return istftCentered(
      reconstructed,
      bins,
      bins,
      segment.length,
      spectrum.fftSize,
      spectrum.windowLength,
      spectrum.hopLength,
    );
  }

  async release(): Promise<void> {
    if (this.session) {
      await this.session.release();
      this.session = null;
    }
  }
}

// ------------------------------------------------------------- DSP helpers ---

function hamming(length: number): Float32Array {
  // Periodic Hamming window, matching torch.hamming_window(periodic=True).
  const w = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    w[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / length);
  }
  return w;
}

/**
 * In-place-capable radix-2 FFT.
 *
 * The transform length MUST be a power of two: the butterflies below index by
 * stride and silently read out of bounds (producing NaN) for other sizes. Call
 * `fftPowerOfTwo` unless you already know the length qualifies.
 */
function fft(frame: Float32Array, fftSize: number): { re: Float32Array; im: Float32Array } {
  const re = new Float32Array(fftSize);
  const im = new Float32Array(fftSize);
  re.set(frame.subarray(0, Math.min(frame.length, fftSize)));

  for (let i = 1, j = 0; i < fftSize; i++) {
    let bit = fftSize >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }

  for (let len = 2; len <= fftSize; len <<= 1) {
    const angle = (-2 * Math.PI) / len;
    for (let i = 0; i < fftSize; i += len) {
      for (let k = 0; k < len / 2; k++) {
        const cos = Math.cos(angle * k);
        const sin = Math.sin(angle * k);
        const a = i + k;
        const b = a + len / 2;
        const tr = re[b] * cos - im[b] * sin;
        const ti = re[b] * sin + im[b] * cos;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
      }
    }
  }
  return { re, im };
}

/** Inverse transform from full-band complex bins to real samples. */
function fftSpectralInverse(re: Float32Array, im: Float32Array, fftSize: number): Float32Array {
  const er = new Float32Array(fftSize);
  const ei = new Float32Array(fftSize);
  er.set(re.subarray(0, Math.min(re.length, fftSize)));
  ei.set(im.subarray(0, Math.min(im.length, fftSize)));

  for (let i = 1, j = 0; i < fftSize; i++) {
    let bit = fftSize >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [er[i], er[j]] = [er[j], er[i]];
      [ei[i], ei[j]] = [ei[j], ei[i]];
    }
  }

  for (let len = 2; len <= fftSize; len <<= 1) {
    const angle = (2 * Math.PI) / len;
    for (let i = 0; i < fftSize; i += len) {
      for (let k = 0; k < len / 2; k++) {
        const cos = Math.cos(angle * k);
        const sin = Math.sin(angle * k);
        const a = i + k;
        const b = a + len / 2;
        const tr = er[b] * cos - ei[b] * sin;
        const ti = er[b] * sin + ei[b] * cos;
        er[b] = er[a] - tr;
        ei[b] = ei[a] - ti;
        er[a] += tr;
        ei[a] += ti;
      }
    }
  }
  // Unnormalised inverse transform: scale by 1/N here so callers can add
  // frames directly without carrying a per-frame factor.
  const scale = 1 / fftSize;
  for (let i = 0; i < fftSize; i++) er[i] *= scale;
  return er;
}

/** Non-centred STFT returning interleaved re/im pairs per frame. */
function stft(
  samples: Float32Array,
  frames: number,
  fftSize: number,
  windowLength: number,
  hop: number,
  window: Float32Array,
): Float32Array {
  const bins = fftSize / 2 + 1;
  const fftLen = nextPowerOfTwo(fftSize);
  const out = new Float32Array(frames * bins * 2);
  const frameBuf = new Float32Array(fftLen);
  for (let t = 0; t < frames; t++) {
    const start = t * hop;
    frameBuf.fill(0);
    for (let i = 0; i < windowLength; i++) {
      const s = samples[start + i];
      if (s !== undefined) frameBuf[i] = s * window[i];
    }
    const { re, im } = fft(frameBuf, fftLen);
    for (let b = 0; b < bins; b++) {
      out[(t * bins + b) * 2] = re[b];
      out[(t * bins + b) * 2 + 1] = im[b];
    }
  }
  return out;
}

/** Centred STFT producing separate [bins x frames] real and imag planes. */
function stftCentered(
  samples: Float32Array,
  frames: number,
  fftSize: number,
  windowLength: number,
  hop: number,
): [Float32Array, Float32Array] {
  const bins = fftSize / 2 + 1;
  const window = hamming(windowLength);
  const pad = fftSize / 2;
  const fftLen = nextPowerOfTwo(fftSize);
  const real = new Float32Array(bins * frames);
  const imag = new Float32Array(bins * frames);
  const frameBuf = new Float32Array(fftLen);

  for (let t = 0; t < frames; t++) {
    const start = t * hop - pad;
    frameBuf.fill(0);
    for (let i = 0; i < windowLength; i++) {
      const idx = start + i;
      if (idx >= 0 && idx < samples.length) frameBuf[i] = samples[idx] * window[i];
    }
    const { re, im } = fft(frameBuf, fftLen);
    for (let b = 0; b < bins; b++) {
      real[b * frames + t] = re[b];
      imag[b * frames + t] = im[b];
    }
  }
  return [real, imag];
}

/** Apply a real/imag mask and invert with weighted overlap-add. */
function istftWithMask(
  spec: Float32Array,
  mask: Float32Array,
  frames: number,
  bins: number,
  outputLength: number,
  fftSize: number,
  windowLength: number,
  hop: number,
  window: Float32Array,
): Float32Array {
  const fftLen = nextPowerOfTwo(fftSize);
  const fullRe = new Float32Array(fftLen);
  const fullIm = new Float32Array(fftLen);
  const out = new Float32Array(outputLength + fftLen);
  const norm = new Float32Array(outputLength + fftLen);

  for (let t = 0; t < frames; t++) {
    fullRe.fill(0);
    fullIm.fill(0);
    for (let b = 0; b < bins; b++) {
      const mr = mask[(t * bins + b) * 2] ?? 0;
      const mi = mask[(t * bins + b) * 2 + 1] ?? 0;
      const sr = spec[(t * bins + b) * 2];
      const si = spec[(t * bins + b) * 2 + 1];
      fullRe[b] = sr * mr - si * mi;
      fullIm[b] = sr * mi + si * mr;
      if (b > 0 && b < fftLen / 2) {
        fullRe[fftLen - b] = fullRe[b];
        fullIm[fftLen - b] = -fullIm[b];
      }
    }
    const frameOut = fftSpectralInverse(fullRe, fullIm, fftLen);
    const start = t * hop;
    for (let i = 0; i < windowLength; i++) {
      const idx = start + i;
      if (idx >= out.length) break;
      out[idx] += frameOut[i] * window[i];
      norm[idx] += window[i] * window[i];
    }
  }

  const result = new Float32Array(outputLength);
  for (let i = 0; i < outputLength; i++) {
    result[i] = norm[i] > 1e-8 ? out[i] / norm[i] : 0;
  }
  return result;
}

/** Inverse centred STFT from separate real/imag planes. */
function istftCentered(
  planes: Float32Array,
  bins: number,
  frames: number,
  outputLength: number,
  fftSize: number,
  windowLength: number,
  hop: number,
): Float32Array {
  const window = hamming(windowLength);
  const pad = fftSize / 2;
  const fftLen = nextPowerOfTwo(fftSize);
  const out = new Float32Array(outputLength + fftLen);
  const norm = new Float32Array(outputLength + fftLen);
  const fullRe = new Float32Array(fftLen);
  const fullIm = new Float32Array(fftLen);
  const planeSize = bins * frames;

  for (let t = 0; t < frames; t++) {
    fullRe.fill(0);
    fullIm.fill(0);
    for (let b = 0; b < bins; b++) {
      fullRe[b] = planes[b * frames + t];
      fullIm[b] = planes[planeSize + b * frames + t];
      if (b > 0 && b < fftLen / 2) {
        fullRe[fftLen - b] = fullRe[b];
        fullIm[fftLen - b] = -fullIm[b];
      }
    }
    const frameOut = fftSpectralInverse(fullRe, fullIm, fftLen);
    const start = t * hop - pad;
    for (let i = 0; i < windowLength; i++) {
      const idx = start + i;
      if (idx < 0 || idx >= out.length) continue;
      out[idx] += frameOut[i] * window[i];
      norm[idx] += window[i] * window[i];
    }
  }

  const result = new Float32Array(outputLength);
  for (let i = 0; i < outputLength; i++) {
    result[i] = norm[i] > 1e-8 ? out[i] / norm[i] : 0;
  }
  return result;
}

/**
 * Kaldi-compatible fbank features with delta and delta-delta.
 *
 * Returns `[3 * mels, frames]` laid out to match the model's channel axis.
 * Dither is disabled: upstream adds 1.0, but reproducible output matters more
 * for a denoiser than matching the training-time noise.
 */
function fbankFeatures(
  samples: Float32Array,
  sampleRate: number,
  mels: number,
  frames: number,
): Float32Array {
  const frameLength = Math.round((FBANK_FRAME_LENGTH_MS / 1000) * sampleRate);
  const frameShift = Math.round((FBANK_FRAME_SHIFT_MS / 1000) * sampleRate);
  const fftLen = nextPowerOfTwo(frameLength);
  const bins = fftLen / 2 + 1;
  const melFilters = melFilterBank(mels, bins, sampleRate);
  const window = hamming(frameLength);

  const features = new Float32Array(mels * frames);
  const frameBuf = new Float32Array(fftLen);
  const power = new Float32Array(bins);

  for (let t = 0; t < frames; t++) {
    const start = t * frameShift;
    frameBuf.fill(0);
    for (let i = 0; i < frameLength; i++) {
      const s = samples[start + i];
      if (s !== undefined) frameBuf[i] = s * 32768 * window[i]; // Kaldi scales to int16 range
    }
    const { re, im } = fft(frameBuf, fftLen);
    for (let b = 0; b < bins; b++) power[b] = re[b] * re[b] + im[b] * im[b];
    for (let m = 0; m < mels; m++) {
      let acc = 0;
      const filter = melFilters[m];
      for (let b = 0; b < bins; b++) acc += filter[b] * power[b];
      // Kaldi floors energies to avoid log(0).
      features[m * frames + t] = Math.log(Math.max(acc, 1e-10));
    }
  }

  const delta = computeDeltas(features, mels, frames);
  const delta2 = computeDeltas(delta, mels, frames);

  const out = new Float32Array(3 * mels * frames);
  out.set(features, 0);
  out.set(delta, mels * frames);
  out.set(delta2, 2 * mels * frames);
  return out;
}

/** torchaudio.functional.compute_deltas with the default window of 2. */
function computeDeltas(input: Float32Array, rows: number, frames: number): Float32Array {
  const n = 2;
  const denom = 2 * (1 * 1 + 2 * 2);
  const out = new Float32Array(rows * frames);
  for (let r = 0; r < rows; r++) {
    for (let t = 0; t < frames; t++) {
      let acc = 0;
      for (let k = 1; k <= n; k++) {
        const left = input[r * frames + Math.max(0, t - k)];
        const right = input[r * frames + Math.min(frames - 1, t + k)];
        acc += k * (right - left);
      }
      out[r * frames + t] = acc / denom;
    }
  }
  return out;
}

function melFilterBank(mels: number, bins: number, sampleRate: number): Float32Array[] {
  const lowMel = hzToMel(FBANK_LOW_FREQ);
  const highMel = hzToMel(FBANK_HIGH_FREQ > 0 ? FBANK_HIGH_FREQ : sampleRate / 2);
  const points = new Float32Array(mels + 2);
  for (let i = 0; i < mels + 2; i++) {
    points[i] = melToHz(lowMel + ((highMel - lowMel) * i) / (mels + 1));
  }
  const filters: Float32Array[] = [];
  for (let m = 0; m < mels; m++) {
    const filter = new Float32Array(bins);
    const left = points[m];
    const center = points[m + 1];
    const right = points[m + 2];
    for (let b = 0; b < bins; b++) {
      const freq = (b * sampleRate) / (2 * (bins - 1));
      if (freq >= left && freq <= center && center > left) {
        filter[b] = (freq - left) / (center - left);
      } else if (freq > center && freq <= right && right > center) {
        filter[b] = (right - freq) / (right - center);
      }
    }
    filters.push(filter);
  }
  return filters;
}

function hzToMel(hz: number): number {
  return 1127 * Math.log(1 + hz / 700);
}

function melToHz(mel: number): number {
  return 700 * (Math.exp(mel / 1127) - 1);
}

function nextPowerOfTwo(value: number): number {
  let n = 1;
  while (n < value) n <<= 1;
  return n;
}