/**
 * Export encoding for saved audio.
 *
 * The pipeline stores lossless 16-bit PCM wrapped in WAV. That is the right
 * intermediate (it is what the player previews and what the cache re-uses),
 * but it is a poor thing to keep on a phone: a 5 minute 48 kHz mono file is
 * ~28 MB. Saving therefore re-encodes to the format the user picked:
 *
 *  - `wav`  — the lossless PCM as produced by the native writer (16-bit mono),
 *  - `mp3`  — LAME (pure JS, LGPL-3.0) at a chosen bitrate, streamed frame by
 *             frame so a long recording never has to sit in memory as a whole.
 *
 * Encoding is cached per source file + format + bitrate, so pressing Save or
 * Save on a second destination does not repeat the work.
 */

import { File, Paths } from "expo-file-system";
import { extractAndTranscodeAudio } from "@/modules/AudioProcessorModule";
import type { AppSettings, AudioExportFormat } from "./settings";

export type ExportFormat = AudioExportFormat;

export interface ExportFormatOption {
  id: ExportFormat;
  name: string;
  description: string;
}

export const EXPORT_FORMATS: ExportFormatOption[] = [
  {
    id: "wav",
    name: "WAV",
    description: "Lossless uncompressed audio at model sample rate.",
  },
  {
    id: "mp3",
    name: "MP3",
    description: "Universal compressed format with customizable bitrate.",
  },
  {
    id: "m4a",
    name: "M4A (AAC)",
    description: "High-efficiency AAC compressed audio.",
  },
];

export const MP3_BITRATES = [96, 128, 192, 256, 320] as const;
export const DEFAULT_MP3_BITRATE = 128;

export const M4A_BITRATES = [96, 128, 192, 256] as const;
export const DEFAULT_M4A_BITRATE = 192;

export function isAudioExportFormat(value: unknown): value is ExportFormat {
  return value === "wav" || value === "mp3" || value === "m4a";
}

interface WavInfo {
  dataOffset: number;
  dataLength: number;
  channels: number;
  sampleRate: number;
  bitsPerSample: number;
}

/** Parse the RIFF header the native PCM→WAV writer produces. */
function parseWavHeader(file: File): WavInfo {
  const size = file.size ?? 0;
  if (size < 44) throw new Error("The audio file is too small to be a WAV file.");

  const handle = file.open();
  let head: Uint8Array;
  try {
    handle.offset = 0;
    head = handle.readBytesSync(Math.min(size, 4096));
  } finally {
    handle.close();
  }

  const view = new DataView(head.buffer, head.byteOffset, head.byteLength);
  const tag = (offset: number) =>
    String.fromCharCode(head[offset], head[offset + 1], head[offset + 2], head[offset + 3]);

  if (tag(0) !== "RIFF" || tag(8) !== "WAVE") {
    throw new Error("The file is not a WAV file.");
  }

  let channels = 1;
  let sampleRate = 48000;
  let bitsPerSample = 16;
  let offset = 12;
  while (offset + 8 <= head.byteLength) {
    const id = tag(offset);
    const chunkSize = view.getUint32(offset + 4, true);
    const body = offset + 8;
    if (id === "fmt ") {
      channels = view.getUint16(body + 2, true);
      sampleRate = view.getUint32(body + 4, true);
      bitsPerSample = view.getUint16(body + 14, true);
    } else if (id === "data") {
      const declared = chunkSize > 0 && body + chunkSize <= size ? chunkSize : size - body;
      if (bitsPerSample !== 16) {
        throw new Error("MP3 export only supports 16-bit WAV audio.");
      }
      return {
        dataOffset: body,
        dataLength: declared - (declared % (2 * channels)),
        channels,
        sampleRate,
        bitsPerSample,
      };
    }
    offset = body + chunkSize + (chunkSize % 2);
  }

  throw new Error("The WAV file has no audio data chunk.");
}

/** Read a block of interleaved little-endian 16-bit samples. */
function readSamples(file: File, offset: number, byteLength: number): Int16Array {
  const handle = file.open();
  try {
    handle.offset = offset;
    const bytes = handle.readBytesSync(byteLength);
    // Copy into a fresh buffer: the bytes we get back are not guaranteed to be
    // 2-byte aligned, and an unaligned Int16Array view reads garbage on V8.
    const aligned = bytes.slice().buffer;
    return new Int16Array(aligned, 0, Math.floor(bytes.byteLength / 2));
  } finally {
    handle.close();
  }
}

/**
 * Encode a WAV file to MP3, streaming one frame block at a time.
 *
 * `onProgress` receives 0..1. The encoder is pure JS, so this runs on the JS
 * thread; blocks are small enough (about a second) to keep the UI responsive.
 */
