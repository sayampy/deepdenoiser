import metadata from "@/assets/model/model_metadata.json";
import { copyFile, getFileSize } from "@/modules/AudioProcessorModule";
import * as fs from "expo-file-system";
import { sanitizeFileName } from "./formatHandler";

/**
 * Persistent working storage for imported/shared files and denoised results.
 *
 * We deliberately do NOT store these in the OS cache directory:
 *  - The system can evict cache files at any time (the DocumentPicker ENOENT
 *    crashes were caused by cache files disappearing mid-processing).
 *  - Denoised outputs are keyed by input so identical re-runs (e.g. "Try Again")
 *    can be served instantly instead of re-running the whole pipeline.
 */

const IMPORTS_DIR_NAME = "imports";
const OUTPUTS_DIR_NAME = "denoised";
const INDEX_FILE_NAME = "denoiser_cache.json";

/** Keep at most this many cached results; oldest are pruned first. */
const MAX_CACHED_OUTPUTS = 30;

interface CacheEntry {
  path: string;
  createdAt: number;
}

type CacheIndex = Record<string, CacheEntry>;

// ---------------------------------------------------------------------------
// Directories
// ---------------------------------------------------------------------------

function importsDir(): fs.Directory {
  const dir = new fs.Directory(fs.Paths.document, IMPORTS_DIR_NAME);
  if (!dir.exists) dir.create({ idempotent: true, intermediates: true });
  return dir;
}

/**
 * Durable storage for cached pipeline intermediates (decoded + denoised PCM).
 *
 * Kept out of Paths.cache on purpose: cache entries must never outlive their
 * bytes, so anything registered in an index lives here instead.
 */
function intermediatesDir(): fs.Directory {
  const dir = new fs.Directory(fs.Paths.document, "intermediates");
  if (!dir.exists) dir.create({ idempotent: true, intermediates: true });
  return dir;
}

export function outputDir(): fs.Directory {
  const dir = new fs.Directory(fs.Paths.document, OUTPUTS_DIR_NAME);
  if (!dir.exists) dir.create({ idempotent: true, intermediates: true });
  return dir;
}

/**
 * Copies a picked/shared file (file:// or content://) into app documents so
 * it survives process death, cache eviction and source-app revocation.
 * Returns the stable file:// File ready for processing.
 *
 * The import keeps the SOURCE file name (no timestamp prefix) and is reused
 * when the same file is picked again (same name + same size). A stable name
 * and unchanged mtime make buildCacheKey() produce the same key, so
 * re-denosing an unchanged file serves the cached result instantly instead of
 * starting from blank. A re-pick of a different file with the same name but a
 * different size overwrites the import (and therefore misses the cache).
 */
/**
 * Normalise a file:// URI so that it always uses the triple-slash form
 * (`file:///path`).  Java's `File.toURI().toString()` emits `file:/path`
 * (one slash, authority null) which expo-file-system and some Android
 * code-paths interpret as a literal path `file:/…` instead of stripping
 * the scheme.
 */
function normalizeFileUri(uri: string): string {
  if (uri.startsWith("file:/") && !uri.startsWith("file:///")) {
    return "file:///" + uri.slice("file:/".length);
  }
  return uri;
}

export async function importToDocuments(
  sourceUri: string,
  name: string,
  fallbackUri?: string,
): Promise<fs.File> {
  const safe = sanitizeFileName(name || "import");
  const destName = name && name.trim().length > 0 ? safe : `import_${Date.now()}`;
  const dest = new fs.File(importsDir(), destName);

  const normalizedSource = normalizeFileUri(sourceUri);

  if (dest.exists) {
    try {
      const sourceSize = await getFileSize(normalizedSource);
      if (sourceSize >= 0 && dest.size === sourceSize) {
        // Same file re-imported — reuse the existing copy so its mtime (and
        // therefore the denoise cache key) stays stable.
        return dest;
      }
    } catch {
      // Cannot read the source size — fall through and re-copy.
    }
    try {
      dest.delete();
    } catch {
      // Ignore; copyFile overwrites the existing file in place anyway.
    }
  }

  try {
    await copyFile(normalizedSource, dest.uri);
    return dest;
  } catch (primaryErr) {
    // The primary file:// URI may point to a cache copy that was silently
    // dropped by expo-sharing.  If a content:// fallback was provided, try
    // reading directly from it before giving up.
    if (fallbackUri) {
      try {
        await copyFile(fallbackUri, dest.uri);
        return dest;
      } catch (fallbackErr) {
        console.warn("Fallback content:// copy also failed:", fallbackErr);
      }
    }
    throw primaryErr;
  }
}

