#!/usr/bin/env python3
"""Export MossFormer ClearerVoice checkpoints to mobile-ready ONNX and ORT.

Source checkpoints (Apache-2.0):
  alibabasglab/MossFormer2_SE_48K   -> 48 kHz speech enhancement
  alibabasglab/MossFormerGAN_SE_16K -> 16 kHz speech enhancement

Model code is taken from the upstream ClearerVoice-Studio repository; this
script only wraps the trained network into a dynamic-length encoder and
validates that the exported graph matches PyTorch.

Usage:
  python scripts/models/export_mossformer.py \
      --clearvoice .build-tmp/cv/clearvoice \
      --checkpoint .build-tmp/moss2/last_best_checkpoint.pt \
      --name mossformer2_se_48k \
      --out .build-tmp/models
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import sys
from pathlib import Path
from types import SimpleNamespace

import numpy as np
import torch
import torch.nn as nn


def load_state_dict(path: Path) -> dict[str, torch.Tensor]:
    ckpt = torch.load(path, map_location="cpu", weights_only=False)
    if isinstance(ckpt, dict) and "model" in ckpt and isinstance(ckpt["model"], dict):
        return ckpt["model"]
    return ckpt


class Encoder(nn.Module):
    """Explicit ONNX signature for a MossFormer MaskNet.

    MossFormer_MaskNet.forward already returns the first speaker's mask as
    [B, frames, bins]; this wrapper only makes the contract explicit so the
    dynamic axis names match what the app consumes. It must not reorder dims.
    """

    def __init__(self, masknet: nn.Module) -> None:
        super().__init__()
        self.masknet = masknet

    def forward(self, features: torch.Tensor) -> torch.Tensor:
        return self.masknet(features)


def build_48k(clearvoice: Path) -> tuple[nn.Module, int]:
    # Import model submodules directly: clearvoice/__init__ pulls in CLI-only
    # dependencies (yamlargparse) that are irrelevant to the network graph.
    sys.path.insert(0, str(clearvoice))
    from models.mossformer2_se.mossformer2 import MossFormer_MaskNet

    net = MossFormer_MaskNet(
        in_channels=180, out_channels=512, out_channels_final=961
    )
    return net, 180


class GanEncoder(nn.Module):
    """ONNX signature for MossFormerGAN_SE_16K.

    SyncANet derives magnitude/phase with torch.complex and torch.angle, which
    ONNX cannot express. Both are replaced here by mathematically equivalent
    forms, so the graph stays numerically identical to upstream:

      mag   = sqrt(re^2 + im^2)          (passed in, identical to SyncANet)
      phase = atan2(im, re)              (identical to torch.angle)
      x_in  = cat([mag, re, im], dim=1)

    Input is the compressed 2-channel spectrogram [B, 2, freq, time]; the
    upstream grid is fixed at 201 x 201, so no dynamic freq/time axes.
    """

    def __init__(self, net: nn.Module) -> None:
        super().__init__()
        self.net = net

    def forward(
        self, spectrum: torch.Tensor, mag: torch.Tensor
    ) -> tuple[torch.Tensor, torch.Tensor]:
        re, im = spectrum[:, 0:1], spectrum[:, 1:2]
        phase = torch.atan2(im, re)
        x_in = torch.cat([mag, spectrum], dim=1)

        x = self.net.dense_encoder(x_in)
        for block in self.net.blocks:
            x = block(x)

        mask = self.net.mask_decoder(x)
        out_mag = mask * mag
        complex_out = self.net.complex_decoder(x)

        final_real = out_mag * torch.cos(phase) + complex_out[:, 0:1]
        final_imag = out_mag * torch.sin(phase) + complex_out[:, 1:2]
        return final_real, final_imag


def replace_eyelike(onnx_path: Path, sizes: dict[str, int]) -> int:
    """Replace EyeLike nodes with constants of the correct size.

    torch.einsum decomposes attention into nodes that include an EyeLike op,
    which onnxruntime does not implement. Each EyeLike masks the diagonal of a
    similarity matrix, and the matrix width differs by branch:

      intra_mossformer -> padded grid  (201)
      inter_mossformer -> expanded group (101)

    ONNX cannot describe these shapes symbolically for this graph, so the
    caller supplies the sizes derived from the exported tensor shapes.

    Returns the number of nodes rewritten.
    """
    import onnx
    from onnx import numpy_helper

    model = onnx.load(str(onnx_path))
    graph = model.graph

    replaced = 0
    cache: dict[int, str] = {}
    for node in graph.node:
        if node.op_type != "EyeLike":
            continue
        branch = "intra" if "intra_mossformer" in node.name else "inter"
        size = sizes[branch]
        if size not in cache:
            cache[size] = f"__eyelike_{size}"
            graph.initializer.append(
                numpy_helper.from_array(np.eye(size, dtype=np.bool_), name=cache[size])
            )
        node.op_type = "Identity"
        node.domain = ""
        del node.attribute[:]
        node.input[:] = [cache[size]]
        for vi in list(graph.value_info) + list(graph.output):
            if vi.name in node.output:
                vi.type.tensor_type.elem_type = onnx.TensorProto.BOOL
        replaced += 1

    onnx.checker.check_model(model)
    onnx.save(model, str(onnx_path))
    return replaced


def gan_reference_mag(spectrum: torch.Tensor) -> torch.Tensor:
    """Magnitude exactly as SyncANet computes it internally."""
    return torch.sqrt(spectrum[:, 0:1] ** 2 + spectrum[:, 1:2] ** 2)


def build_16k(clearvoice: Path) -> tuple[nn.Module, int]:
    sys.path.insert(0, str(clearvoice))
    from models.mossformer_gan_se.generator import SyncANet

    # 16 kHz config: fft_len=400 -> 201 frequency bins, 64 channels.
    net = SyncANet(num_channel=64, num_features=201)
    return net, 2


def export(
    clearvoice: Path,
    checkpoint: Path,
    name: str,
    out_dir: Path,
    opset: int = 17,
) -> dict:
    out_dir.mkdir(parents=True, exist_ok=True)
    is_48k = "48k" in name
    builder = build_48k if is_48k else build_16k
    net, in_channels = builder(clearvoice)

    state = load_state_dict(checkpoint)
    # Checkpoints from the 48K and 16K repos wrap the network under a
    # top-level module prefix ("mossformer." for MossFormer2, "model." for GAN).
    for prefix in ("mossformer.", "model."):
        if state and all(k.startswith(prefix) for k in state):
            state = {k[len(prefix):]: v for k, v in state.items()}
            print(f"[{name}] stripped '{prefix}' prefix")
            break
    missing, unexpected = net.load_state_dict(state, strict=False)
    if missing:
        raise SystemExit(f"{name}: missing keys after load: {missing[:5]} ({len(missing)} total)")
    if unexpected:
        print(f"[{name}] ignoring {len(unexpected)} unexpected keys: {unexpected[:3]}")

    net.eval()
    model = (Encoder(net) if is_48k else GanEncoder(net)).eval()

    if is_48k:
        frames = 128                       # ~1 s of 60-dim fbank frames
        dummy = torch.randn(1, in_channels, frames)
        input_names, output_names = ["features"], ["mask"]
        dynamic_axes = {
            "features": {0: "batch", 2: "frames"},
            "mask": {0: "batch", 1: "frames"},
        }
    else:
        # 16 kHz, fft_len=400 -> 201 bins (1001 samples @ hop 100 with center
        # padding). SyncANetBlock builds a fixed n_freqs x n_freqs attention
        # grid, so the frame count MUST equal the bin count: 201 x 201 only.
        frames, bins = 201, 201
        dummy = torch.randn(1, 2, bins, frames)
        dummy_mag = gan_reference_mag(dummy)
        input_names, output_names = ["spectrum", "mag"], ["real", "imag"]
        # No dynamic freq/time axes: the graph is only valid at 201x201.
        dynamic_axes = {
            "spectrum": {0: "batch"},
            "mag": {0: "batch"},
            "real": {0: "batch"},
            "imag": {0: "batch"},
        }

    # NOTE: never run a forward pass before exporting. MossFormer's rotary
    # embedding caches its frequency table on first use, and a pre-export pass
    # freezes the traced frame count into the graph (correct at that length,
    # silently wrong at every other length).
    onnx_path = out_dir / f"{name}.onnx"
    torch.onnx.export(
        model,
        (dummy,) if is_48k else (dummy, dummy_mag),
        str(onnx_path),
        input_names=input_names,
        output_names=output_names,
        dynamic_axes=dynamic_axes,
        opset_version=opset,
        # Constant folding can freeze length-dependent reshapes derived from the
        # traced frame count.
        do_constant_folding=False,
        dynamo=False,
    )

    if not is_48k:
        # Sizes come from the padded attention grid and the expanded group size
        # of SyncANetBlock (emb_ks=2, approx_qk_dim=512, n_freqs=201).
        n = replace_eyelike(onnx_path, {"intra": 201, "inter": 101})
        print(f"[{name}] rewrote {n} EyeLike node(s)")

    import onnxruntime as ort

    sess = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
    probes = (
        [torch.randn(1, in_channels, frames), torch.randn(1, in_channels, frames * 2 + 7)]
        if is_48k
        else [
            torch.randn(1, 2, bins, frames),
        ]
    )
    for probe in probes:
        mag = gan_reference_mag(probe) if not is_48k else None
        with torch.no_grad():
            torch_out = model(probe) if is_48k else model(probe, mag)
        torch_out = torch_out if isinstance(torch_out, tuple) else (torch_out,)
        feeds = {input_names[0]: probe.numpy()}
        if not is_48k:
            feeds["mag"] = mag.numpy()
            # Cross-check exported math against the untouched upstream model.
            with torch.no_grad():
                upstream = net(probe)
            for idx, up in enumerate(upstream):
                diff = float(np.max(np.abs(up.numpy() - torch_out[idx].numpy())))
                print(f"[{name}] upstream parity output {idx}: {diff:.3e}")
                if diff > 1e-4:
                    raise SystemExit(f"{name}: diverges from upstream output {idx}")
        ort_out = sess.run(None, feeds)
        for idx, (ref, got) in enumerate(zip(torch_out, ort_out)):
            ref = ref.numpy()
            if ref.shape != got.shape:
                raise SystemExit(f"{name}: output {idx} shape {ref.shape} != {got.shape}")
            err = float(np.max(np.abs(ref - got)))
            rel = err / (float(np.max(np.abs(ref))) + 1e-9)
            print(
                f"[{name}] {output_names[idx]} frames={probe.shape[-1]} "
                f"shape={got.shape} max_abs_err={err:.3e} rel={rel:.3e}"
            )
            if rel > 1e-4:
                raise SystemExit(f"{name}: ONNX divergence on output {idx} (rel={rel})")

    ort_path = out_dir / f"{name}.ort"
    convert_to_ort(onnx_path, ort_path)

    meta = {
        "name": name,
        "format": "ort",
        "license": "Apache-2.0",
        "opset": opset,
        "input": {"name": input_names[0], "channels": in_channels, "dtype": "float32"},
        "outputs": output_names,
        "hashes": {"onnx": sha256(onnx_path), "ort": sha256(ort_path)},
        "bytes": {"onnx": onnx_path.stat().st_size, "ort": ort_path.stat().st_size},
    }
    (out_dir / f"{name}.json").write_text(json.dumps(meta, indent=2) + "\n")
    print(json.dumps(meta, indent=2))
    return meta


def convert_to_ort(onnx_path: Path, ort_path: Path) -> None:
    """Convert to ORT format with full CPU graph optimization.

    ORT format is what ships to the app: it skips ONNX parsing and
    optimization on device. CPU is the only validated execution provider.
    """
    from onnxruntime.tools.convert_onnx_models_to_ort import (
        OptimizationStyle,
        convert_onnx_models_to_ort,
    )

    convert_onnx_models_to_ort(
        model_path_or_dir=onnx_path,
        output_dir=ort_path.parent,
        optimization_styles=[OptimizationStyle.Fixed],
        target_platform="arm",
        save_optimized_onnx_model=False,
    )
    produced = sorted(ort_path.parent.glob("*.ort"), key=lambda p: p.stat().st_mtime)
    if not produced:
        raise SystemExit("ORT conversion produced no artifact")
    produced[-1].replace(ort_path)


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--clearvoice", type=Path, required=True)
    ap.add_argument("--checkpoint", type=Path, required=True)
    ap.add_argument("--name", required=True)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--opset", type=int, default=17)
    args = ap.parse_args()
    export(args.clearvoice, args.checkpoint, args.name, args.out, args.opset)


if __name__ == "__main__":
    main()