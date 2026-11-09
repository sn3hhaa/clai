# Website audit (2026-11-09)

An audit of https://sn3hhaa.github.io/clai/ and the repository before the dark
redesign. Written to decide what to keep, change and remove.

## What actually works

| Area | Status |
|---|---|
| Backend (FastAPI): ingestion, hybrid retrieval, LangGraph agent, API | Works locally; 53 tests; CI green |
| Voice agent (LiveKit, Whisper, Piper) | Works locally; automated checks pass; real-mic test not yet recorded |
| `/talk` workspace | Works **only with a local backend** |
| Public `/talk` on GitHub Pages | **Dead end.** It explains the backend isn't running; visitors can't do anything |
| Homepage, `/technology` | Static and correct, but developer-centric |
| MkDocs docs at `/clai/docs/` | Builds, but visually separate from the product and written for developers |
| Static export, base path, RSC flattening, pdf.js worker | Works; crawl passes |

## What should remain

- The full backend and voice stack. It's real, tested engineering, so it stays in the
  repo and becomes an optional "full engine" that `/talk` uses when one is reachable.
- The pdf.js viewer with evidence highlighting.
- The evaluation set, as a benchmark for the new browser engine too.
- The static-export pipeline (base path, flattening, worker copy, crawler).
- Honesty rules: demonstrations are labelled, and no fake stats.

## What should change

| Problem | Change |
|---|---|
| The public product can't be used without installing Python | A **browser engine**: PDF parsing, clause detection, search and evidence-first answers in the browser |
| Voice needs LiveKit and a worker | Browser voice via the Web Speech API where supported, with honest fallbacks. LiveKit voice stays for the full engine |
| Light sort.to-style design, too close to the reference and too sparse | An **original dark editorial identity** |
| Logo (ring + square) is generic | New mark and wordmark |
| `/talk` opens on three dense panels | **Progressive** workspace: upload, then conversation, with document and evidence as a contextual panel or drawer |
| Copy leads with FastAPI, Qdrant, BM25, LangGraph | Customer pages talk about outcomes; stack details move to `/technology` and the technical reference |
| Docs live outside the product (MkDocs, GitHub) | Customer docs **on the site** at `/docs/*`; MkDocs stays as the developer reference |
| Only three routes | Product, how it works, about, contact, privacy, terms, docs and a real 404 |
| No product demonstration | A recorded walkthrough of the real browser app with a fictional agreement |

## What should be removed

- Customer-facing setup instructions (clone, Python, start FastAPI) outside the
  technical docs.
- The "₹0" pricing block, which reads like a portfolio note, not product copy.
- The 3×2 icon grid and repeated card sections.

## Accessibility notes

- Contrast was fine on light; it has to be re-checked on dark (muted text especially).
- The Aura canvas has an accessible label and a reduced-motion path. Keep that.
- Mobile `/talk` used tabs. Replace with a single conversation view and a drawer.

## Hosting limits (unchanged)

GitHub Pages serves static files. It can't run Python, models, a vector database or a
LiveKit worker. Everything the public site offers must run in the browser, and
anything else must be presented as requiring separate infrastructure.

## Recommended architecture

```
Public site (GitHub Pages)
├── marketing + on-site docs (static)
└── /talk
    ├── browser engine (default): pdf.js → clauses → chunks → BM25 + intent expansion
    │   → evidence grading → extractive answer with citations; Web Speech for voice
    └── full engine (if a Clai backend is reachable): existing API + LiveKit voice
```
