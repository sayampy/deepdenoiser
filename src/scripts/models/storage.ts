/**
 * Model storage and lifecycle.
 *
 * Models live in app-private managed storage so that they outlive JS reloads
 * and can be downloaded or deleted independently of the APK:
 *
 *   <document>/models/<modelId>/<version>/model.ort
 *
 * DeepFilterNet3 ships inside the APK. On first use it is copied into managed
 * storage and verified, and only then is the managed copy preferred. The
 * bundled asset is never deleted and is always usable as a fallback, so a
 * failed or interrupted migration can never leave the app with no model.
 */

import { Asset } from "expo-asset";
import { Directory, DownloadTask, File, Paths } from "expo-file-system";

import { MODELS, type ModelDescriptor, type ModelId } from "./registry";
import { getSettings, updateSettings } from "../settings";
import { sha256File } from "@/modules/AudioProcessorModule";

const MODELS_DIR = "models";
const MODEL_FILE = "model.ort";

export type InstallState =
  | { status: "installed"; path: string; bytes: number }
  | { status: "missing" }
  | { status: "bundled"; path: string | null };

function modelsRoot(): Directory {
  return new Directory(Paths.document, MODELS_DIR);
}

function modelDir(model: ModelDescriptor): Directory {
  return new Directory(modelsRoot(), model.id, model.version);
}

function modelFile(model: ModelDescriptor): File {
  return new File(modelDir(model), MODEL_FILE);
}

/** Describe whether a model is ready to run, and where its weights are. */
export async function getInstallState(id: ModelId): Promise<InstallState> {
  const model = MODELS[id];
  try {
    const file = modelFile(model);
    if (file.exists) {
      return { status: "installed", path: file.uri, bytes: file.size ?? 0 };
    }
  } catch (error) {
    console.warn(`Could not inspect managed storage for ${id}:`, error);
  }

  if (!model.bundled) {
    return { status: "missing" };
  }
  try {
    return { status: "bundled", path: await bundledAssetLocalUri(id) };
  } catch (error) {
    console.warn(`Bundled asset for ${id} is unavailable:`, error);
    return { status: "missing" };
  }
}

/**
 * Simplified install state for UI code.
 *
 * Collapses the bundled/installed distinction that the picker does not need:
 * a bundled model that has not been migrated yet still counts as installed.
 */
export async function installStateLabel(
  id: ModelId,
): Promise<{ status: "installed"; bytes: number } | { status: "missing" }> {
  const state = await getInstallState(id);
  if (state.status === "installed") return { status: "installed", bytes: state.bytes };
  if (state.status === "bundled") return { status: "installed", bytes: MODELS[id].bytes };
  return { status: "missing" };
}

/** True when the model can be used right now, without a download. */
export async function isModelAvailable(id: ModelId): Promise<boolean> {
  const state = await getInstallState(id);
  return state.status !== "missing";
}

/**
 * Resolve the packaged asset to a LOCAL file URI.
 *
 * In a development build the asset URI is served by Metro over http, which the
 * native ONNX runtime cannot read. `downloadAsync()` materialises a local copy
 * (in release builds the asset is already local, so this is a no-op).
 */
async function bundledAssetLocalUri(id: ModelId): Promise<string | null> {
  // Only DeepFilterNet3 is bundled today; the requires must stay static so
  // Metro can resolve them at build time.
  if (id !== "deepfilternet3") return null;
  const asset = Asset.fromModule(
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- Static asset require required by Expo bundler
    require("@/assets/model/denoiser_model.ort"),
  );
  if (!asset.localUri) {
    await asset.downloadAsync();
  }
  const uri = asset.localUri;
  if (!uri) throw new Error("Bundled model asset has no local URI after download");
  return uri;
}

/**
 * Copy the bundled DeepFilterNet3 asset into managed storage.
 *
 * Idempotent and non-destructive: the packaged asset is only ever read, and a
 * failure leaves the bundled fallback in place.
 */
