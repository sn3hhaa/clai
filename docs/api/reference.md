# API reference

Base URL: `http://127.0.0.1:8000`. The interactive OpenAPI docs are at `/docs` and the
schema is at `/openapi.json`, generated from the Pydantic models in
`backend/app/schemas`. The TypeScript mirror is `frontend/lib/api/types.ts`.

All errors share one shape:

```json
{ "error": { "code": "not_a_pdf", "message": "This file is not a PDF." } }
```

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | status, version, LLM model, Qdrant mode, speech providers |
| `POST` | `/documents` | upload a PDF (`multipart/form-data`, field `file`); returns the processed document |
| `GET` | `/documents` | list documents |
| `GET` | `/documents/{id}` | one document with its outline |
| `GET` | `/documents/{id}/file` | the original PDF |
| `DELETE` | `/documents/{id}` | delete from SQLite, Qdrant, BM25 and disk (`204`) |
| `POST` | `/query` | ask a question |
| `POST` | `/conversations` | start a conversation for a document |
| `GET` | `/conversations/{id}` | messages so far |
| `POST` | `/conversations/{id}/end` | end it and return the session summary |
| `GET` | `/conversations/{id}/summary` | the summary without ending |
| `POST` | `/voice/token` | LiveKit token that also dispatches the voice agent |

## `POST /query`

```json
{ "document_id": "…", "question": "What is the termination notice period?", "conversation_id": null, "channel": "text" }
```

Pass the returned `conversation_id` on later calls so follow-ups keep their context. A
conversation belongs to one document; using it with another document returns `404`.

Response (abridged):

```json
{
  "conversation_id": "…", "message_id": "…",
  "question": "What is the termination notice period?",
  "resolved_question": "What is the termination notice period?",
  "intent": "termination",
  "answer": "Clause 8.1 (page 2) says: “Either party may terminate this agreement with 30 days' written notice.”",
  "spoken_answer": "According to clause 8.1, either party may terminate this agreement with 30 days' written notice.",
  "key_points": ["Either party may terminate this agreement with 30 days' written notice."],
  "citations": ["…-c0017"],
  "evidence": [{ "chunk_id": "…-c0017", "page_number": 2, "page_end": 2, "section": "8. Termination",
                 "clause": "8.1", "heading": "Termination for convenience", "text": "…", "score": 0.974, "cited": true }],
  "claims": [{ "text": "…", "chunk_ids": ["…-c0017"], "supported": true, "support_score": 1.0 }],
  "grounding": "grounded", "sufficient": true, "generation": "extractive",
  "retrieval_rounds": 1, "timings_ms": { "retrieve": 61.2, "rerank": 38.0, "total": 112.4 }
}
```

## Error codes

| Code | HTTP | When |
|---|---|---|
| `empty_file`, `not_a_pdf`, `corrupt_pdf`, `encrypted_pdf`, `empty_pdf`, `too_many_pages`, `scanned_pdf`, `no_text` | 422 | upload rejected, with a reason |
| `file_too_large` | 413 | over `MAX_UPLOAD_MB` |
| `not_found` | 404 | unknown document or conversation, or a conversation used with the wrong document |
| `document_not_ready` | 409 | document failed processing |
| `validation_error` | 422 | malformed request body |
| `voice_not_configured` | 503 | LiveKit settings missing |
| `internal_error` | 500 | unexpected; details only in server logs |

## Voice token

`POST /voice/token {"document_id": "…", "conversation_id": null}` returns
`server_url`, `participant_token`, `room_name`, `conversation_id` and `expires_in`
(seconds). The JWT grants join/publish/subscribe for one new room and carries a room
configuration that dispatches agent `clai-voice` with
`{"document_id", "conversation_id"}` as metadata. The API key and secret never leave
the server.
