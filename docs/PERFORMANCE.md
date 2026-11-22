# On-device inference performance notes

Baseline (SDK 57 tree): DeepFilterNet3 runs with `["xnnpack","cpu"]`, graph
optimization `all`, `interOpNumThreads: 1`, `intraOpNumThreads: 4`;
`processFrame()` already reuses its 12 named state tensors. MossFormer runs
CPU-only with `intraOpNumThreads: 2` and has its own JS radix-2 FFT. Three
denoise cache layers (final / decode / denoise PCM) avoid repeat work.

## Ranked speedup ideas

| # | Idea | Expected gain | Effort / risk |
|---|---|---|---|
| 1 | Sweep `intraOpNumThreads` at 1/2/4/8 on real devices | 1.2–2x on big cores | Trivial; watch thermal throttling. No thread-affinity control (`extra` options are WASM/Node-only). |
| 2 | Enable XNNPACK for MossFormer (currently CPU-only) | ~1.2–2x on GRU/conv-heavy graphs | One-line A/B; small numeric drift, re-check quality. NNAPI stays off per project directive. |
| 3 | Remove per-frame JSI/tensor churn in `runDenoiseLoop` | 5–20% on long files | Reuse preallocated input/output tensors and drop `Promise.all` for a single feed. `session.run()` per frame is unavoidable — IOBinding is unavailable. |
| 4 | int8 static/dynamic quantization of conv/GRU weights | 2–4x smaller, ~1.5–3x faster CPU | Needs re-export + calibration. **Must bump `version`/`bytes`/`sha256` in `src/scripts/models/registry.ts` and cache prefixes (`"v1"`/`"dn-v2"`) in `denoiseCache.ts`** — cache keys currently use only geometry, so a quantized model with the same shape would silently reuse stale WAVs. fp16 gives no CPU gain on ARM. |
| 5 | Precompute FFT twiddles / NEON DSP for MossFormer STFT | 1.3–3x of the JS DSP portion | `mossformer.ts` recomputes `cos`/`sin` in the inner loop. Same math = low quality risk; profile JS STFT separately from ORT time. |
| 6 | Reduce 75% chunk overlap for MossFormer | up to ~33% fewer inferences | High seam-artifact risk; only with cross-fade + PESQ/STOI validation. |

## Hard constraints (ORT React Native 1.24.3, still npm `latest` as of 2026-11)

- No IOBinding → no zero-copy feed/fetch.
- No batch dimension (input `[512]`, static batch=1) and 12-state recurrent graph → no batching or parallel frames.
- No Worker API in RN; JSI worklets cannot host ORT → no worker parallelism.
- `extra` session options (thread affinities/optimization overrides) are WebAssembly/Node-only.
- ORT Mobile is not exposed; NNAPI GRU support is device-dependent and disabled by project directive.

## Measurement protocol

Instrument `performance.now()` around `session.run()` and the JS transform
stages; report RTF = inference seconds / audio seconds over a fixed 60 s clip,
3 warm runs, on low/mid/high devices, plus PESQ/STOI for any quantization or
overlap change. Re-verify cache invalidation after every artifact change.
