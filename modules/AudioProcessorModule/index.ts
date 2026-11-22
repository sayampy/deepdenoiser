// Reexport the native module. On web, it will be resolved to AudioProcessorModule.web.ts
// and on native platforms to AudioProcessorModule.ts
// export { default } from "./src/AudioProcessorModule";
import AudioProcessorModule from "./src/AudioProcessorModule";
import type { PcmToWavResult, SilenceTrimNativeConfig, VideoTrimConfig } from "./src/AudioProcessorModule.types";
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

export async function mixAudioVideo(
  videoUri: string,
  audioUri: string,
  outputUri: string,
  trim?: VideoTrimConfig,
): Promise<string> {
  return await AudioProcessorModule.mixAudioVideo(
    videoUri,
    audioUri,
    outputUri,
    trim ?? null,
  );
}

export async function decodeToPCM(
  inputUri: string,
  outputUri: string,
): Promise<{ path: string; sampleRate: number }> {
  return await AudioProcessorModule.decodeToPCM(inputUri, outputUri);
}

export async function extractWavAudio(
  inputUri: string,
  outputUri: string,
): Promise<{ path: string; sampleRate: number }> {
  return await AudioProcessorModule.extractWavAudio(inputUri, outputUri);
}

export async function pcmToWav(
  pcmUri: string,
  wavUri: string,
  sampleRate: number = 48000,
  channels: number = 1,
  bitDepth: number = 16,
  silenceTrim?: SilenceTrimNativeConfig | null,
): Promise<PcmToWavResult> {
  return await AudioProcessorModule.pcmToWav(
    pcmUri,
    wavUri,
    sampleRate,
    channels,
    bitDepth,
    silenceTrim ?? null,
  );
}

export async function copyFile(
  sourceUri: string,
  destUri: string,
): Promise<string> {
  return await AudioProcessorModule.copyFile(sourceUri, destUri);
}

export async function saveFileToTree(
  sourceUri: string,
  treeUri: string,
  directoryNames: string[],
  fileName: string,
  mimeType: string | null,
): Promise<string> {
  return await AudioProcessorModule.saveFileToTree(
    sourceUri,
    treeUri,
    directoryNames,
    fileName,
    mimeType,
  );
}

export async function getFileSize(path: string): Promise<number> {
  return await AudioProcessorModule.getFileSize(path);
}

export async function sha256File(path: string): Promise<string> {
  return await AudioProcessorModule.sha256File(path);
}

/** Keep the process alive (foreground service + wake lock) during long work. */
export async function startBackgroundProcessing(): Promise<void> {
  // Older dev-client builds may not expose these yet — never break denoising
  // just because the foreground-service module is unavailable.
  if (typeof AudioProcessorModule.startBackgroundProcessing !== "function") return;
  await AudioProcessorModule.startBackgroundProcessing();
}

export async function stopBackgroundProcessing(): Promise<void> {
  if (typeof AudioProcessorModule.stopBackgroundProcessing !== "function") return;
  await AudioProcessorModule.stopBackgroundProcessing();
}