export async function migrateBundledModel(): Promise<InstallState> {
  const model = MODELS.deepfilternet3;
  const existing = await getInstallState(model.id);
  if (existing.status === "installed") return existing;

  const sourceUri = await bundledAssetLocalUri(model.id);
  if (!sourceUri) {
    throw new Error("Bundled model asset has no readable URI");
  }

  const dir = modelDir(model);
  if (!dir.exists) dir.create({ intermediates: true });

  const target = modelFile(model);
  if (target.exists) target.delete();

  await new File(sourceUri).copy(target);
  if (!target.exists || (target.size ?? 0) === 0) {
    target.delete();
    throw new Error("Bundled model copy failed verification");
  }
  if (model.bytes > 0 && target.size !== model.bytes) {
    target.delete();
    throw new Error(
      `Bundled model copy is ${target.size} bytes, expected ${model.bytes}`,
    );
  }
  return { status: "installed", path: target.uri, bytes: target.size ?? 0 };
}

export interface DownloadProgress {
  bytesWritten: number;
  totalBytes: number;
  fraction: number;
}

export interface DownloadOptions {
  onProgress?: (progress: DownloadProgress) => void;
  /** Expected byte count when the server omits Content-Length. */
  totalBytes?: number;
  /** Abort the transfer; the partial file is discarded. */
  signal?: AbortSignal;
  /** Override for tests or a mirror. */
  url?: string;
}

/**
 * Path where a development build can stage a model artifact for offline use.
 *
 * A dev build has no Play/Store channel to fetch from, and pulling 219 MB
 * through Metro is not practical, so the artifact can be copied onto the
 * device (adb push, file manager, or the in-app picker) and promoted from
 * here. Production builds never read this location.
 */
export function devArtifactUri(model: ModelDescriptor): string {
  return new File(Paths.document, "models-dev", `${model.id}.ort`).uri;
}

/**
 * Verify a completed artifact (size + SHA-256) and promote it to the managed
 * location, replacing any previous install only once it is known good.
 */
async function verifyAndPromote(
  model: ModelDescriptor,
  partial: File,
): Promise<{ status: "installed"; path: string; bytes: number }> {
  const actualBytes = partial.size ?? 0;
  if (model.bytes > 0 && actualBytes !== model.bytes) {
    partial.delete();
    throw new Error(
      `Downloaded ${model.name} is ${actualBytes} bytes, expected ${model.bytes}`,
    );
  }
  if (model.sha256) {
    const digest = await sha256File(partial.uri);
    if (digest.toLowerCase() !== model.sha256.toLowerCase()) {
      partial.delete();
      throw new Error(`Checksum mismatch for ${model.name}`);
    }
  }

  const dir = modelDir(model);
  if (!dir.exists) dir.create({ intermediates: true });
  const target = new File(dir, MODEL_FILE);
  if (target.exists) target.delete();
  partial.move(target);
  return { status: "installed", path: target.uri, bytes: target.size ?? 0 };
}

/**
 * Download a hosted artifact into managed storage.
 *
 * Writes to a temporary file and promotes it atomically, so an interrupted
 * download can never leave a partially written model that loads and produces
 * garbage audio. When the registry declares a hash, the promoted file is
 * verified and rejected on mismatch.
 */
export async function downloadModel(
  id: ModelId,
  options: DownloadOptions = {},
): Promise<InstallState> {
  const model = MODELS[id];
  if (model.bundled) {
    return migrateBundledModel();
  }

  // A dev build prefers a locally staged artifact over the network. This is
  // what makes "download" work in a development build without pulling hundreds
  // of megabytes from GitHub (or via Metro).
  if (__DEV__ && !options.url) {
    const staged = new File(devArtifactUri(model));
    if (staged.exists) {
      options.onProgress?.({
        bytesWritten: model.bytes,
        totalBytes: model.bytes,
        fraction: 0,
      });
      const dir = modelDir(model);
      if (!dir.exists) dir.create({ intermediates: true });
      const partial = new File(dir, `${MODEL_FILE}.part`);
      if (partial.exists) partial.delete();
      await staged.copy(partial);
      options.onProgress?.({
        bytesWritten: model.bytes,
        totalBytes: model.bytes,
        fraction: 1,
      });
      return verifyAndPromote(model, partial);
    }
  }

  const url = options.url ?? hostedUrl(model);
  if (!url) {
    throw new Error(`No download URL configured for ${model.name}`);
  }

  const dir = modelDir(model);
  if (!dir.exists) dir.create({ intermediates: true });

  const partial = new File(dir, `${MODEL_FILE}.part`);
  if (partial.exists) partial.delete();
  // The existing install is only replaced once the new file has been verified,
  // so a failed or corrupt download never costs the user a working model.

  const total = options.totalBytes ?? model.bytes;
  options.onProgress?.({ bytesWritten: 0, totalBytes: total, fraction: 0 });

  const task = new DownloadTask(url, partial, {
    headers: { Accept: "application/octet-stream" },
    signal: options.signal,
    onProgress: (data) => {
      const expected = data.totalBytes > 0 ? data.totalBytes : total;
      options.onProgress?.({
        bytesWritten: data.bytesWritten,
        totalBytes: expected,
        fraction: expected > 0 ? Math.min(1, data.bytesWritten / expected) : 0,
      });
    },
  });

  try {
    const result = await task.downloadAsync();
    if (!result) throw new Error("Download was interrupted");
  } catch (error) {
    // Android streams straight into the destination file, so a failed or
    // cancelled transfer leaves a partial file behind. Never promote it.
    if (partial.exists) partial.delete();
    throw error;
  }

  const installed = await verifyAndPromote(model, partial);
  options.onProgress?.({ bytesWritten: total, totalBytes: total, fraction: 1 });
  return installed;
}

