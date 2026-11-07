#!/usr/bin/env bash
# Installs local voice tooling into ./tools (git-ignored). No Docker, no accounts.
#   livekit-server (official binary, checksum-verified) · Piper TTS (GPL-3.0) in its own venv · one voice
set -euo pipefail
LIVEKIT_VERSION="${LIVEKIT_VERSION:-1.13.11}"
VOICE="${VOICE:-en_US-lessac-medium}"
PIPER_VERSION="${PIPER_VERSION:-1.8.0}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TOOLS="$ROOT/tools"; mkdir -p "$TOOLS/livekit"

if [[ "$(uname -s)" == "Darwin" && ! -x "$TOOLS/livekit/livekit-server" ]]; then
  # LiveKit publishes macOS builds through Homebrew, not as release archives.
  command -v brew >/dev/null || { echo "On macOS install Homebrew, then: brew install livekit" >&2; exit 1; }
  brew list livekit >/dev/null 2>&1 || brew install livekit
  ln -sf "$(brew --prefix)/bin/livekit-server" "$TOOLS/livekit/livekit-server"
fi
if [[ ! -x "$TOOLS/livekit/livekit-server" ]]; then
  case "$(uname -s)" in Linux) os=linux ;; *) echo "unsupported OS" >&2; exit 1 ;; esac
  case "$(uname -m)" in x86_64|amd64) arch=amd64 ;; arm64|aarch64) arch=arm64 ;; *) echo "unsupported arch" >&2; exit 1 ;; esac
  name="livekit_${LIVEKIT_VERSION}_${os}_${arch}.tar.gz"
  base="https://github.com/livekit/livekit/releases/download/v${LIVEKIT_VERSION}"
  curl -fsSL -o "$TOOLS/$name" "$base/$name"
  expected=$(curl -fsSL "$base/checksums.txt" | awk -v n="$name" '$2==n {print $1}')
  actual=$( (command -v sha256sum >/dev/null && sha256sum "$TOOLS/$name" || shasum -a 256 "$TOOLS/$name") | awk '{print $1}')
  [[ -n "$expected" && "$expected" == "$actual" ]] || { rm -f "$TOOLS/$name"; echo "checksum mismatch for $name" >&2; exit 1; }
  echo "checksum OK ($actual)"
  tar -xzf "$TOOLS/$name" -C "$TOOLS/livekit" && rm "$TOOLS/$name"
fi
"$TOOLS/livekit/livekit-server" --version

if [[ ! -x "$TOOLS/piper/.venv/bin/python" ]]; then
  uv venv "$TOOLS/piper/.venv" --python 3.12
  uv pip install --python "$TOOLS/piper/.venv/bin/python" "piper-tts[http]==${PIPER_VERSION}"
fi
mkdir -p "$TOOLS/piper/voices"
[[ -f "$TOOLS/piper/voices/$VOICE.onnx" ]] || "$TOOLS/piper/.venv/bin/python" -m piper.download_voices --data-dir "$TOOLS/piper/voices" "$VOICE"
echo "Voice tools ready in $TOOLS"
