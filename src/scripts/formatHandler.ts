import {
  decodeToPCM,
  extractAndTranscodeAudio,
  mixAudioVideo
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
    const pcmBase64 = await file.base64();
    const binaryString = atob(pcmBase64);
    const len = binaryString.length;

    // Create WAV Header (44 bytes)
    const buffer = new ArrayBuffer(44);
    const view = new DataView(buffer);
    const writeString = (view: DataView, offset: number, text: string) => {
      for (let i = 0; i < text.length; i++) {
        view.setUint8(offset + i, text.charCodeAt(i));
      }
    };

    writeString(view, 0, "RIFF");
    view.setUint32(4, 36 + len, true); // ChunkSize
    writeString(view, 8, "WAVE");
    writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true); // Subchunk1Size
    view.setUint16(20, 1, true); // AudioFormat
    view.setUint16(22, 1, true); // NumChannels
    view.setUint32(24, 48000, true); // SampleRate
    view.setUint32(28, 96000, true); // ByteRate
    view.setUint16(32, 2, true); // BlockAlign
    view.setUint16(34, 16, true); // BitsPerSample
    writeString(view, 36, "data");
    view.setUint32(40, len, true); // Subchunk2Size

    // Combine Header and PCM
    const wavData = new Uint8Array(44 + len);
    wavData.set(new Uint8Array(buffer), 0);
    for (let i = 0; i < len; i++) {
      wavData[44 + i] = binaryString.charCodeAt(i);
    }

    const outputFile = new fs.File(
      fs.Paths.cache,
      `Denoised_${file.modificationTime}.wav`,
    );
    await outputFile.write(wavData);


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
export async function saveToDevice(file: fs.File) {
  try {
    const asset = await MediaLibrary.createAssetAsync(file.uri);
    const album = await MediaLibrary.getAlbumAsync("AudioDenoiser");
    if (album) {
      await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
    } else {
      await MediaLibrary.createAlbumAsync("DeepDenoiser", asset, false);
    }
  } catch (e) {
    console.log(e);
  }
}
export async function mergeAudioVideo(
  video: fs.File,
  audio: fs.File,
): Promise<fs.File> {
  console.log("Merging audio and video...");
  try {
    // Transcode the denoised WAV to AAC first, as MediaMuxer (MP4) often doesn't support PCM.
    const transcodedAudio = new fs.File(fs.Paths.cache, `denoised_transcoded.m4a`);
    await extractAndTranscodeAudio(
      audio.uri.replace('file://', ''),
      transcodedAudio.uri.replace('file://', ''),
      128000, // 128kbps AAC
    );

    const outputFile = new fs.File(fs.Paths.cache, `denoised_${Date.now()}.mp4`);
    await mixAudioVideo(
      video.uri.replace('file://', ''),
      transcodedAudio.uri.replace('file://', ''),
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