/**
 * Install a model from a local file the user picked (development builds, or a
 * manual sideload). The file is copied, verified against the registry, and only
 * then promoted, so a wrong or truncated artifact never replaces a good one.
 */
export async function importModelFile(
  id: ModelId,
  sourceUri: string,
): Promise<InstallState> {
  const model = MODELS[id];
  if (model.bundled) return migrateBundledModel();

  const dir = modelDir(model);
  if (!dir.exists) dir.create({ intermediates: true });

  const partial = new File(dir, `${MODEL_FILE}.part`);
  if (partial.exists) partial.delete();

  try {
    await new File(sourceUri).copy(partial);
  } catch (error) {
    if (partial.exists) partial.delete();
    throw new Error(
      `Could not read the selected file: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  return verifyAndPromote(model, partial);
}

/**
 * Resolve the published artifact URL for a hosted model.
 *
 * Artifacts are hosted as GitHub release assets on the main repository so the
 * download works for sideloaded builds without extra infrastructure. An
 * explicit EXPO_PUBLIC_MODEL_BASE_URL override wins, which allows pointing at
 * a CDN or a local server during testing.
 *
 * Layout for both sources: <base>/models-v<version>/<model id>.ort
 */
const GITHUB_MODEL_BASE =
  "https://github.com/sayampy/deepdenoiser/releases/download";

function hostedUrl(model: ModelDescriptor): string | null {
  const override = process.env.EXPO_PUBLIC_MODEL_BASE_URL;
  if (override) {
    return `${override.replace(/\/$/, "")}/models-v${model.version}/${model.id}.ort`;
  }
  return `${GITHUB_MODEL_BASE}/models-v${model.version}/${model.id}.ort`;
}

/**
 * Delete a downloaded model.
 *
 * Refuses to remove the model that is currently selected or was last used, so
 * a delete can never leave the app pointing at weights that no longer exist.
 * Bundled models are never deleted from the APK.
 */
export async function deleteModel(id: ModelId): Promise<void> {
  const model = MODELS[id];
  if (model.bundled) {
    // Removing the managed copy is safe: the packaged asset remains available.
  }

  const settings = await getSettings();
  const inUse = settings.selectedModel === id || settings.lastUsedModel === id;
  if (inUse) {
    throw new Error(`${model.name} is in use. Choose another model first.`);
  }

  const dir = modelDir(model);
  if (dir.exists) dir.delete();
}

/** Total bytes occupied by downloaded models, for the Settings summary. */
export async function installedBytes(): Promise<number> {
  let total = 0;
  for (const model of Object.values(MODELS)) {
    const state = await getInstallState(model.id);
    if (state.status === "installed") total += state.bytes;
  }
  return total;
}

/**
 * Persist the model to use for both processing and recording.
 *
 * `lastUsedModel` is kept separately so that a user who switches models and
 * then deletes the new one is not left without a sensible default.
 */
export async function setSelectedModel(id: ModelId): Promise<void> {
  await updateSettings({ selectedModel: id, lastUsedModel: id });
}

export async function getSelectedModel(): Promise<ModelDescriptor> {
  const settings = await getSettings();
  const id = (settings.selectedModel || settings.lastUsedModel) as ModelId;
  return id in MODELS ? MODELS[id] : MODELS.deepfilternet3;
}