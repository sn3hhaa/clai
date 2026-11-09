"""Encode the raw walkthrough recording into web formats and a poster frame.

    uv run --no-project --with imageio-ffmpeg python scripts/encode-media.py

Uses the static ffmpeg build bundled with imageio-ffmpeg (no system install needed).
"""

import json
import subprocess
from pathlib import Path

import imageio_ffmpeg

MEDIA = Path(__file__).resolve().parent.parent / "public" / "media"
raw = MEDIA / "walkthrough-raw.webm"
ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
cues = json.loads((MEDIA / "walkthrough-cues.json").read_text())
poster_at = next(c["at"] for c in cues if "highlighted" in c["text"]) + 1.8


def run(*args: str) -> None:
    subprocess.run([ffmpeg, "-y", "-loglevel", "error", *args], check=True)


# H.264 MP4 (Safari and everything else) and VP9 WebM; 1280 wide is plenty for the frame size used.
run("-i", str(raw), "-vf", "scale=1280:-2,fps=30", "-c:v", "libx264", "-preset", "slow", "-crf", "26",
    "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", str(MEDIA / "walkthrough.mp4"))
run("-i", str(raw), "-vf", "scale=1280:-2,fps=30", "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "38",
    "-row-mt", "1", "-an", str(MEDIA / "walkthrough.webm"))
run("-ss", f"{poster_at:.2f}", "-i", str(raw), "-frames:v", "1", "-vf", "scale=1600:-2", "-q:v", "3",
    str(MEDIA / "walkthrough-poster.jpg"))
raw.unlink()
(MEDIA / "walkthrough-cues.json").unlink()
for f in sorted(MEDIA.glob("walkthrough*")):
    print(f.name, f.stat().st_size // 1024, "KB")
