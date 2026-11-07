# Clai — Product Requirements

**Clai — Voice-First Agreement Intelligence**
*Talk to your agreements. Understand what matters.*

## Problem

Agreements (offer letters, NDAs, leases, SaaS terms, freelance contracts) are long,
dense and written for lawyers. People sign them without understanding the clauses
that matter: notice periods, termination rights, payment terms, liability caps,
non-competes, renewals. Searching a PDF for "terminate" finds words, not answers,
and generic chatbots answer confidently without showing where the answer came from.

## Product

Clai lets a person upload an agreement and *talk to it*. They ask questions by voice
(primary) or text. Clai answers briefly and naturally, and every answer comes with
the exact passages it relied on: page, section and clause. Those passages can be
opened in the original PDF.

Clai is **not legal advice** and is not a general chatbot. It answers only from the
uploaded agreement and says so when the agreement doesn't contain the answer.

## Users

- Individuals reviewing employment, rental or freelance agreements.
- Founders and operators reviewing vendor, SaaS, NDA and consulting agreements.
- Engineers evaluating grounded voice-RAG architecture (the repo is a reference).

## Supported documents

Text-based PDF agreements: employment contracts, offer letters, freelance, NDA, SaaS,
vendor, consulting, rental, partnership, licensing, service and software-development
agreements. **Scanned (image-only) PDFs are rejected with a clear message. OCR is not
implemented.** Encrypted PDFs are rejected.

## Core user flow

1. Open Clai and go to **Talk to Clai** (`/talk`).
2. Upload a PDF (drag-and-drop or picker). It's validated, then processed: parsing,
   structure, chunking, embedding, indexing. Progress is visible.
3. The PDF renders in the Agreement panel with page, section and clause navigation.
4. Start a voice session. The browser asks for microphone permission.
5. Ask a question aloud. Clai transcribes it, reasons over the agreement, and speaks a
   concise answer.
6. The Evidence panel shows the answer, supporting passages, page/section/clause, and
   whether the evidence was sufficient. Clicking a source jumps the PDF to that page.
7. Ask follow-ups. Context such as "what about the other party?" carries over within
   the same agreement.
8. Mute or unmute at any time. Interrupt Clai by speaking (barge-in).
9. End the call and see a summary: questions asked, key points, sources, transcript,
   and unresolved questions.

Text questions use the same reasoning engine and the same evidence panel.

## Functional requirements

| ID | Requirement |
|---|---|
| F1 | Upload a PDF up to a configurable size limit (default 20 MB, 300 pages) |
| F2 | Reject invalid, empty, encrypted and image-only PDFs with specific errors |
| F3 | Extract pages, headings, sections and numbered clauses with provenance |
| F4 | Hybrid retrieval: dense vectors (Qdrant) + BM25, fused with RRF, cross-encoder rerank |
| F5 | Retrieval is always scoped to one document; no cross-document leakage |
| F6 | LangGraph agent with evidence grading and bounded corrective retrieval |
| F7 | Answers cite chunk IDs; citations are validated against retrieved evidence |
| F8 | Abstain when evidence is insufficient |
| F9 | Real-time voice: mic → STT → agent → TTS → speaker over LiveKit |
| F10 | Turn detection, silence handling, barge-in, mute, reconnect, clean end |
| F11 | Conversation history and session summaries persisted in SQLite |
| F12 | Delete a document everywhere: metadata, vectors, lexical index, file |
| F13 | Premium public website with original branding, deployed to GitHub Pages |

## Non-functional requirements

- **₹0 budget.** Free tiers or local models only, and never a paid plan.
- **No Docker.** Everything runs natively on Windows, macOS and Linux.
- Provider keys stay server-side.
- Graceful degradation: no LLM key means extractive answers; no Gradium means local
  faster-whisper and Piper.
- Accessible (keyboard, contrast, reduced motion) and responsive down to 360 px.

## Out of scope

Login, signup, a blog, multi-user accounts, OCR, legal advice, editing or redlining,
DOCX input.

## Success criteria (acceptance)

Using the fictional fixture agreement containing *"Either party may terminate this
agreement with 30 days' written notice."*, a person speaks "What is the termination
notice period?" and hears an answer stating 30 days. The evidence panel cites the
correct page and clause, and a follow-up question works in context.
