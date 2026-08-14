/**
 * Silence-trim settings shared by the file-denoise and live-recording screens.
 *
 * When enabled, silent pauses are removed from the DENOISED audio (never from
 * the original) — the start, the end, and any pause long enough to count —
 * which shortens the audio. `mode` picks how the silence threshold is decided:
 *  - "auto": the native analyzer estimates a threshold from the recording
 *    itself (8 dB above the 25th percentile of frame RMS, clamped into a
 *    speech-safe window of -45..-35 dBFS so quiet speech is never cut).
 *  - "manual": the user's `thresholdDb` is used verbatim.
 *
 * `minSilenceMs` decides HOW LONG a silence must be before it is removed.
 * Research on natural speech pauses (Goldman-Eisler 1972; Campione & Véronis
 * 2002; BYU/IDEA corpus) converges on ~500ms: pauses below that are normal
 * word/phrase rhythm and must be kept; longer ones are hesitations, thinking
 * pauses, or dead air and are safe to remove.
 */

export interface SilenceTrimSettings {
  enabled: boolean;
  mode: "auto" | "manual";
  /** Manual silence threshold in dBFS (range -60..-20). Ignored in auto mode. */
  thresholdDb: number;
  /**
   * Minimum silence duration before a pause is removed (ms). Natural default
   * 500ms — keeps voice flow natural, short pauses are never trimmed.
   */
  minSilenceMs: number;
}

/**
 * Researched natural default for the minimum removable pause duration.
 * Studies of spontaneous speech (Goldman-Eisler 1972; Duez 1982; Campione &
 * Véronis 2002; Hunt/BYU 2022) consistently place the boundary between natural
 * pauses and hesitation/dead-air pauses around 500ms:
 *  - pauses between sentences: mostly >500ms
 *  - pauses within/between clauses and phrases: mostly <500ms (~470-650ms avg)
 *  - the perceptual "minimal hesitation pause" threshold: ~505ms
 * Below this value speech starts to sound unnaturally rushed.
 */
export const SILENCE_TRIM_DEFAULT_MIN_SILENCE_MS = 500;

export const DEFAULT_SILENCE_TRIM: SilenceTrimSettings = {
  enabled: false,
  mode: "auto",
  thresholdDb: -40,
  minSilenceMs: SILENCE_TRIM_DEFAULT_MIN_SILENCE_MS,
};

export interface SilenceTrimNativeConfig {
  enabled: boolean;
  mode: "auto" | "manual";
  thresholdDb: number;
  minSilenceMs: number;
  /**
   * Always true: internal pauses are removed for audio files. Video files no
   * longer expose the trim option at all (internal cuts would require
   * re-encoding the video track to stay in sync), so this never runs for them.
   */
  removeInternalPauses: boolean;
}

export function trimToNativeConfig(settings: SilenceTrimSettings): SilenceTrimNativeConfig {
  return {
    enabled: settings.enabled,
    mode: settings.mode,
    thresholdDb: settings.thresholdDb,
    minSilenceMs: settings.minSilenceMs,
    removeInternalPauses: true,
  };
}
