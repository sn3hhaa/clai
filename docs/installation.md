# Installation

Clai runs natively on Windows, Linux and macOS. **Docker is not used.**

## Requirements

| Tool | Version | Notes |
|---|---|---|
| Git | any recent | |
| [uv](https://docs.astral.sh/uv/) | 0.5+ | installs Python 3.12 and the pinned dependencies |
| Node.js | 20+ (22 LTS recommended) | frontend |
| Chrome, Edge or Firefox | current | the voice call needs microphone access |
| NVIDIA GPU | optional | speeds up speech-to-text (CUDA wheels from PyPI, no toolkit install) |

About 6 GB of disk space covers dependencies, local models and voice tools.

## One-command setup

=== "Windows (PowerShell)"

    ```powershell
    git clone https://github.com/sn3hhaa/clai.git
    cd clai
    .\scripts\setup.ps1          # add -NoVoice to skip LiveKit/Piper, -NoGpu to skip CUDA wheels
    ```

=== "macOS / Linux"

    ```bash
    git clone https://github.com/sn3hhaa/clai.git
    cd clai
    ./scripts/setup.sh           # --no-voice to skip LiveKit/Piper
    ```

`setup` does the following:

1. Creates `backend/.venv` with Python 3.12 and installs `backend/requirements-dev.txt`
   (exact pins), plus the CUDA runtime wheels when an NVIDIA GPU is present.
2. Copies `backend/.env.example` to `backend/.env` and `frontend/.env.example` to
   `frontend/.env.local` if they don't exist.
3. Downloads the local models: MiniLM embeddings, the MS MARCO cross-encoder,
   Whisper `base.en`, the Silero VAD and the turn detector.
4. Runs `npm ci` in `frontend/`.
5. Installs the voice tools into `tools/` (git-ignored):
    - **livekit-server** 1.13.11, checksum-verified. On macOS it comes from Homebrew.
    - **Piper** 1.8.0 in its own virtual environment, with the `en_US-lessac-medium` voice.

## Run it

```powershell
.\scripts\dev.ps1     # or ./scripts/dev.sh
```

Then open <http://localhost:3000/talk>. The services are:

| Service | Address |
|---|---|
| Frontend | <http://localhost:3000> |
| API and OpenAPI docs | <http://127.0.0.1:8000/docs> |
| LiveKit (dev mode) | `ws://127.0.0.1:7880` (key `devkey`, secret `secret`) |
| Piper TTS | <http://127.0.0.1:5000> |
| Voice worker | connects to LiveKit; logs in `logs/voice-worker.log` |

Text questions work without the voice services: `dev.ps1 -NoVoice`.

## Optional: an LLM for written answers

Without a key, Clai answers by **quoting** the most relevant clause. To have a model
write short answers from the retrieved passages, create a free key at
<https://openrouter.ai> and add it to `backend/.env`:

```env
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=nvidia/nemotron-3.5-super-vl:free
```

Free models are limited to 20 requests a minute and 50 a day unless you've bought
credits. When the limit is reached, Clai falls back to quoting.
