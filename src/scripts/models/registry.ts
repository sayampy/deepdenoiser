/**
 * Model registry.
 *
 * DeepDenoiser supports models with genuinely different inference contracts:
 *
 *  - DeepFilterNet3 is a recurrent frame-by-frame model (512-sample hops,
 *    stateful tensors that must be reset per run).
 *  - GTCRN is a tiny streaming STFT model with explicit cache tensors and a
 *    256-sample hop, fast enough for live recording.
 *
 * Forcing those into one API is what makes model selection brittle, so each
 * entry declares its contract as data and the runtime adapters
 * (`src/scripts/models/`) interpret it.
 */

export type ModelId = "deepfilternet3" | "gtcrn";

export type ModelFamily = "deepfilternet" | "gtcrn";

/** How the adapter must feed audio to the session. */
export interface StreamingContract {
  /** All current models are stateful frame/hop models. */
  mode: "frame";
  /** Samples consumed per inference call (frame size or chunk size). */
  chunkSamples: number;
  /** Start-up padding so the model has context before the first real sample. */
  lookaheadSamples: number;
  /** Samples to drop from the head of the output to realign it with the input. */
  alignmentDelaySamples: number;
}

export interface SpectrumContract {
  /** FFT / window / hop geometry used to build the model's spectrogram input. */
  fftSize: number;
  windowLength: number;
  hopLength: number;
  /** Number of frequency bins fed to, or produced by, the model. */
  bins: number;
  /** Magnitude compression exponent applied before inference (1 = no compression). */
  compression: number;
  centered: boolean;
}

export interface ModelDescriptor {
  id: ModelId;
  /** Shown in the picker. */
  name: string;
  /** One-line description for the picker and Settings. */
  description: string;
  family: ModelFamily;
  /** Native rate of the model; audio is resampled to and from it. */
  sampleRate: number;
  /** Bumped when the hosted artifact changes so downloads can be invalidated. */
  version: string;
  /**
   * Optional exact artifact URL. Models whose weights are published by the
   * upstream project use it instead of this repo's release assets; an
   * EXPO_PUBLIC_MODEL_BASE_URL override still wins.
   */
  artifactUrl?: string;
  /** Expected byte size of the artifact, used to detect truncated downloads. */
  bytes: number;
  /** SHA-256 of the artifact; the download is rejected when it does not match. */
  sha256: string;
  /** Origin, for the licence/attribution line in Settings. */
  source: string;
  license: string;
  /** True when the artifact ships inside the APK (only DeepFilterNet3 today). */
  bundled: boolean;
  streaming: StreamingContract;
  spectrum: SpectrumContract | null;
  /** Rough CPU cost class, shown in the picker as a speed label. */
  cost: "fast" | "slowest";
  /** What the model is intended for, shown in the picker as a purpose label. */
  purpose: "speech" | "general";
  /** Notes surfaced in the model detail sheet. */
  notes?: string[];
}

export const MODELS: Record<ModelId, ModelDescriptor> = {
  deepfilternet3: {
    id: "deepfilternet3",
    name: "DeepFilterNet3",
    description: "48 kHz speech denoiser. Bundled with the app and works offline.",
    family: "deepfilternet",
    sampleRate: 48000,
    version: "1",
    bytes: 13014400,
    sha256: "ec5ec24059035741763006dfaa6d463cfbbacf496caed5b5599ebe3477f2dd5b",
    source: "Rikorose/DeepFilterNet",
    license: "MIT / Apache-2.0",
    bundled: true,
    streaming: {
      mode: "frame",
      chunkSamples: 512,
      lookaheadSamples: 0,
      alignmentDelaySamples: 512 * 3,
    },
    spectrum: null,
    cost: "slowest",
    purpose: "speech",
    notes: ["Bundled with the app, so no download is needed."],
  },
  gtcrn: {
    id: "gtcrn",
    name: "GTCRN",
    description:
      "Tiny 16 kHz denoiser. ~0.5 MB, runs far faster than real time on CPU.",
    family: "gtcrn",
    sampleRate: 16000,
    version: "1",
    artifactUrl:
      "https://github.com/k2-fsa/sherpa-onnx/releases/download/speech-enhancement-models/gtcrn_simple.onnx",
    bytes: 535638,
    sha256:
      "e77603ac0c23dac3227dd2d7135b3a585cbee2679048aecfa886657d3ae1b534",
    source: "Xiaobin-Rong/GTCRN (sherpa-onnx streaming export)",
    license: "MIT",
    bundled: false,
    streaming: {
      mode: "frame",
      // Streaming STFT: 512-sample window, 256-sample hop, cache carried
      // between hops. One hop of overlap-add latency (16 ms at 16 kHz).
      chunkSamples: 256,
      lookaheadSamples: 512,
      alignmentDelaySamples: 256,
    },
    spectrum: {
      fftSize: 512,
      windowLength: 512,
      hopLength: 256,
      bins: 257,
      compression: 1,
      centered: false,
    },
    cost: "fast",
    purpose: "general",
    notes: [
      "About 0.5 MB and 48k parameters — the fastest model here.",
      "Resamples to 16 kHz, so highs are lost compared with the 48 kHz models.",
      "Ideal for live recording and low-end devices.",
    ],
  },
};

export const MODEL_IDS = Object.keys(MODELS) as ModelId[];

export const DEFAULT_MODEL_ID: ModelId = "deepfilternet3";

export function isModelId(value: string | null | undefined): value is ModelId {
  return typeof value === "string" && value in MODELS;
}

export function getModel(id: string | null | undefined): ModelDescriptor {
  return isModelId(id) ? MODELS[id] : MODELS[DEFAULT_MODEL_ID];
}

/** Human label for an unknown/legacy stored id. */
export function modelName(id: string | null | undefined): string {
  return getModel(id).name;
}