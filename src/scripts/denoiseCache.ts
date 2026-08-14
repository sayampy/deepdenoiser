import metadata from "@/assets/model/model_metadata.json";
import { copyFile } from "@/modules/AudioProcessorModule";
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

export function outputDir(): fs.Directory {
  const dir = new fs.Directory(fs.Paths.document, OUTPUTS_DIR_NAME);
  if (!dir.exists) dir.create({ idempotent: true, intermediates: true });
  return dir;
}

/**
 * Copies a picked/shared file (file:// or content://) into app documents so
 * it survives process death, cache eviction and source-app revocation.
 * Returns the stable file:// File ready for processing.
 */
export async function importToDocuments(sourceUri: string, name: string): Promise<fs.File> {
  const destName = `${Date.now()}_${sanitizeFileName(name || "import")}`;
  const dest = new fs.File(importsDir(), destName);
  await copyFile(sourceUri, dest.uri);
  return dest;
}

/**
 * Moves a finished output file into the persistent outputs directory.
 * Returns the relocated File.
 */
export function placeOutput(source: fs.File, name: string): fs.File {
  const dest = new fs.File(outputDir(), sanitizeFileName(name));
  if (dest.exists) dest.delete();
  source.move(dest);
  return dest;
}

// ---------------------------------------------------------------------------
// Denoise result cache
// ---------------------------------------------------------------------------

function indexFile(): fs.File {
  return new fs.File(fs.Paths.document, INDEX_FILE_NAME);
}

async function readIndex(): Promise<CacheIndex> {
  try {
    const file = indexFile();
    if (!file.exists) return {};
    const raw = await file.text();
    if (!raw.trim()) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch (error) {
    console.error("Failed to read denoise cache index:", error);
    return {};
  }
}

async function writeIndex(index: CacheIndex): Promise<void> {
  try {
    indexFile().write(JSON.stringify(index), { encoding: "utf8" });
  } catch (error) {
    console.error("Failed to write denoise cache index:", error);
  }
}

/**
 * Cache key for a denoise run. Identical inputs + settings always produce the
 * same key, so "Try Again" with unchanged settings hits the cache.
 */
export function buildCacheKey(
  input: fs.File,
  settings: {
    attenLimDb: number;
    normalize: { toggle: boolean; targetRMS: number; maxPeakDb: number };
  },
): string {
  const modelSignature = `${metadata.hop_size}-${metadata.fft_size}`;
  return [
    "v1",
    modelSignature,
    input.name,
    input.size,
    input.modificationTime,
    settings.attenLimDb,
    settings.normalize.toggle,
    settings.normalize.targetRMS,
    settings.normalize.maxPeakDb,
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
  index[key] = { path: file.uri, createdAt: Date.now() };

  const keys = Object.keys(index);
  if (keys.length > MAX_CACHED_OUTPUTS) {
    const oldest = keys
      .sort((a, b) => (index[a].createdAt || 0) - (index[b].createdAt || 0))
      .slice(0, keys.length - MAX_CACHED_OUTPUTS);
    for (const oldKey of oldest) {
      try {
        new fs.File(index[oldKey].path).delete();
      } catch (error) {
        console.warn("Failed to delete pruned cache output:", error);
      }
      delete index[oldKey];
    }
  }

  await writeIndex(index);
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
