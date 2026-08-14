import type { StyleProp, ViewStyle } from 'react-native';

export type OnLoadEventPayload = {
  url: string;
};

export type AudioProcessorModuleEvents = {
  onChange: (params: ChangeEventPayload) => void;
};

export type ChangeEventPayload = {
  value: string;
};

export type AudioProcessorModuleViewProps = {
  url: string;
  onLoad: (event: { nativeEvent: OnLoadEventPayload }) => void;
  style?: StyleProp<ViewStyle>;
};

/** Trim config passed into native pcmToWav. */
export type SilenceTrimNativeConfig = {
  enabled: boolean;
  mode: "auto" | "manual";
  thresholdDb: number;
  minSilenceMs: number;
};

/**
 * Result of native pcmToWav. `trimStartUs`/`trimEndUs` are the trimmed window
 * in the ORIGINAL PCM timeline (microseconds); callers muxing a video track
 * use them to apply the same trim and keep audio/video in sync.
 */
export type PcmToWavResult = {
  path: string;
  trimStartUs: number;
  trimEndUs: number;
  trimmed: boolean;
};

/** Trim window for the video track inside native mixAudioVideo. */
export type VideoTrimConfig = {
  enabled: boolean;
  startUs: number;
  endUs: number;
};
