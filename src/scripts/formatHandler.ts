import {
  decodeToPCM,
  extractAndTranscodeAudio,
  pcmToWav,
} from "@/modules/AudioProcessorModule";
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
      48000,
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
  console.log("Converting to PCM:", file.uri);
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
    const outputFile = new fs.File(
      fs.Paths.cache,
      `Denoised_${file.modificationTime}.wav`,
    );
    const outputUri = outputFile.uri;
    // console.log("Successfully converted to WAV at", outputUri)
    await pcmToWav(
      file.uri.replace("file://", ""),
      outputUri.replace("file://", ""),
      48000,
      1,
      16,
    );
    try {
      const asset = await MediaLibrary.createAssetAsync(outputUri);
      const album = await MediaLibrary.getAlbumAsync("AudioDenoiser");
      if (album) {
        await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
      } else {
        await MediaLibrary.createAlbumAsync("AudioDenoiser", asset, false);
      }
    } catch (e) {
      console.log(e);
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
export async function PCMtoArray(file: fs.File): Promise<Float32Array> {
  const pcmDataB64 = await file.base64();
  const binaryString = atob(pcmDataB64);
  const len = binaryString.length;

  // Verify if the output is valid 16-bit PCM (must be even number of bytes)
  if (len % 2 !== 0) {
    throw new Error(`Invalid PCM data: Byte length (${len}) is not divisible by 2.`);
  }

  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const pcmArray = new Int16Array(bytes.buffer);
  const float32Array = new Float32Array(pcmArray.length);
  for (let i = 0; i < pcmArray.length; i++) {
    float32Array[i] = pcmArray[i] / 32768.0;
  }
  return float32Array;
}
export async function ArraytoPCM(f32array: Float32Array): Promise<fs.File> {
  const int16Array = new Int16Array(f32array.length);
  for (let i = 0; i < f32array.length; i++) {
    // Scale Float32 (-1.0 to 1.0) to Int16 range and clamp
    let val = f32array[i] * 32768.0;
    if (val > 32767) val = 32767;
    else if (val < -32768) val = -32768;
    int16Array[i] = val;
  }

  const bytes = new Uint8Array(int16Array.buffer);
  const outputFile = new fs.File(fs.Paths.cache, `processed_${Date.now()}.pcm`);
  await outputFile.write(bytes);
  // let binaryString = "";
  // // Process in chunks to avoid stack overflow with String.fromCharCode
  // for (let i = 0; i < bytes.length; i += 8192) {
  //   binaryString += String.fromCharCode(...bytes.subarray(i, i + 8192));
  // }
  // // const base64 = btoa(String.fromCharCode(...bytes));
  // const base64 = btoa(binaryString);
  // await outputFile.write(base64, { encoding: fs.EncodingType.BASE64 });

  return outputFile;
}