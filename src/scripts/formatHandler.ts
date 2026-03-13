import * as fs from "expo-file-system";
import { extractAndTranscodeAudio } from "@/modules/AudioProcessorModule";

export async function toWav(file: fs.File): Promise<fs.File> {
  console.log("Converting to WAV:", file.uri);
  try {
    // The native module handles file creation and returns the new URI
    const outputUri = `${fs.Paths.cache}transcoded_output.wav`;
    console.log("Successfully converted to WAV at", outputUri);
    const result = await extractAndTranscodeAudio(file.uri, outputUri, 128000);
    const outputFile = new fs.File(outputUri);
    return outputFile;
  } catch (error) {
    console.error("Failed to convert to WAV.", error);
    // Re-throw the error to be handled by the caller
    throw new Error(
      `LiTr conversion failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
