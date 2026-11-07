# Security & privacy

Clai is designed for **one person running it on their own machine**. It has no user
accounts or authentication, so don't expose its ports to a network you don't trust.
It has not had an independent security audit.

## Where your data goes

| Data | Stored | Sent elsewhere? |
|---|---|---|
| Uploaded PDF | `backend/data/files/` | no |
| Text passages, outline | SQLite `backend/data/clai.sqlite3` | no |
| Vectors | Qdrant `backend/data/qdrant/` (or your Qdrant server) | only to the Qdrant server you configure |
| BM25 index | `backend/data/bm25/` | no |
| Questions, answers, summaries | SQLite | no |
| Question + retrieved passages | — | **OpenRouter**, only if `OPENROUTER_API_KEY` is set |
| Call audio | not stored | to your LiveKit server; to **Gradium** only if a Gradium provider is selected |
| Transcripts | in SQLite as conversation messages | no |

By default (no OpenRouter key, local LiveKit, Whisper, Piper), nothing leaves the
machine. Free OpenRouter models may log prompts according to the model provider's
policy; check it before sending sensitive text.

## Controls in place

- **Secrets** live only in `backend/.env` (git-ignored). The browser gets only
  `NEXT_PUBLIC_*` values, which are not secret.
- **LiveKit tokens** are minted server-side, scoped to one new room, and expire after
  15 minutes (`LIVEKIT_TOKEN_TTL_S`).
- **Upload validation:** a magic-byte check, size and page limits, encrypted and
  corrupt files rejected, and server-generated file names (a regex-validated hex ID;
  user filenames are never used as paths).
- **Document isolation:** every retrieval is filtered by `document_id`, a final check
  drops any chunk from another document, and conversations can't be reused across
  documents. All of this is covered by tests.
- **CORS** is limited to `FRONTEND_ORIGIN`, with methods GET, POST and DELETE.
- **Errors:** clients get a code and a message; stack traces stay in the server log.
- **Logging:** IDs, timings and error types. Document text and transcripts aren't logged.
- **Deletion:** `DELETE /documents/{id}` removes the document from every store,
  including its conversations.
- **Dependencies:** pinned lockfiles, Dependabot, and `npm audit` / `pip-audit` in CI.

## Retention

Data stays until you delete it, either one document at a time in the workspace or by
deleting `backend/data/`. There is no automatic expiry.

## Not legal advice

Clai reports what an agreement says and where. It doesn't judge whether terms are
fair or enforceable.
