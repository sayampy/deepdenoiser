import {
  decodeToPCM,
  extractAndTranscodeAudio,
  mixAudioVideo,
  pcmToWav as nativePcmToWav
} from "@/modules/AudioProcessorModule";
import * as fs from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import { trackAppEvent } from "./analytics";

export async function toWav(file: fs.File): Promise<fs.File> {
  try {
    // We transcode to high-bitrate AAC first to handle resampling/downmixing via Litr
    // if the source is not already compatible.
    const transcodedAudio = new fs.File(fs.Paths.cache, `transcoded_${Date.now()}.m4a`);
    await extractAndTranscodeAudio(
      file.uri,
      transcodedAudio.uri,
      256000, // High bitrate for quality
    );

    // Then decode to PCM
    const { file: pcmFile, sampleRate } = await decodeToPCMFile(transcodedAudio);

    // Then wrap in WAV
    const wavFile = await PCMtoWav(pcmFile, sampleRate);
    return wavFile;
  } catch (error) {
    console.error("Failed to convert to WAV.", error);
    // Re-throw the error to be handled by the caller
    throw new Error(
      `WAV conversion failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function decodeToPCMFile(file: fs.File): Promise<{ file: fs.File; sampleRate: number }> {
  try {
    const outputFile = new fs.File(fs.Paths.cache, `decoded_${Date.now()}.pcm`);
    const result = await decodeToPCM(
      file.uri,
      outputFile.uri,
    );
    return { file: outputFile, sampleRate: result.sampleRate };
  } catch (error) {
    console.error("Failed to decode to PCM.", error);
    throw new Error(
      `PCM decoding failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function PCMtoWav(file: fs.File, sampleRate: number = 48000): Promise<fs.File> {
  try {
    const outputFile = new fs.File(
      fs.Paths.cache,
      `Denoised_${Date.now()}.wav`,
    );

    // Use native pcmToWav to avoid loading entire file into memory as base64
    await nativePcmToWav(
      file.uri,
      outputFile.uri,
      sampleRate,
      1, // channels (mono)
      16 // bitDepth (16-bit)
    );

    return outputFile;
  } catch (error) {
    console.error("Failed to wrap PCM in WAV.", error);
    throw new Error(
      `WAV wrapping failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Resamples an Int16Array or Float32Array from inputRate to outputRate using linear interpolation.
 */
export function resample(
  input: Int16Array | Float32Array,
  inputRate: number,
  outputRate: number
): Float32Array {
  if (inputRate === outputRate) {
    if (input instanceof Float32Array) return input;
    const output = new Float32Array(input.length);
    for (let i = 0; i < input.length; i++) output[i] = input[i] / 32768.0;
    return output;
  }

  const ratio = inputRate / outputRate;
  const outputLength = Math.round(input.length / ratio);
  const output = new Float32Array(outputLength);

  const isInt16 = input instanceof Int16Array;

  for (let i = 0; i < outputLength; i++) {
    const pos = i * ratio;
    const index = Math.floor(pos);
    const fraction = pos - index;

    let s1, s2;
    if (isInt16) {
      s1 = input[index] / 32768.0;
      s2 = index + 1 < input.length ? input[index + 1] / 32768.0 : s1;
    } else {
      s1 = input[index];
      s2 = index + 1 < input.length ? input[index + 1] : s1;
    }

    output[i] = s1 * (1 - fraction) + s2 * fraction;
  }

  return output;
}

export async function PCMtoArray(
  file: fs.File,
  inputRate?: number,
  targetRate?: number
): Promise<Float32Array> {
  if (!file.exists) throw new Error("File does not exist");

  const fileSize = file.size;
  if (fileSize % 2 !== 0) {
    throw new Error(`Invalid PCM data: Byte length (${fileSize}) is not divisible by 2.`);
  }

  const numSamples = fileSize / 2;
  const pcmArray = new Int16Array(numSamples);

  const handle = file.open();
  try {
    const chunkSize = 256 * 1024; // 256KB chunks
    for (let offset = 0; offset < fileSize; offset += chunkSize) {
      const length = Math.min(chunkSize, fileSize - offset);
      handle.offset = offset;
      const bytes = handle.readBytes(length);
      const chunk = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2);
      pcmArray.set(chunk, offset / 2);
    }
  } finally {
    handle.close();
  }

  if (inputRate && targetRate && inputRate !== targetRate) {
    return resample(pcmArray, inputRate, targetRate);
  }

  // Convert to Float32Array
  const float32Array = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    float32Array[i] = pcmArray[i] / 32768.0;
  }
  return float32Array;
}

export async function readPCMChunks(
  file: fs.File,
  chunkSize: number, // in samples
  onChunk: (chunk: Float32Array, inputSamples: number) => Promise<void>,
  inputRate?: number,
  targetRate?: number
): Promise<void> {
  if (!file.exists) throw new Error("File does not exist");

  const fileSize = file.size;
  const handle = file.open();
  try {
    const bytesPerChunk = chunkSize * 2;
    for (let offset = 0; offset < fileSize; offset += bytesPerChunk) {
      const length = Math.min(bytesPerChunk, fileSize - offset);
      const inputSamples = length / 2;
      handle.offset = offset;
      const bytes = handle.readBytes(length);
      const pcmChunk = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2);

      let floatChunk: Float32Array;
      if (inputRate && targetRate && inputRate !== targetRate) {
        floatChunk = resample(pcmChunk, inputRate, targetRate);
      } else {
        floatChunk = new Float32Array(pcmChunk.length);
        for (let i = 0; i < pcmChunk.length; i++) {
          floatChunk[i] = pcmChunk[i] / 32768.0;
        }
      }

      await onChunk(floatChunk, inputSamples);
    }
  } finally {
    handle.close();
  }
}

export async function writePCMChunk(
  file: fs.File,
  chunk: Float32Array,
  append: boolean
): Promise<void> {
  const pcmChunk = new Int16Array(chunk.length);
  for (let j = 0; j < pcmChunk.length; j++) {
    let val = chunk[j] * 32768.0;
    if (val > 32767) val = 32767;
    else if (val < -32768) val = -32768;
    pcmChunk[j] = val;
  }

  const bytes = new Uint8Array(pcmChunk.buffer);
  let binaryString = "";
  const step = 8192;
  for (let k = 0; k < bytes.length; k += step) {
    const end = Math.min(k + step, bytes.length);
    for (let i = k; i < end; i++) binaryString += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binaryString);

  await file.write(base64, {
    encoding: "base64",
    append: append,
  });
}

export async function ArraytoPCM(f32array: Float32Array): Promise<fs.File> {
  const outputFile = new fs.File(fs.Paths.cache, `processed_${Date.now()}.pcm`);

  // Process and write in chunks to avoid large intermediate buffers
  const chunkSize = 65536; // 64K samples = 128KB
  for (let i = 0; i < f32array.length; i += chunkSize) {
    const end = Math.min(i + chunkSize, f32array.length);
    const pcmChunk = new Int16Array(end - i);

    for (let j = 0; j < pcmChunk.length; j++) {
      let val = f32array[i + j] * 32768.0;
      if (val > 32767) val = 32767;
      else if (val < -32768) val = -32768;
      pcmChunk[j] = val;
    }

    const bytes = new Uint8Array(pcmChunk.buffer);
    let binaryString = "";
    const step = 8192;
    for (let k = 0; k < bytes.length; k += step) {
      const end = Math.min(k + step, bytes.length);
      for (let i = k; i < end; i++) binaryString += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binaryString);

    await outputFile.write(base64, {
      encoding: "base64",
      append: i > 0,
    });
  }

  return outputFile;
}
export async function saveToDevice(file: fs.File) {
  try {
    const asset = await MediaLibrary.createAssetAsync(file.uri);
    const album = await MediaLibrary.getAlbumAsync("DeepDenoiser");
    if (album) {
      await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
    } else {
      await MediaLibrary.createAlbumAsync("DeepDenoiser", asset, false);
    }
    trackAppEvent("save_file");
  } catch (e) {
    console.error("Failed to save file to device:", e);
  }
}
export async function mergeAudioVideo(
  video: fs.File,
  audio: fs.File,
): Promise<fs.File> {
  try {
    // Transcode the denoised WAV to AAC first, as MediaMuxer (MP4) often doesn't support PCM.
    const transcodedAudio = new fs.File(fs.Paths.cache, `denoised_transcoded.m4a`);
    await extractAndTranscodeAudio(
      audio.uri,
      transcodedAudio.uri.replace('file://', ''),
      128000, // 128kbps AAC
    );

    const outputFile = new fs.File(fs.Paths.cache, `denoised_${Date.now()}.mp4`);
    await mixAudioVideo(
      video.uri,
      transcodedAudio.uri,
      outputFile.uri.replace('file://', ''),
    );
    return outputFile;
  } catch (error) {
    console.error("Failed to merge audio and video.", error);
    throw new Error(
      `Merge failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
export function renameFile(file: fs.File, newName: string): fs.File {
    const check_file = new fs.File(fs.Paths.cache, encodeURIComponent(newName));
    if (check_file.exists) {
      check_file.delete();
    }
    file.rename(newName);
    return file;
}
