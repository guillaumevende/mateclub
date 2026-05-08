#!/usr/bin/env python3
from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


NORMALIZE_FILTER = (
    "highpass=f=70,"
    "acompressor=threshold=-20dB:ratio=3:attack=5:release=120:makeup=2,"
    "loudnorm=I=-16:TP=-1.5:LRA=10"
)


def run(command: list[str]) -> None:
    subprocess.run(command, check=True)


def ensure_binary(name: str) -> str:
    resolved = shutil.which(name)
    if not resolved:
        raise SystemExit(f"Binaire requis introuvable: {name}")
    return resolved


def process_audio(input_path: Path, output_path: Path) -> None:
    ffmpeg_bin = ensure_binary("ffmpeg")
    dfm_bin = ensure_binary("dfm")

    output_path.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="mateclub-audio-") as temp_dir:
        temp_dir_path = Path(temp_dir)
        source_wav = temp_dir_path / "source.wav"
        enhanced_wav = temp_dir_path / "enhanced.wav"

        run(
            [
                ffmpeg_bin,
                "-y",
                "-hide_banner",
                "-loglevel",
                "error",
                "-i",
                str(input_path),
                "-vn",
                "-ar",
                "48000",
                "-ac",
                "1",
                "-c:a",
                "pcm_s16le",
                str(source_wav),
            ]
        )

        run([dfm_bin, str(source_wav), "-o", str(enhanced_wav), "-q"])

        run(
            [
                ffmpeg_bin,
                "-y",
                "-hide_banner",
                "-loglevel",
                "error",
                "-i",
                str(enhanced_wav),
                "-vn",
                "-af",
                NORMALIZE_FILTER,
                "-ar",
                "48000",
                "-ac",
                "1",
                "-c:a",
                "aac",
                "-b:a",
                "128k",
                "-movflags",
                "+faststart",
                str(output_path),
            ]
        )


def main() -> int:
    parser = argparse.ArgumentParser(description="Nettoie et normalise une capsule audio Maté Club")
    parser.add_argument("--input", required=True, help="Chemin du fichier audio source")
    parser.add_argument("--output", required=True, help="Chemin du fichier audio traité")
    args = parser.parse_args()

    input_path = Path(args.input).expanduser().resolve()
    output_path = Path(args.output).expanduser().resolve()

    if not input_path.exists():
        raise SystemExit(f"Fichier source introuvable: {input_path}")

    process_audio(input_path, output_path)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except subprocess.CalledProcessError as error:
        print(f"[mateclub-audio] commande échouée: {error}", file=sys.stderr)
        raise SystemExit(1)
