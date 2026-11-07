# Deployment

## What runs where

| Part | Where | Cost |
|---|---|---|
| Website + docs | GitHub Pages, `https://sn3hhaa.github.io/clai/` (built by `.github/workflows/pages.yml`) | free |
| Interactive app (`/talk`) | the same static build, talking to a backend you run | free |
| API, Qdrant, SQLite | your machine | free |
| Voice worker | your machine | free |
| LiveKit | local `livekit-server`, or the LiveKit Cloud Build plan | free (Cloud has hard monthly caps) |

## Why there's no hosted backend

Free hosting checked on 2026-11-07:

- **GitHub Pages** serves static files only.
- **Hugging Face Spaces** now requires a paid plan for anything but static Spaces.
- **Koyeb** no longer lists free compute.
- **Fly.io** offers only a short trial.
- **Render's** free web service has 512 MB of RAM and sleeps when idle. That's too
  small for the embedding model, cross-encoder and Whisper, let alone a voice worker
  that must stay connected.

So the honest setup is: **the public site is static, and the full app runs locally.**
The hosted `/talk` page checks for a backend and says so when none is reachable.

## The Pages build

```bash
cd frontend
STATIC_EXPORT=true NEXT_PUBLIC_BASE_PATH=/clai npm run export:pages
```

This builds a static export with `trailingSlash`, unoptimised images and the `/clai`
base path. It then runs `scripts/flatten-rsc-payloads.mjs`: this Next.js version writes
segment payloads nested, while the router requests flat names, so a static host would
otherwise return 404 on client navigation. Finally it writes `.nojekyll`. The docs are
built with MkDocs into `out/docs`.

Check the export locally the way Pages serves it:

```bash
node scripts/serve-static.mjs 4173 /clai &
node scripts/check-static.mjs http://localhost:4173/clai
```

## Enabling Pages on the repository

In GitHub, go to **Settings → Pages → Build and deployment → Source: GitHub Actions**.
After that, every push to `main` deploys.

## Using the hosted `/talk` with your local backend

Add `https://sn3hhaa.github.io` to `FRONTEND_ORIGIN` in `backend/.env`. Browsers may
still block a public HTTPS page from calling `http://127.0.0.1` (private network access
rules), so the reliable way to use the app is <http://localhost:3000/talk>.
