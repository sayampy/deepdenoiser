// Reexport the native module. On web, it will be resolved to AudioProcessorModule.web.ts
// and on native platforms to AudioProcessorModule.ts
// export { default } from "./src/AudioProcessorModule";
import AudioProcessorModule from "./src/AudioProcessorModule";
export * from "./src/AudioProcessorModule.types";

export async function extractAndTranscodeAudio(
  inputUri: string,
  outputUri: string,
  bitrate?: number,
): Promise<string> {
  return await AudioProcessorModule.extractAndTranscodeAudio(
    inputUri,
    outputUri,
    bitrate,
  );
}

export async function decodeToPCM(
  inputUri: string,
  outputUri: string,
): Promise<string> {
  return await AudioProcessorModule.decodeToPCM(inputUri, outputUri);
}

export async function pcmToWav(
  pcmUri: string,
  wavUri: string,
  sampleRate: number = 48000,
  channels: number = 1,
  bitDepth: number = 16,
): Promise<string> {
  return await AudioProcessorModule.pcmToWav(
    pcmUri,
    wavUri,
    sampleRate,
    channels,
    bitDepth,
  );
}
