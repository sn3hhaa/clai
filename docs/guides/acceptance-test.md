# Voice acceptance test (manual, real microphone)

The automated checks (`backend/scripts/voice_smoke.py` and
`frontend/scripts/voice-browser-check.mjs`) send synthesised speech through the real
pipeline. They don't prove that **your** microphone, speakers and browser work. That
takes a person. Voice is only marked *Verified* in `TASKS.md` after this test passes.

## Setup

1. `.\scripts\dev.ps1` (or `./scripts/dev.sh`) and wait for all five services.
2. Open <http://localhost:3000/talk> in Chrome or Edge, with headphones if you have them.

## Steps

| # | Do | Pass when |
|---|---|---|
| 1 | Click **Try a fictional sample** | "2 pages · 23 passages" appears, the PDF renders |
| 2 | Click **Start call**, allow the microphone | the Aura moves from *Connecting* to *Speaking*; you hear the greeting |
| 3 | After the greeting, say: **"What is the termination notice period?"** | your words appear in the transcript |
| 4 | Listen | Clai says the notice is **30 days** (clause 8.1) out loud |
| 5 | Look at the Evidence panel | *Clause 8.1 · p. 2* is cited and marked **grounded**; the PDF shows page 2 with the clause highlighted |
| 6 | Watch the Aura while you speak and while Clai speaks | it reacts to your voice, then to Clai's |
| 7 | Say: **"And what if the other party breaches it?"** | the answer cites clause 8.2 (**10 days** to remedy) |
| 8 | While Clai is talking, start speaking | Clai stops and listens (barge-in) |
| 9 | Click the mic button | it shows *Microphone muted*; speaking does nothing |
| 10 | Click **End call** | the session summary lists both questions and the sources |

## Record the result

Add a row to the table below and update `TASKS.md`.

| Date | Tester | Browser / OS | Mic & speakers | Result | Notes |
|---|---|---|---|---|---|
| — | — | — | — | not yet run | |
