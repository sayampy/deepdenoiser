# On-device inference performance notes

Current models:

- **GTCRN** — 16 kHz streaming STFT model, 535,638-byte ONNX artifact, 512/256
  STFT, three carried cache tensors. Its frontend mirrors sherpa-onnx's
  `OnlineSpeechDenoiser`; a local parity check against the official Python API
  matched to 5.7e-7 max absolute sample error on an 8 s noisy clip. Host CPU RTF
  measured 0.071 (≈14× faster than real time). This is the model to use for live
  recording and for general broadband/white-noise removal on low-end devices.
- **DeepFilterNet3** — 48 kHz recurrent speech model, bundled, 13 MB. Runs with
  `["xnnpack","cpu"]`, graph optimisation `all`, `interOpNumThreads: 1`, and
  device-scaled `intraOpNumThreads` (1/2/4). `processFrame()` reuses its 12
  named state tensors and writes into the caller's destination buffer. State now
  survives across stream calls (it used to be reset on every 5 s read and every
  100 ms recording chunk).

MossFormer was removed: its committed adapter had multiple provable correctness
bugs (real mask read as complex pairs, overlap stitching dropping a full stride
per window, 2048-point FFT used with 1920-point bin layout), and even correct
inference ran slower than real time on mid-range phones. GTCRN replaces it for
general-purpose enhancement.

Three denoise cache layers (final / decode / denoise PCM) avoid repeat work on
file processing.

## Ranked speedup ideas (remaining)

| # | Idea | Expected gain | Effort / risk |
|---|---|---|---|
| 1 | Sweep device thread counts on real hardware (already adaptive at 1/2/4) | up to ~1.5x | Trivial. Watch thermal throttling; `extra` options are WASM/Node-only in ORT-RN. |
| 2 | Remove per-frame JSI/tensor churn in `runDenoiseLoop` | 5–20% on long files | Reuse preallocated tensors. `session.run()` per frame is unavoidable — IOBinding is unavailable. |
| 3 | int8 quantisation of DF3 conv weights | ~2x smaller file, little/no CPU speed gain | Published DF3 INT8 RTF 0.018 vs 0.017 fp32; GRU blocks full quantisation. Would need version/hash + cache-key bumps. |
| 4 | Low-lookahead DF2/DF3 `_ll` exports | latency 40 ms → ~10 ms | Requires new ONNX artifact; no speed change. |

fp16 gives no CPU gain on ARM. NNAPI stays off per project directive (GRU
support is driver-dependent and can silently fall back or return zeros).

## Hard constraints (ORT React Native 1.24.3, npm `latest` as of 2026-11)

- ORT infers format from the file extension: a plain ONNX graph MUST be saved
  as `.onnx`, not `.ort` (`.ort` means the optimised ORT format). Storing the
  upstream GTCRN `.onnx` as `model.ort` produced `ORT model verification
  failed` on device; `modelFileName()` in `storage.ts` now preserves it.
- No IOBinding → no zero-copy feed/fetch.
- No batch dimension for DF3 (input `[512]`, static batch=1) and 12-state
  recurrent graph → no batching or parallel frames.
- No Worker API in RN; JSI worklets cannot host ORT → no worker parallelism.
- `extra` session options (thread affinities/optimisation overrides) are
  WebAssembly/Node-only.
- ORT Mobile is not exposed; GPU delegates are not available to this app.

## Measurement protocol

Instrument `performance.now()` around `session.run()` and the JS transform
stages; report RTF = inference seconds / audio seconds over a fixed 60 s clip,
3 warm runs, on low/mid/high devices. Any artifact change must bump
`version`/`bytes`/`sha256` in `src/scripts/models/registry.ts` and the cache
prefixes in `denoiseCache.ts`, otherwise stale cached WAVs are reused.