export async function encodeWavToMp3(
  source: File,
  target: File,
  bitrateKbps: number,
  onProgress?: (fraction: number) => void,
): Promise<File> {
  if (target.exists) target.delete();

  const info = parseWavHeader(source);
  const { Mp3Encoder } = await import("@breezystack/lamejs");
  const encoder = new Mp3Encoder(info.channels, info.sampleRate, bitrateKbps);

  // 1152 samples is one MPEG-1 Layer III frame; feeding whole frames keeps the
  // encoder's internal padding minimal.
  const frameSamples = 1152;
  const stepBytes = frameSamples * info.channels * 2;
  const totalBytes = info.dataLength;

  // Frames are small (a couple of KiB each), so they are batched before being
  // written: 2600 appends per minute of audio would otherwise cross the bridge
  // thousands of times.
  const FLUSH_BYTES = 64 * 1024;
  const pending: Uint8Array[] = [];
  let pendingBytes = 0;
  const flush = () => {
    if (pendingBytes === 0) return;
    const merged = new Uint8Array(pendingBytes);
    let offset = 0;
    for (const piece of pending) {
      merged.set(piece, offset);
      offset += piece.length;
    }
    pending.length = 0;
    pendingBytes = 0;
    target.writeSync(merged, { append: true });
  };
  const append = (encoded: Int8Array | Uint8Array) => {
    if (encoded.length === 0) return;
    const bytes = new Uint8Array(
      encoded.buffer,
      encoded.byteOffset,
      encoded.byteLength,
    );
    pending.push(bytes);
    pendingBytes += bytes.length;
    if (pendingBytes >= FLUSH_BYTES) flush();
  };

  for (let read = 0; read < totalBytes; read += stepBytes) {
    const length = Math.min(stepBytes, totalBytes - read);
    const samples = readSamples(source, info.dataOffset + read, length);

    if (info.channels === 1) {
      append(encoder.encodeBuffer(samples));
    } else {
      const frames = Math.floor(samples.length / 2);
      const left = new Int16Array(frames);
      const right = new Int16Array(frames);
      for (let i = 0; i < frames; i++) {
        left[i] = samples[i * 2];
        right[i] = samples[i * 2 + 1];
      }
      append(encoder.encodeBuffer(left, right));
    }

    onProgress?.(Math.min(1, (read + length) / totalBytes));
    // Yield so the UI can paint between blocks.
    if (read % (stepBytes * 40) === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  append(encoder.flush());
  flush();
  onProgress?.(1);

  if (!target.exists || (target.size ?? 0) === 0) {
    target.delete();
    throw new Error("MP3 encoding produced an empty file.");
  }
  return target;
}

function exportCacheName(source: File, format: ExportFormat, bitrate: number): string {
  const base = source.name.replace(/\.[^.]+$/, "");
  const stem = base.replace(/[^A-Za-z0-9_-]+/g, "_").slice(0, 60) || "audio";
  const stamp = `${source.size ?? 0}-${Math.round(source.modificationTime ?? 0)}`;
  return `export_${stem}_${stamp}_${bitrate}k.${format}`;
}

/**
 * Resolve the file that should actually be saved for this source file.
 *
 * WAV passes straight through; MP3 and M4A are encoded into cache and reused.
 * Non-audio files (the muxed MP4s) are handled separately.
 */
export async function prepareExport(
  source: File,
  settings: Pick<AppSettings, "exportFormat" | "mp3Bitrate" | "m4aBitrate">,
  onProgress?: (fraction: number) => void,
): Promise<File> {
  const format: ExportFormat = settings.exportFormat || "wav";
  if (format === "wav") return source;
  if (!source.name.toLowerCase().endsWith(".wav")) return source;

  if (format === "m4a") {
    const bitrate = settings.m4aBitrate || DEFAULT_M4A_BITRATE;
    const cached = new File(Paths.cache, exportCacheName(source, "m4a", bitrate));
    if (cached.exists && (cached.size ?? 0) > 0) {
      onProgress?.(1);
      return cached;
    }
    onProgress?.(0.2);
    await extractAndTranscodeAudio(source.uri, cached.uri, bitrate * 1000);
    onProgress?.(1);
    return cached;
  }

  const bitrate = MP3_BITRATES.includes(settings.mp3Bitrate as (typeof MP3_BITRATES)[number])
    ? settings.mp3Bitrate
    : DEFAULT_MP3_BITRATE;

  const cached = new File(Paths.cache, exportCacheName(source, "mp3", bitrate));
  if (cached.exists && (cached.size ?? 0) > 0) {
    onProgress?.(1);
    return cached;
  }
  return encodeWavToMp3(source, cached, bitrate, onProgress);
}

export { mimeForFile } from "./mediaFormats";

/** RFC-2396-safe base name, so File() never throws on '#' or '%' in a title. */
function safeStem(name: string): string {
  const base = name.replace(/\.[^.]+$/, "");
  return (
    base
      .replace(/[^A-Za-z0-9 ._-]+/g, "_")
      .replace(/\s+/g, " ")
      .replace(/_+/g, "_")
      .replace(/^[\s._-]+|[\s._-]+$/g, "")
      .slice(0, 80) || "audio"
  );
}

/** File name to use when saving `source` in `format` (keeps the user's title). */
export function exportFileNameFor(source: File, format: ExportFormat): string {
  return `${safeStem(source.name)}.${format}`;
}
