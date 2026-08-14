import {
  decodeToPCM,
  extractAndTranscodeAudio,
  extractWavAudio,
  mixAudioVideo,
  pcmToWav as nativePcmToWav
} from "@/modules/AudioProcessorModule";
import * as fs from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import { trackAppEvent } from "./analytics";
import type { SilenceTrimSettings } from "./silenceTrim";
import { trimToNativeConfig } from "./silenceTrim";

const ILLEGAL_FS_CHARS = /[^a-zA-Z0-9._-]/g;

/** Result of PCMtoWav: the wrapped WAV plus the silence-trim window. */
export interface WavResult {
  file: fs.File;
  /** Trimmed window start in the original PCM timeline (microseconds). */
  trimStartUs: number;
  /** Trimmed window end in the original PCM timeline (microseconds). */
  trimEndUs: number;
  /** True when leading/trailing silence was actually removed. */
  trimmed: boolean;
}

export async function toWav(file: fs.File): Promise<fs.File> {
  try {
    // We transcode to high-bitrate AAC first to handle resampling/downmixing via Litr
    // if the source is not already compatible.
    const transcodedAudio = new fs.File(fs.Paths.cache, `denoised_${Date.now()}.m4a`);
    await extractAndTranscodeAudio(
      file.uri,
      transcodedAudio.uri,
      256000, // High bitrate for quality
    );

    // Then decode to PCM
    const { file: pcmFile, sampleRate } = await decodeToPCMFile(transcodedAudio);

    // Then wrap in WAV
    const wavFile = await PCMtoWav(pcmFile, sampleRate);
    return wavFile.file;
  } catch (error) {
    console.error("Failed to convert to WAV.", error);
    // Re-throw the error to be handled by the caller
    throw new Error(
      `WAV conversion failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function decodeToPCMFile(
  file: fs.File,
  outputUri?: string,
): Promise<{ file: fs.File; sampleRate: number }> {
  try {
    const outputFile = outputUri
      ? new fs.File(outputUri)
      : new fs.File(fs.Paths.cache, `denoised_${Date.now()}.pcm`);
    const result = await decodeToPCM(
      file.uri,
      outputFile.uri,
    );
    return { file: outputFile, sampleRate: result.sampleRate };
  } catch (error) {
    // MediaExtractor can fail to parse WAV files on some devices.
    // Fall back to direct RIFF/WAVE parsing for .wav files.
    if (/\.wav(\?|#|$)/i.test(file.uri)) {
      try {
        console.warn("MediaExtractor failed on WAV, trying direct extraction:", file.uri);
        const outputFile = outputUri
          ? new fs.File(outputUri)
          : new fs.File(fs.Paths.cache, `denoised_${Date.now()}.pcm`);
        const result = await extractWavAudio(file.uri, outputFile.uri);
        return { file: outputFile, sampleRate: result.sampleRate };
      } catch (wavError) {
        throw new Error(
          `PCM decoding failed: ${wavError instanceof Error ? wavError.message : String(wavError)}`,
        );
      }
    }
    throw new Error(
      `PCM decoding failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function PCMtoWav(
  file: fs.File,
  sampleRate: number = 48000,
  silenceTrim?: SilenceTrimSettings,
): Promise<WavResult> {
  try {
    const outputFile = new fs.File(
      fs.Paths.cache,
      `denoised_${Date.now()}.wav`,
    );

    // Use native pcmToWav to avoid loading entire file into memory as base64.
    // Pass null (never undefined) when trim is disabled so the bridge reliably
    // maps it to a missing map on the native side.
    const result = await nativePcmToWav(
      file.uri,
      outputFile.uri,
      sampleRate,
      1, // channels (mono)
      16, // bitDepth (16-bit)
      silenceTrim && silenceTrim.enabled ? trimToNativeConfig(silenceTrim) : null,
    );

    return {
      file: outputFile,
      trimStartUs: result.trimStartUs,
      trimEndUs: result.trimEndUs,
      trimmed: result.trimmed,
    };
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

  // Write raw little-endian PCM bytes directly. The new expo-file-system
  // API writes Uint8Array without encoding, so we skip the base64 string
  // building that previously dominated the recording hot path.
  file.write(new Uint8Array(pcmChunk.buffer), { append });
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
export async function saveToDevice(file: fs.File, albumName = "DeepDenoiser"): Promise<boolean> {
  const { status } = await MediaLibrary.requestPermissionsAsync();
  if (status !== 'granted') return false;

  try {
    const album = await MediaLibrary.getAlbumAsync(albumName);
    if (album) {
      await MediaLibrary.createAssetAsync(file.uri, album.id);
    } else {
      // const asset = await MediaLibrary.createAssetAsync(file.uri);
      await MediaLibrary.createAlbumAsync(albumName, undefined, false, file.uri);
    }
    trackAppEvent("save_file");
    return true;
  } catch (e) {
    console.error("Failed to save file to device:", e);
    return false;
  }
}
export async function mergeAudioVideo(
  video: fs.File,
  audio: fs.File,
  trim?: { startUs: number; endUs: number; trimmed: boolean },
): Promise<fs.File> {
  try {
    // Transcode the denoised WAV to AAC first, as MediaMuxer (MP4) often doesn't support PCM.
    const transcodedAudio = new fs.File(fs.Paths.cache, `denoised_${Date.now()}.m4a`);
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
      trim && trim.trimmed
        ? { enabled: true, startUs: trim.startUs, endUs: trim.endUs }
        : undefined,
    );
    return outputFile;
  } catch (error) {
    console.error("Failed to merge audio and video.", error);
    throw new Error(
      `Merge failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
export function sanitizeFileName(name: string): string {
  return name
    .replaceAll(ILLEGAL_FS_CHARS, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .trim() || 'denoised';
}

export function renameFile(file: fs.File, newName: string): fs.File {
  const safeName = sanitizeFileName(newName);
  const checkPath = new fs.File(fs.Paths.cache, encodeURIComponent(safeName));
  if (checkPath.exists) checkPath.delete();
  file.rename(safeName);
  return file;
}
