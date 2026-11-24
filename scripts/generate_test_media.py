#!/usr/bin/env python3
"""Generate small, deterministic media fixtures for manual denoise testing.

No external downloads or TTS engines required. The speech is a synthetic
formant-based signal (voiced harmonics shaped by three formants, with a
syllabic envelope and pauses) which is realistic enough to hear the
DeepFilterNet noise suppressor work on it.

Outputs (into test-media/):
  clean_speech.wav   16-bit mono 48 kHz, ~8 s synthetic "speech"
  noisy_speech.wav   same speech + broadband noise at ~5 dB SNR
  noise_only.wav     just the noise bed
  test_video.mp4     H.264 + AAC, 8 s color-bar clip (video mux testing)

Run:  python3 scripts/generate_test_media.py
Requires numpy (use /tmp/opencode/venv/bin/python if system python lacks it).
"""

from __future__ import annotations

import math
import struct
import subprocess
import wave
from pathlib import Path

import numpy as np

SR = 48_000
DURATION_S = 8.0
OUT = Path(__file__).resolve().parent.parent / "test-media"


def write_wav(path: Path, samples: np.ndarray) -> None:
    pcm = np.clip(samples, -1.0, 1.0)
    data = b"".join(struct.pack("<h", int(x * 32767)) for x in pcm)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data)


def make_speech() -> np.ndarray:
    n = int(SR * DURATION_S)
    t = np.arange(n, dtype=np.float64) / SR

    # Slowly wandering pitch, 95-175 Hz.
    f0 = 130 + 35 * np.sin(2 * np.pi * 0.7 * t) + 10 * np.sin(2 * np.pi * 2.3 * t)
    phase = 2 * np.pi * np.cumsum(f0) / SR

    # Voiced source: harmonics 1..40 with 1/h rolloff.
    voiced = np.zeros(n, dtype=np.float64)
    for h in range(1, 41):
        voiced += (1.0 / h) * np.sin(h * phase)

    # Three moving formants (F1/F2/F3) implemented as damped resonators via
    # a simple sum of band-limited harmonic groups -- cheap and no scipy.
    def formant(center: float, width: float) -> np.ndarray:
        out = np.zeros(n, dtype=np.float64)
        for h in range(1, 41):
            freq = h * 130.0
            weight = np.exp(-(((freq - center) / width) ** 2))
            out += weight * (1.0 / h) * np.sin(h * phase)
        return out

    f1 = formant(500 + 120 * np.sin(2 * np.pi * 0.9 * t), 220)
    f2 = formant(1500 + 350 * np.sin(2 * np.pi * 0.6 * t), 350)
    f3 = formant(2600 + 200 * np.sin(2 * np.pi * 1.1 * t), 500)

    speech = 0.8 * f1 + 0.55 * f2 + 0.3 * f3 + 0.15 * voiced

    # Syllabic envelope: ~4 syllables/sec with short pauses.
    env = 0.5 + 0.5 * np.sin(2 * np.pi * 3.7 * t - np.pi / 2) ** 2
    pause = (np.sin(2 * np.pi * 0.43 * t) > 0.86).astype(np.float64)
    env *= 1.0 - 0.92 * pause
    # Gentle fade in/out.
    fade = np.minimum(1.0, np.minimum(t / 0.15, (DURATION_S - t) / 0.15))
    speech = speech * env * np.clip(fade, 0, 1)

    # Normalize to ~ -3 dBFS peak.
    return speech / (np.max(np.abs(speech)) + 1e-12) * 0.7


def make_noise(n: int) -> np.ndarray:
    rng = np.random.default_rng(20261122)
    white = rng.standard_normal(n)
    # Light low-pass gives pinkish, more phone-like noise.
    # Paul Kellet's economical pink-noise filter.
    pink = np.zeros(n, dtype=np.float64)
    b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0
    for i, x in enumerate(white):
        b0 = 0.99886 * b0 + x * 0.0555179
        b1 = 0.99332 * b1 + x * 0.0750759
        b2 = 0.96900 * b2 + x * 0.1538520
        b3 = 0.86650 * b3 + x * 0.3104856
        b4 = 0.55000 * b4 + x * 0.5329522
        b5 = -0.7616 * b5 - x * 0.0168980
        pink[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + x * 0.5362) * 0.11
        b6 = x * 0.115926
    pink /= np.max(np.abs(pink)) + 1e-12
    return pink * 0.5


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)

    speech = make_speech()
    noise = make_noise(len(speech))

    clean_rms = math.sqrt(np.mean(speech**2))
    noise_rms = math.sqrt(np.mean(noise**2))
    target_noise_rms = clean_rms / math.sqrt(10 ** (5.0 / 10))  # SNR 5 dB
    noise = noise * (target_noise_rms / (noise_rms + 1e-12))

    write_wav(OUT / "clean_speech.wav", speech)
    write_wav(OUT / "noise_only.wav", noise)
    noisy = speech + noise
    noisy /= np.max(np.abs(noisy)) + 1e-12
    noisy *= 0.9
    write_wav(OUT / "noisy_speech.wav", noisy)

    video = OUT / "test_video.mp4"
    subprocess.run(
        [
            "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
            "-f", "lavfi", "-i", "testsrc2=size=1280x720:rate=30:duration=8",
            "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=8",
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "veryfast",
            "-c:a", "aac", "-b:a", "128k", "-shortest", str(video),
        ],
        check=True,
    )

    for p in sorted(OUT.iterdir()):
        print(f"{p.name}: {p.stat().st_size / 1024:.1f} KB")


if __name__ == "__main__":
    main()
