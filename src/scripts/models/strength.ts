/**
 * Denoising strength.
 *
 * The DeepFilterNet graph shipped in this app exposes no attenuation input
 * (its inputs are `input_frame` plus the recurrent state tensors), so the old
 * "attenuation limit" slider was bound to a tensor nothing consumed — every
 * value produced identical audio. MossFormer's exported graphs likewise return
 * a full mask.
 *
 * Strength is therefore applied as a post-inference mix between the model
 * output and the delayed dry signal:
 *
 *   out = dry + strength * (wet - dry)
 *
 * where strength 1.0 is the model at full effect and 0.0 passes the original
 * audio through untouched. This is model-independent, monotonic, and audibly
 * meaningful across the whole slider range.
 */

/** Slider positions exposed in Settings and the processing screen (percent). */
export const STRENGTH_STEPS: number[] = [0, 25, 50, 75, 100];

export const DEFAULT_STRENGTH = 100;

/** Convert a percentage to the 0..1 mix factor. */
export function strengthToMix(percent: number): number {
  const clamped = Math.max(0, Math.min(100, percent));
  return clamped / 100;
}

/**
 * Blend wet (model output) with dry (delayed original) for a whole buffer.
 *
 * `dry` must already be aligned to `wet`. When it is shorter than `wet` the
 * missing tail uses the wet signal (nothing to cross-fade against), which keeps
 * the output length equal to the input length.
 */
export function applyStrength(
  wet: Float32Array,
  dry: Float32Array | null,
  mix: number,
): Float32Array {
  if (mix >= 1 || !dry) return wet;
  if (mix <= 0) {
    const passthrough = new Float32Array(wet.length);
    passthrough.set(dry.subarray(0, Math.min(dry.length, wet.length)));
    return passthrough;
  }
  const out = new Float32Array(wet.length);
  const n = Math.min(wet.length, dry.length);
  for (let i = 0; i < n; i++) {
    out[i] = dry[i] + mix * (wet[i] - dry[i]);
  }
  for (let i = n; i < wet.length; i++) out[i] = wet[i];
  return out;
}