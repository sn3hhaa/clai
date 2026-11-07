# 0002 — Hybrid retrieval with RRF and a cross-encoder

**Status:** accepted · 2026-11-07

## Context
Agreement questions mix paraphrase ("can I quit?") with exact terms ("notice", "INR
1,80,000", defined words). Dense search alone misses exact terms and numbers. BM25
alone misses paraphrase.

## Decision
Dense (MiniLM, 384-d) **and** BM25 for every query variant, fused with **Reciprocal
Rank Fusion** (k = 60, no score calibration), then reranked by a local
**cross-encoder** (`ms-marco-MiniLM-L-6-v2`). After a corrective search, the reranker
takes each passage's best score across the question and the corrective rewrite.

## Consequences
- Tests show both retrievers contributing (e.g. the late-payment clause is found by
  each). Evaluation: hit@5 100%, hit@1 94.7% on the fixture set.
- The cross-encoder runs on CPU. It's small enough for 12 candidates in tens of
  milliseconds once warm.
- The MS MARCO model under-scores paraphrases, which is why the corrective rewrite is
  scored too (see `docs/evaluation.md`).
