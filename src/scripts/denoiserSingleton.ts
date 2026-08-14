import { Asset } from "expo-asset";
import { DeepFilterNet } from "./Denoiser";

/**
 * Shared ONNX session across screens.
 *
 * Loading the model is expensive and each `InferenceSession` holds native
 * resources (model bytes, thread pool arenas). Creating one per screen (and
 * one per "Try Again" press) previously leaked sessions until the process ran
 * out of heap — a crash our users hit after recording/denoising.
 *
 * The session lives for the whole app lifetime. Callers must still call
 * `setupStreaming()` per run to reset the model's state tensors.
 */

let instance: DeepFilterNet | null = null;
let loadPromise: Promise<DeepFilterNet> | null = null;

export async function getDenoiser(): Promise<DeepFilterNet> {
  if (instance) return instance;
  if (!loadPromise) {
    loadPromise = (async () => {
      const denoiser = new DeepFilterNet();
      const modelAsset = Asset.fromModule(
        require("@/assets/model/denoiser_model.ort"),
      );
      await modelAsset.downloadAsync();
      if (!modelAsset.localUri) {
        throw new Error("Model asset has no local URI after download");
      }
      await denoiser.loadModel(modelAsset.localUri);
      instance = denoiser;
      return denoiser;
    })();
    loadPromise = loadPromise.catch((error) => {
      // Allow a retry on the next call instead of caching a rejection forever.
      loadPromise = null;
      throw error;
    });
  }
  return loadPromise;
}
