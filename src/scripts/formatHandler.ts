import * as fs from "expo-file-system";
import { extractAndTranscodeAudio } from "@/modules/AudioProcessorModule";

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
      `LiTr conversion failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
