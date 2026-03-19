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
            // Fallback to metadata for shape info, as RN-ORT doesn't expose input shapes easily
            const statesMeta = metadata.inputs.find((i) => i.name === "states");
            if (!statesMeta) throw new Error("Metadata for 'states' input not found.");
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
        if (!this.session) {
            throw new Error("Model not loaded. Please call loadModel() first.");
        }

        // ALIGNMENT: Assume caller passes normalized [-1.0, 1.0] audio. 
        // Throw error if scaling is wildly off rather than silently crushing the signal.
        let maxAmplitude = 0;
        for (let i = 0; i < audio.length; i++) {
            if (Math.abs(audio[i]) > maxAmplitude) maxAmplitude = Math.abs(audio[i]);
        }
        if (maxAmplitude > 2.0) {
            console.warn(`Audio amplitude (${maxAmplitude}) exceeds expected [-1.0, 1.0] range. Ensure input is float32 PCM.`);
        }

        let { states, attenLimDb } = this.initStates();

        const origLen = audio.length;
        console.log(`Original audio length: ${origLen}`)
        const hopSizeDivisiblePaddingSize =
            (this.hopSize - (origLen % this.hopSize)) % this.hopSize;
        const totalPadding = this.fftSize + hopSizeDivisiblePaddingSize;
        console.log(`Total padding: ${totalPadding}`)
        console.log(`Hop size: ${this.hopSize}`)

        // ALIGNMENT: Pad at the end (0 left, totalPadding right)
        const paddedAudio = new Float32Array(origLen + totalPadding);
        console.log(`Padded audio length: ${paddedAudio.length}`);
        paddedAudio.set(audio, 0);
        console.log(`Padded audio length after audio: ${paddedAudio.length}`);


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
            const inputFrame = new Tensor("float32", inputFrameData, [this.hopSize]);

            const feeds: Record<string, Tensor> = { input_frame: inputFrame };
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

            // CRITICAL FIX: Deep copy the memory buffer. 
            // Do NOT push `results[...].data` directly, as ORT reuses the buffer pointer.
            const outFrameRaw = results[this.outputNames[0]].data as Float32Array;
            // Safety Validation: If length doesn't match hopSize, we are parsing the wrong output
            if (outFrameRaw.length !== this.hopSize) {
                throw new Error(`Output parsing fault: Expected audio frame of size ${this.hopSize}, got ${outFrameRaw.length}. Check metadata.outputs order.`);
            }
            enhancedFrames.push(new Float32Array(outFrameRaw));

            // CRITICAL FIX: Deep copy states for the next iteration to prevent graph state corruption
            if (this.hasSingleStateTensor) {
                const nextStateRaw = results[this.outputNames[1]].data as Float32Array;
                states = new Tensor("float32", new Float32Array(nextStateRaw), [this.statesLen]);
            } else {
                const newStates: Tensor[] = [];
                for (let j = 0; j < this.stateInputNames.length; j++) {
                    const nextMultiStateRaw = results[this.outputNames[j + 1]].data as Float32Array;
                    const originalShape = (states as Tensor[])[j].dims;
                    newStates.push(new Tensor("float32", new Float32Array(nextMultiStateRaw), originalShape));
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
        console.log(`Enhanced frames: ${enhancedFrames.length}`)

        // ALIGNMENT: Concat and trim delay
        const concatenatedLength = enhancedFrames.reduce(
            (sum, arr) => sum + arr.length,
            0,
        );
        console.log(`Concatenated length: ${concatenatedLength}`)
        const enhancedAudio = new Float32Array(concatenatedLength);
        let offset = 0;
        for (const frame of enhancedFrames) {
            enhancedAudio.set(frame, offset);
            offset += frame.length;
        }

        const delay = this.fftSize - this.hopSize;
        console.log(`Delay: ${delay}`);
        const trimmedAudio = enhancedAudio.slice(totalPadding, origLen + totalPadding);
        console.log(`Trimmed audio length: ${trimmedAudio.length}`)
        return trimmedAudio;
    }
}