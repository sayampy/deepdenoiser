/**
 * Media format support shared by the file picker, the share handler and the
 * processing screen.
 *
 * Decoding is done by Android's MediaCodec/MediaExtractor, so the usable
 * formats are the ones Android supports: AAC/MP3/FLAC/Opus/Vorbis/AMR/PCM for
 * audio and H.264/HEVC/MPEG-4/H.263/VP8/VP9/AV1/MPEG-2 for video. These are
 * usually delivered inside MP4/M4A/3GP/WebM/Matroska/MPEG-TS/WAV/Ogg files.
 *
 * Android's MIME reporting for containers such as MKV and TS is inconsistent
 * across vendors, so file type is decided from the extension when the MIME type
 * is missing or generic.
 */

const AUDIO_EXTENSIONS = new Set([
  "mp3", "m4a", "aac", "wav", "flac", "ogg", "oga", "opus",
  "amr", "awb", "mka", "3ga", "aif", "aiff",
]);

const VIDEO_EXTENSIONS = new Set([
  "mp4", "m4v", "mov", "3gp", "3g2", "webm", "mkv",
  "ts", "m2ts", "mpeg", "mpg", "avi",
]);

const MIME_BY_EXTENSION: Record<string, string> = {
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  wav: "audio/wav",
  flac: "audio/flac",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  opus: "audio/opus",
  amr: "audio/amr",
  awb: "audio/amr-wb",
  mka: "audio/x-matroska",
  "3ga": "audio/3gpp",
  aif: "audio/aiff",
  aiff: "audio/aiff",
  mp4: "video/mp4",
  m4v: "video/x-m4v",
  mov: "video/quicktime",
  "3gp": "video/3gpp",
  "3g2": "video/3gpp2",
  webm: "video/webm",
  mkv: "video/x-matroska",
  ts: "video/mp2t",
  m2ts: "video/mp2t",
  mpeg: "video/mpeg",
  mpg: "video/mpeg",
  avi: "video/x-msvideo",
};

/** Lower-case extension without the dot. */
export function extensionOf(name: string): string {
  return name.toLowerCase().split(".").pop()?.trim() ?? "";
}

/** True when Android's MediaExtractor can reasonably be expected to read it. */
export function isSupportedMediaFile(name: string): boolean {
  const ext = extensionOf(name);
  return AUDIO_EXTENSIONS.has(ext) || VIDEO_EXTENSIONS.has(ext);
}

/** Video when the OS says so, otherwise decide from the file extension. */
export function isVideoFile(name: string, mimeType?: string | null): boolean {
  if (mimeType?.startsWith("video/")) return true;
  if (mimeType?.startsWith("audio/")) return false;
  return VIDEO_EXTENSIONS.has(extensionOf(name));
}

/**
 * MIME type for saving/sharing, derived from the OS type when available and
 * from the extension otherwise.
 */
export function mimeForFile(file: { name: string; type?: string | null }): string | null {
  if (file.type && file.type.includes("/") && !file.type.startsWith("application/octet-stream")) {
    return file.type;
  }
  return MIME_BY_EXTENSION[extensionOf(file.name)] ?? null;
}
