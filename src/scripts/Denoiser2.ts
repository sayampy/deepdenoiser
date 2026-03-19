import metadata from "@/assets/model/model_metadata.json";
import { InferenceSession, Tensor } from "onnxruntime-react-native";

export class DeepFilterNet {
  private session: InferenceSession | null = null;
  private readonly hopSize: number;
  private readonly fftSize: number;
  private readonly stateInputNames: string[];
  private readonly hasSingleStateTensor: boolean;
  private readonly statesLen: number;
  private readonly inputNames: string[];
  private readonly outputNames: string[];

  constructor() {
    this.hopSize = metadata.hop_size;
    this.fftSize = metadata.fft_size;
    this.inputNames = metadata.inputs.map((i) => i.name);
    this.outputNames = metadata.outputs.map((o) => o.name);

    this.stateInputNames = this.inputNames.filter(
      (name) => name !== "input_frame" && name !== "atten_lim_db",
    );
    this.hasSingleStateTensor = this.stateInputNames.includes("states");

    if (this.hasSingleStateTensor) {
      const statesMeta = metadata.inputs.find((i) => i.name === "states");
      if (!statesMeta) {
        throw new Error("Metadata for 'states' input not found.");
      }
      this.statesLen = statesMeta.shape[0]!;
    } else {
      this.statesLen = 0; // Not used
    }
  }

  public async loadModel(modelPath: string): Promise<void> {
    try {
      const options: InferenceSession.SessionOptions = {
        executionProviders: ["cpu"],
        graphOptimizationLevel: "all",
        interOpNumThreads: 1,
        intraOpNumThreads: 1,
      };
      this.session = await InferenceSession.create(modelPath, options);
      console.log(`Successfully loaded model from ${modelPath}`);
    } catch (e) {
      console.error(`Failed to load model: ${e}`);
      throw e;
    }
  }

  private initStates(): {
    states: Tensor | Tensor[];
    attenLimDb: Tensor;
  } {
    let states: Tensor | Tensor[];

    if (this.hasSingleStateTensor) {
      states = new Tensor("float32", new Float32Array(this.statesLen), [
        this.statesLen,
      ]);
    } else {
      states = [];
      const stateInputsMeta = metadata.inputs.filter((i) =>
        this.stateInputNames.includes(i.name),
      );
      for (const meta of stateInputsMeta) {
        const size = meta.shape.reduce((a, b) => a * b, 1);
        states.push(
          new Tensor("float32", new Float32Array(size), meta.shape),
        );
      }
    }

    const attenLimDb = new Tensor("float32", new Float32Array([0.0]), [1]);
    return { states, attenLimDb };
  }

  public async denoise(
    audio: Float32Array,
    onProgress?: (progress: number) => void,
  ): Promise<Float32Array> {
    // Note: The model expects 48kHz mono audio.
    // Ensure input audio is resampled and downmixed before calling this method.
    if (!this.session) {
      throw new Error("Model not loaded. Please call loadModel() first.");
    }

    // Align logic with denoiser.py/torchaudio: Ensure audio is normalized to [-1, 1].
    // Static noise is often caused by passing Int16 values (approx +/- 32000) to the model.
    let maxVal = 0;
    for (let i = 0; i < audio.length; i++) {
      if (Math.abs(audio[i]) > maxVal) maxVal = Math.abs(audio[i]);
    }
    if (maxVal > 1.0) {
      console.log(`Audio amplitude (${maxVal}) > 1.0. Normalizing to [-1, 1] range.`);
      const scale = 1.0 / 32768.0; // Assuming 16-bit PCM source
      for (let i = 0; i < audio.length; i++) {
        audio[i] *= scale;
      }
    }

    let { states, attenLimDb } = this.initStates();

    const origLen = audio.length;
    const hopSizeDivisiblePaddingSize =
      (this.hopSize - (origLen % this.hopSize)) % this.hopSize;
    const totalPadding = this.fftSize + hopSizeDivisiblePaddingSize;

    const paddedAudio = new Float32Array(origLen + totalPadding);
    paddedAudio.set(audio, 0);

    const enhancedFrames: Float32Array[] = [];

    console.log("Denoising audio...");
    const numSteps = Math.ceil(paddedAudio.length / this.hopSize);
    let lastReportedProgress = -1;

    for (let start = 0; start < paddedAudio.length; start += this.hopSize) {
      const end = start + this.hopSize;
      // Use subarray to create a view (no copy) similar to torch.split/chunks
      const frame = paddedAudio.subarray(start, end);

      // The model expects a fixed frame size. If the last frame is smaller, it should be padded.
      const inputFrameData = new Float32Array(this.hopSize);
      inputFrameData.set(frame);
      const inputFrame = new Tensor("float32", inputFrameData, [
        this.hopSize,
      ]);

      const feeds: any = { input_frame: inputFrame };
      if (this.inputNames.includes("atten_lim_db")) {
        feeds["atten_lim_db"] = attenLimDb;
      }

      if (this.hasSingleStateTensor) {
        feeds["states"] = states as Tensor;
      } else {
        (states as Tensor[]).forEach((stateTensor, idx) => {
          feeds[this.stateInputNames[idx]] = stateTensor;
        });
      }

      const results = await this.session.run(feeds);

      const enhancedFrame = results[this.outputNames[0]];
      enhancedFrames.push(enhancedFrame.data as Float32Array);

      // Update states
      if (this.hasSingleStateTensor) {
        states = results[this.outputNames[1]]; // new_states is the second output
      } else {
        const newStates: Tensor[] = [];
        for (let j = 0; j < this.stateInputNames.length; j++) {
          // new states are after the enhanced frame output
          newStates.push(results[this.outputNames[j + 1]]);
        }
        states = newStates;
      }

      if (onProgress) {
        const currentStep = start / this.hopSize + 1;
        const progress = Math.round((currentStep / numSteps) * 100);
        if (progress > lastReportedProgress) {
          onProgress(progress);
          lastReportedProgress = progress;
        }
      }
    }

    const concatenatedLength = enhancedFrames.reduce(
      (sum, arr) => sum + arr.length,
      0,
    );
    const enhancedAudio = new Float32Array(concatenatedLength);
    let offset = 0;
    for (const frame of enhancedFrames) {
      enhancedAudio.set(frame, offset);
      offset += frame.length;
    }

    const delay = this.fftSize - this.hopSize;
    const trimmedAudio = enhancedAudio.slice(delay, origLen + delay);

    return trimmedAudio;
  }
}

// Example usage (you can create a separate file for this)
async function main() {
  // This is an example of how to use the Denoiser class.
  // You would need to replace this with actual audio loading logic.
  // For example, using a library like 'wav-decoder'.
  const denoiser = new DeepFilterNet();
  await denoiser.loadModel("./denoiser_model.ort");

  // Create a dummy noisy audio signal for demonstration
  const sampleRate = 48000;
  const duration = 5; // seconds
  const noisyAudio = new Float32Array(sampleRate * duration);
  for (let i = 0; i < noisyAudio.length; i++) {
    noisyAudio[i] = (Math.random() - 0.5) * 0.5; // Example: white noise
  }
  console.log(`Created a dummy noisy audio of ${duration} seconds.`);

  const onProgress = (progress: number) => {
    process.stdout.write(`Denoising progress: ${progress}%\r`);
  };

  const enhancedAudio = await denoiser.denoise(noisyAudio, onProgress);

  console.log(
    `Denoising complete. Enhanced audio length: ${enhancedAudio.length}`,
  );
  // Here you would save the 'enhancedAudio' Float32Array to a WAV file.
}

// main().catch(console.error);
