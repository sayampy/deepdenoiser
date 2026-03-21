import metadata from "@/assets/model/model_metadata.json";
import { InferenceSession, Tensor } from "onnxruntime-react-native";

export class DeepFilterNet {
    private session: InferenceSession | null = null;
    private readonly hopSize: number;
    private readonly fftSize: number;
    private readonly stateInputNames: string[];
    private readonly hasSingleStateTensor: boolean;
    private readonly statesShape: number[];
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
            if (!statesMeta) throw new Error("Metadata for 'states' input not found.");
            this.statesShape = statesMeta.shape;
            this.statesLen = this.statesShape.reduce((a, b) => a * b, 1);
        } else {
            this.statesShape = [];
            this.statesLen = 0;
        }
    }

    public async loadModel(modelPath: string): Promise<void> {
        try {
            const options: InferenceSession.SessionOptions = {
                executionProviders: ["cpu"],
                graphOptimizationLevel: "all",
                interOpNumThreads: 4, // Optimized for multi-core mobile CPUs
                intraOpNumThreads: 4,
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
            states = new Tensor("float32", new Float32Array(this.statesLen), this.statesShape);
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

    /**
     * Denoise audio feed(s).
     */
    public async denoise(
        audio: Float32Array | Float32Array[],
        onProgress?: ((p: number) => void) | ((p: number, i: number) => void),
    ): Promise<Float32Array | Float32Array[]> {
        if (!this.session) {
            throw new Error("Model not loaded. Please call loadModel() first.");
        }

        const isArray = Array.isArray(audio);
        const feeds = isArray ? audio : [audio];

        // Validate amplitude range for each feed
        for (const feed of feeds) {
            let maxAmplitude = 0;
            for (let i = 0; i < feed.length; i++) {
                const abs = Math.abs(feed[i]);
                if (abs > maxAmplitude) maxAmplitude = abs;
            }
            if (maxAmplitude > 2.0) {
                console.warn(`Audio amplitude (${maxAmplitude}) exceeds expected [-1.0, 1.0] range. Ensure input is float32 PCM.`);
            }
        }

        const results = await this.runDenoiseLoop(feeds, onProgress);

        return isArray ? results : results[0];
    }

    private async runDenoiseLoop(
        audioFeeds: Float32Array[],
        onProgress?: ((p: number) => void) | ((p: number, i: number) => void),
    ): Promise<Float32Array[]> {
        if (!this.session) throw new Error("Session not initialized");

        const numFeeds = audioFeeds.length;
        const origLen = audioFeeds[0].length;
        
        // ALIGNMENT: Prepend fftSize zeros for delay compensation
        const hopSizePadding = (this.hopSize - (origLen % this.hopSize)) % this.hopSize;
        const totalPadding = this.fftSize + hopSizePadding;
        const paddedLen = origLen + totalPadding;
        const numSteps = Math.ceil(paddedLen / this.hopSize);

        // Prepare resources for all feeds
        const feedStates = audioFeeds.map(() => {
            const { states, attenLimDb } = this.initStates();
            const inputFrameData = new Float32Array(this.hopSize);
            const inputFrame = new Tensor("float32", inputFrameData, [this.hopSize]);
            const paddedAudio = new Float32Array(paddedLen);
            // Note: In case of multi-feed, we assume they all have same length
            // We'll set the actual audio later in a loop or here if they are already known
            return {
                states,
                attenLimDb,
                inputFrameData,
                inputFrame,
                paddedAudio,
                enhancedAudio: new Float32Array(numSteps * this.hopSize),
            };
        });

        // Initialize padded audio buffers
        for (let i = 0; i < numFeeds; i++) {
            feedStates[i].paddedAudio.set(audioFeeds[i], this.fftSize);
        }

        let lastReportedProgress = -1;

        for (let step = 0; step < numSteps; step++) {
            const start = step * this.hopSize;

            // Prepare feeds_array for parallel execution
            // then asynchronously iterate through the feeds_array and run this.session.run with every feed
            const inferencePromises = feedStates.map(async (f) => {
                // Fast data copy into reusable tensor buffer
                f.inputFrameData.set(f.paddedAudio.subarray(start, start + this.hopSize));

                const feeds: Record<string, Tensor> = {
                    input_frame: f.inputFrame
                };

                if (this.inputNames.includes("atten_lim_db")) {
                    feeds["atten_lim_db"] = f.attenLimDb;
                }

                if (this.hasSingleStateTensor) {
                    feeds["states"] = f.states as Tensor;
                } else {
                    const stateTensors = f.states as Tensor[];
                    for (let j = 0; j < stateTensors.length; j++) {
                        feeds[this.stateInputNames[j]] = stateTensors[j];
                    }
                }

                const results = await this.session!.run(feeds);

                // Update output buffer and states
                const outFrameRaw = results[this.outputNames[0]].data as Float32Array;
                f.enhancedAudio.set(outFrameRaw, start);

                if (this.hasSingleStateTensor) {
                    const nextStateRaw = results[this.outputNames[1]].data as Float32Array;
                    f.states = new Tensor("float32", nextStateRaw, this.statesShape);
                } else {
                    const newStates: Tensor[] = [];
                    for (let j = 0; j < this.stateInputNames.length; j++) {
                        const nextMultiStateRaw = results[this.outputNames[j + 1]].data as Float32Array;
                        const originalShape = (f.states as Tensor[])[j].dims;
                        newStates.push(new Tensor("float32", nextMultiStateRaw, originalShape));
                    }
                    f.states = newStates;
                }
            });

            await Promise.all(inferencePromises);

            // Progress reporting
            if (onProgress) {
                const progress = Math.round(((step + 1) / numSteps) * 100);
                if (progress > lastReportedProgress) {
                    if (numFeeds > 1) {
                        for (let i = 0; i < numFeeds; i++) {
                            (onProgress as (p: number, i: number) => void)(progress, i);
                        }
                    } else {
                        (onProgress as (p: number) => void)(progress);
                    }
                    lastReportedProgress = progress;
                }
            }
        }

        // Return trimmed denoised buffers
        return feedStates.map(f => f.enhancedAudio.slice(this.fftSize, origLen + this.fftSize));
    }
}