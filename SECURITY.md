# Security policy

## Reporting a vulnerability

Please **don't open a public issue** for security problems. Report them privately
through GitHub's private vulnerability reporting:
<https://github.com/sn3hhaa/clai/security/advisories/new>.

Include what you found, how to reproduce it, and the impact you expect. You'll get an
acknowledgement, and a fix or mitigation plan once the report has been triaged. This is
a volunteer project, so there is no guaranteed response time.

## Supported versions

Only the latest commit on `main` is supported.

## Scope and design notes

Clai is built to run **locally for one user**. It has no authentication, so don't
expose the API (`:8000`) or LiveKit (`:7880`) to a network you don't trust. The data
handling is documented in [docs/security.md](docs/security.md):

- Provider keys live only in `backend/.env` (git-ignored) and never reach the browser.
- LiveKit tokens are minted server-side with a 15-minute TTL.
- Uploaded PDFs, the SQLite database, vectors and BM25 indexes stay on your machine
  under `backend/data/`. Deleting a document removes it from every store.
- With an OpenRouter key, the question and the retrieved passages are sent to
  OpenRouter. With Gradium configured, call audio is sent to Gradium. Neither happens
  by default.
- Logs contain IDs and timings, not document text or transcripts.

Clai has not had an independent security audit.
