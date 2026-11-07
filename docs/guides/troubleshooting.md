# Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `/talk` says it can't reach the backend | The API isn't running, or `NEXT_PUBLIC_API_BASE_URL` is wrong. Check <http://127.0.0.1:8000/health>. |
| Upload fails with `scanned_pdf` | The PDF has no selectable text. OCR isn't supported yet. |
| Upload fails with a CORS error | Add your frontend origin to `FRONTEND_ORIGIN` in `backend/.env`. |
| *Waiting for Clai to join…* never ends | The voice worker isn't running or isn't registered. Look for `registered worker` in `logs/voice-worker.log`. Check `LIVEKIT_URL`, key and secret match the server. |
| Microphone blocked | Allow it in the browser's site settings and start the call again. |
| Clai answers a different question, or "I only caught …" | Speech-to-text received only part of what you said, usually because the CPU was overloaded (e.g. the Next.js dev server compiling a page for the first time). Ask again once things settle; use a GPU for Whisper if you have one. |
| Long pause before Clai speaks | Whisper on CPU takes about as long as the audio itself. With an NVIDIA GPU, `setup` installs CUDA wheels and `WHISPER_DEVICE=auto` uses them (≈ 0.15 s). |
| Your first words are ignored | LiveKit ignores user audio for the first 3 s of agent speech (echo-cancellation warm-up). Wait for the greeting to finish. |
| Answers are quotes, not written answers | No `OPENROUTER_API_KEY`, or the free daily limit was reached. This is the intended fallback. |
| Qdrant "already accessed by another instance" | Local mode allows one process. Only the API should open it; stop extra API processes. |
| Piper isn't speaking | Check <http://127.0.0.1:5000/voices> and that `tools/piper/voices/en_US-lessac-medium.onnx` exists. Re-run `scripts/install-voice-tools`. |
| Windows: `Set-Content` broke a config file | PowerShell 5.1 writes a UTF-8 BOM. Edit files with an editor, or strip it: `sed -i '1s/^\xEF\xBB\xBF//' file`. |
