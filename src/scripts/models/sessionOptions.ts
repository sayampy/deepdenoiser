/**
 * Shared ONNX Runtime thread settings.
 *
 * Too many intra-op threads on a phone costs more in scheduling and battery
 * than it saves, and is a common cause of thermal throttling during long
 * denoise passes. Match the thread count to the device instead of hardcoding
 * it: big cores get 4, modest devices get 2, small models stay at 2.
 */
export function preferredIntraOpThreads(): number {
  const cores =
    typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 4 : 4;
  if (cores >= 8) return 4;
  if (cores >= 4) return 2;
  return 1;
}
