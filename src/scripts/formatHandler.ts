import { decodeToPCM, extractAndTranscodeAudio, pcmToWav } from "@/modules/AudioProcessorModule";
import * as fs from "expo-file-system";
import * as MediaLibrary from "expo-media-library";

export async function toWav(file: fs.File): Promise<fs.File> {
  console.log("Converting to WAV:", file.uri);
  try {
    // The native module handles file creation and returns the new URI
    const outputFile = new fs.File(fs.Paths.cache, "transcoded_output.wav");
    const outputUri = outputFile.uri;
    console.log("Successfully converted to WAV at", outputUri);
    await extractAndTranscodeAudio(
      file.uri.replace("file://", ""),
      outputUri.replace("file://", ""),
      128000,
    );
    return outputFile;
  } catch (error) {
    console.error("Failed to convert to WAV.", error);
    // Re-throw the error to be handled by the caller
    throw new Error(
      `WAV conversion failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}


export async function WavtoPCM(file: fs.File): Promise<fs.File> {
  console.log("Converting to WAV:", file.uri);
  try {
    // The native module handles file creation and returns the new URI
    const outputFile = new fs.File(fs.Paths.cache, "decoded_output.PCM");
    const outputUri = outputFile.uri;
    // console.log("Successfully converted to WAV at", outputUri)
    await decodeToPCM(
      file.uri.replace("file://", ""),
      outputUri.replace("file://", ""),
    );
    return outputFile;
  } catch (error) {
    console.error("Failed to convert to PCM.", error);
    // Re-throw the error to be handled by the caller
    throw new Error(
      `PCM conversion failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function PCMtoWav(file: fs.File): Promise<fs.File> {
  console.log("Converting to WAV:", file.uri);
  try {
    // The native module handles file creation and returns the new URI
    const outputFile = new fs.File(fs.Paths.cache, `Denoised_${file.modificationTime}.wav`);
    const outputUri = outputFile.uri;
    // console.log("Successfully converted to WAV at", outputUri)
    await pcmToWav(
      file.uri.replace("file://", ""),
      outputUri.replace("file://", ""),
      48000,
      1,
      16,
    );
    const asset = await MediaLibrary.createAssetAsync(outputUri);
    const album = await MediaLibrary.getAlbumAsync("AudioDenoiser");
    if (album) {
      await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
    } else {
      await MediaLibrary.createAlbumAsync("AudioDenoiser", asset, false);
    }
    return outputFile;
  } catch (error) {
    console.error("Failed to convert to WAV.", error);
    // Re-throw the error to be handled by the caller
    throw new Error(
      `WAV conversion failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}