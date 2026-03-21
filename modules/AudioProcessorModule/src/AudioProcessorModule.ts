import { NativeModule, requireNativeModule } from "expo";

import { AudioProcessorModuleEvents } from "./AudioProcessorModule.types";

declare class AudioProcessorModule extends NativeModule<AudioProcessorModuleEvents> {
  extractAndTranscodeAudio(
    inputUri: string,
    outputUri: string,
    bitrate?: number,
  ): Promise<string>;
  decodeToPCM(inputUri: string, outputUri: string): Promise<string>;
  pcmToWav(
    pcmUri: string,
    wavUri: string,
    sampleRate: number,
    channels: number,
    bitDepth: number,
  ): Promise<string>;
  mixAudioVideo(
    videoUri: string,
    audioUri: string,
    outputUri: string,
  ): Promise<string>;
}


// This call loads the native module object from the JSI.
export default requireNativeModule<AudioProcessorModule>(
  "AudioProcessorModule",
);