/**
 * Moves a finished output file into the persistent outputs directory.
 * Returns the relocated File.
 */
/**
 * Move a finished output into durable storage under a stable name.
 *
 * The destination may already exist (re-running the same file with different
 * settings targets the same name). `move` with overwrite replaces it in one
 * step, so a crash between delete and write can no longer leave the output
 * directory holding a half-state, and any cache index still pointing at the old
 * path is invalidated by storeCachedOutput afterwards.
 */
export async function placeOutput(source: fs.File, name: string): Promise<fs.File> {
  if (!source.exists) {
    throw new Error(`Finished output is missing (${source.name}); the denoise step failed.`);
  }
  const dest = new fs.File(outputDir(), sanitizeFileName(name));
  await source.move(dest, { overwrite: true });
  if (!dest.exists) {
    throw new Error(`Could not store the output file (${dest.name}).`);
  }
  return dest;
}

// ---------------------------------------------------------------------------
// Generic JSON index helpers (shared by the final-output cache and the
// layered pipeline caches below).
// ---------------------------------------------------------------------------

async function readJsonIndex<T>(fileName: string): Promise<Record<string, T>> {
  try {
    const file = new fs.File(fs.Paths.document, fileName);
    if (!file.exists) return {};
    const raw = await file.text();
    if (!raw.trim()) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch (error) {
    console.error(`Failed to read ${fileName}:`, error);
    return {};
  }
}

async function writeJsonIndex<T>(fileName: string, index: Record<string, T>): Promise<void> {
  try {
    new fs.File(fs.Paths.document, fileName).writeSync(JSON.stringify(index), {
      encoding: "utf8",
    });
  } catch (error) {
    console.error(`Failed to write ${fileName}:`, error);
  }
}

function pruneOldest<T extends { createdAt: number; path?: string }>(
  index: Record<string, T>,
  maxEntries: number,
): void {
  const keys = Object.keys(index);
  if (keys.length <= maxEntries) return;
  const oldest = keys
    .sort((a, b) => (index[a].createdAt || 0) - (index[b].createdAt || 0))
    .slice(0, keys.length - maxEntries);
  for (const key of oldest) {
    const path = index[key]?.path;
    if (path) {
      try {
        new fs.File(path).delete();
      } catch (error) {
        console.warn("Failed to delete pruned cache file:", error);
      }
    }
    delete index[key];
  }
}

// ---------------------------------------------------------------------------
// Denoise result cache (final outputs)
// ---------------------------------------------------------------------------

async function readIndex(): Promise<CacheIndex> {
  return readJsonIndex<CacheEntry>(INDEX_FILE_NAME);
}

async function writeIndex(index: CacheIndex): Promise<void> {
  await writeJsonIndex<CacheEntry>(INDEX_FILE_NAME, index);
}

/**
 * Cache key for a denoise run. Identical inputs + settings always produce the
 * same key, so "Try Again" with unchanged settings hits the cache.
 */
export function buildCacheKey(
  input: fs.File,
  settings: {
    strength: number;
    modelId: string;
    normalize: { toggle: boolean; targetRMS: number; maxPeakDb: number };
    silenceTrim: {
      enabled: boolean;
      mode: string;
      thresholdDb: number;
      minSilenceMs: number;
    };
  },
): string {
  const modelSignature = `${metadata.hop_size}-${metadata.fft_size}`;
  return [
    // v2: invalidates final outputs produced before the streaming frame-offset
    // fix (those files were silent/corrupt).
    "v2",
    modelSignature,
    input.name,
    input.size,
    input.modificationTime,
    settings.modelId,
    settings.strength,
    settings.normalize.toggle,
    settings.normalize.targetRMS,
    settings.normalize.maxPeakDb,
    settings.silenceTrim.enabled,
    settings.silenceTrim.mode,
    settings.silenceTrim.thresholdDb,
    settings.silenceTrim.minSilenceMs,
  ].join("|");
}

/** Returns the cached output for `key`, or null on miss / missing file. */
export async function lookupCachedOutput(key: string): Promise<fs.File | null> {
  const index = await readIndex();
  const entry = index[key];
  if (!entry) return null;
  const file = new fs.File(entry.path);
  if (!file.exists) {
    delete index[key];
    await writeIndex(index);
    return null;
  }
  return file;
}

/** Stores a finished output under `key`, pruning the oldest entries. */
export async function storeCachedOutput(key: string, file: fs.File): Promise<void> {
  const index = await readIndex();

  // Invalidate stale entries that point to the same physical file.
  // placeOutput() uses a deterministic filename per input, so different
  // settings produce different keys but overwrite the same path — the old
  // entry would otherwise return the wrong (previously-trimmed) content.
  for (const [otherKey, entry] of Object.entries(index)) {
    if (otherKey !== key && entry.path === file.uri) {
      delete index[otherKey];
    }
  }

  index[key] = { path: file.uri, createdAt: Date.now() };
  pruneOldest(index, MAX_CACHED_OUTPUTS);
  await writeIndex(index);
}

// ---------------------------------------------------------------------------
// Layered pipeline cache (decode + denoise intermediates)
// ---------------------------------------------------------------------------
//
// Re-denoising the SAME file with DIFFERENT settings re-runs expensive steps
// (audio extraction, PCM decode, ONNX inference) that produce identical
// intermediates. Two extra cache layers reuse them:
//
//  - decode layer:  input identity (name+size+mtime) -> decoded PCM at the
//                   SOURCE sample rate. Skipping it saves the MediaExtractor
//                   + MediaCodec decode on every re-run.
//  - denoise layer: decode identity + model id + strength + normalize -> denoised PCM
//                   at 48 kHz. Skipping it saves the entire ONNX pass; only
//                   the cheap native WAV wrap + silence trim is re-applied, so
//                   toggling trim on/off (or changing its settings) no longer
//                   re-runs the model — "trim off" simply re-wraps the
//                   previously denoised audio at full length.
//
// Files live in the OS cache under names that cleanupTempCache() deliberately
// does NOT match, and are deleted by pruning or OS eviction. A missing file
// just falls back to re-running that step (the lookup validates existence).

const DECODE_INDEX_NAME = "decode_cache.json";
const DENOISE_INDEX_NAME = "denoise_cache.json";
const MAX_CACHED_DECODES = 5;
const MAX_CACHED_DENOISES = 8;

interface DecodeEntry {
  path: string;
  sampleRate: number;
  createdAt: number;
}

interface DenoiseEntry {
  path: string;
  createdAt: number;
}

/** Unique identity of an input file (stable across identical re-imports). */
export function buildInputIdentity(input: fs.File): string {
  return [input.name, input.size, input.modificationTime].join("|");
}

/** Key for the decode layer (input identity only — settings-agnostic). */
export function buildDecodeKey(input: fs.File): string {
  return ["dec-v1", buildInputIdentity(input)].join("|");
}

/** Key for the denoise layer (input identity + denoise settings). */
export function buildDenoiseKey(
  input: fs.File,
  settings: {
    strength: number;
    modelId: string;
    normalize: { toggle: boolean; targetRMS: number; maxPeakDb: number };
  },
): string {
  return [
    // v3: invalidates denoised PCM written before the streaming frame-offset
    // fix; v2 added the model id and strength to the key.
    "dn-v3",
    buildInputIdentity(input),
    settings.modelId,
    settings.strength,
    settings.normalize.toggle,
    settings.normalize.targetRMS,
    settings.normalize.maxPeakDb,
  ].join("|");
}

/** Stable-ish name for a staged intermediate PCM (never matches cleanupTempCache). */
export function stagePcmPath(prefix: "stage_dec" | "stage_dn"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.pcm`;
}

export async function lookupDecodedPCM(
  key: string,
): Promise<{ file: fs.File; sampleRate: number } | null> {
  const index = await readJsonIndex<DecodeEntry>(DECODE_INDEX_NAME);
  const entry = index[key];
  if (!entry) return null;
  const file = new fs.File(entry.path);
  if (!file.exists) {
    delete index[key];
    await writeJsonIndex(DECODE_INDEX_NAME, index);
    return null;
  }
  return { file, sampleRate: entry.sampleRate };
}

/**
 * Promote decoded PCM into durable storage (see storeDenoisedPCM for why the
 * OS cache directory is not safe to index).
 */
export async function storeDecodedPCM(
  key: string,
  file: fs.File,
  sampleRate: number,
): Promise<void> {
  const index = await readJsonIndex<DecodeEntry>(DECODE_INDEX_NAME);

  const target = new fs.File(intermediatesDir(), `${key.slice(0, 16)}_dec.pcm`);
  if (target.exists) target.delete();
  await file.copy(target, { overwrite: true });

  if (!target.exists || (target.size ?? 0) === 0) {
    throw new Error("Decoded PCM could not be stored durably");
  }

  index[key] = { path: target.uri, sampleRate, createdAt: Date.now() };
  pruneOldest(index, MAX_CACHED_DECODES);
  await writeJsonIndex(DECODE_INDEX_NAME, index);
}

export async function lookupDenoisedPCM(key: string): Promise<fs.File | null> {
  const index = await readJsonIndex<DenoiseEntry>(DENOISE_INDEX_NAME);
  const entry = index[key];
  if (!entry) return null;
  const file = new fs.File(entry.path);
  if (!file.exists) {
    delete index[key];
    await writeJsonIndex(DENOISE_INDEX_NAME, index);
    return null;
  }
  return file;
}

/**
 * Promote a staged denoised PCM into durable storage.
 *
 * The staged file lives in the OS cache, which Android may evict at any time
 * (or the user may clear). Registering the cache path directly used to make a
 * later "Try Again" resolve to a file that no longer existed, which surfaced as
 * "File does not exist" from readPCMChunks/PCMtoWav. Copying into documents
 * first means a cached entry only ever points at a file we control.
 */
export async function storeDenoisedPCM(key: string, file: fs.File): Promise<void> {
  const index = await readJsonIndex<DenoiseEntry>(DENOISE_INDEX_NAME);

  const target = new fs.File(intermediatesDir(), `${key.slice(0, 16)}_den.pcm`);
  if (target.exists) target.delete();
  await file.copy(target, { overwrite: true });

  if (!target.exists || (target.size ?? 0) === 0) {
    throw new Error("Denoised PCM could not be stored durably");
  }

  // Invalidate older entries pointing at the same path (key collisions).
  for (const [otherKey, entry] of Object.entries(index)) {
    if (otherKey !== key && entry.path === target.uri) delete index[otherKey];
  }

  index[key] = { path: target.uri, createdAt: Date.now() };
  pruneOldest(index, MAX_CACHED_DENOISES);
  await writeJsonIndex(DENOISE_INDEX_NAME, index);
}

// ---------------------------------------------------------------------------
// Cache cleanup
// ---------------------------------------------------------------------------

/** Temp artifacts this app drops in the OS cache (recording/processing). */
const TEMP_CACHE_PATTERNS: RegExp[] = [
  /^orig_\d+\.pcm$/,
  /^den_\d+\.pcm$/,
  /^denoised_\d+\.pcm$/,
  /^denoised_\d+\.m4a$/,
  /^denoised_\d+\.wav$/,
  /^denoised_\d+\.mp4$/,
  /^processed_\d+\.pcm$/,
  /^remux_\d+\.mp4$/,
];

/**
 * Removes only this app's leftover temp PCM/encode artifacts from the OS
 * cache. Deliberately does NOT touch directories (e.g. the DocumentPicker
 * working dir) or files it does not recognize — a blanket cache wipe was the
 * root cause of the "Failed to open data source: ENOENT" crashes.
 */
export function cleanupTempCache(): void {
  try {
    const cache = new fs.Directory(fs.Paths.cache);
    if (!cache.exists) return;
    for (const entry of cache.list()) {
      if (entry instanceof fs.Directory) continue;
      if (TEMP_CACHE_PATTERNS.some((pattern) => pattern.test(entry.name))) {
        try {
          entry.delete();
        } catch (error) {
          console.warn(`Failed to delete temp cache file ${entry.name}:`, error);
        }
      }
    }
  } catch (error) {
    console.warn("Failed to clean temp cache:", error);
  }
}
