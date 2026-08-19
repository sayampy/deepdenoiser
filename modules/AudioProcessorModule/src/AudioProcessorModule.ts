import { NativeModule, requireNativeModule } from "expo";

import {
  AudioProcessorModuleEvents,
  PcmToWavResult,
  SilenceTrimNativeConfig,
  VideoTrimConfig,
} from "./AudioProcessorModule.types";

declare class AudioProcessorModule extends NativeModule<AudioProcessorModuleEvents> {
  extractAndTranscodeAudio(
    inputUri: string,
    outputUri: string,
    bitrate?: number,
  ): Promise<string>;
  decodeToPCM(
    inputUri: string,
    outputUri: string,
  ): Promise<{ path: string; sampleRate: number }>;
  pcmToWav(
    pcmUri: string,
    wavUri: string,
    sampleRate: number,
    channels: number,
    bitDepth: number,
    silenceTrim?: SilenceTrimNativeConfig | null,
  ): Promise<PcmToWavResult>;
  extractWavAudio(
    inputUri: string,
    outputUri: string,
  ): Promise<{ path: string; sampleRate: number }>;
  mixAudioVideo(
    videoUri: string,
    audioUri: string,
    outputUri: string,
    trim?: VideoTrimConfig | null,
  ): Promise<string>;
  copyFile(sourceUri: string, destUri: string): Promise<string>;
  getFileSize(path: string): Promise<number>;
}


// This call loads the native module object from the JSI.
export default requireNativeModule<AudioProcessorModule>(
  "AudioProcessorModule",
);
