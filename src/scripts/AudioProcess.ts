/**
 * @param audio The input audio as a Float32Array.
 * @param targetRmsDb The target RMS level in decibels (default is -14.0 dB, common for mobile/web).
 * @param maxPeakDb The maximum peak level allowed in decibels (default is -1.0 dB).
 * @returns A new Float32Array with normalized audio.
 */
export function normalizeAudio(
  audio: Float32Array,
  targetRmsDb: number = -14.0,
  maxPeakDb: number = -1.0
): Float32Array {
  if (audio.length === 0) return audio;

  // Convert dB targets to linear scale
  const targetRms = Math.pow(10, targetRmsDb / 20);
  const maxAllowedPeak = Math.pow(10, maxPeakDb / 20);

  // Pass 1: Calculate current RMS and Peak
  let sumSquares = 0;
  let currentPeak = 0;

  for (let i = 0; i < audio.length; i++) {
    const val = audio[i];
    sumSquares += val * val;
    const abs = Math.abs(val);
    if (abs > currentPeak) currentPeak = abs;
  }

  const currentRms = Math.sqrt(sumSquares / audio.length);

  // If silent or extremely quiet, return as is
  if (currentRms < 1e-8 || currentPeak < 1e-8) {
    return new Float32Array(audio);
  }

  // Calculate required gain for target RMS
  let gain = targetRms / currentRms;

  // Check if this gain would cause clipping above maxPeak
  if (currentPeak * gain > maxAllowedPeak) {
    // If it would clip, prioritize peak-based normalization
    gain = maxAllowedPeak / currentPeak;
  }

  // Pass 2: Apply gain and return new array
  const result = new Float32Array(audio.length);
  for (let i = 0; i < audio.length; i++) {
    result[i] = audio[i] * gain;
  }

  return result;
}
