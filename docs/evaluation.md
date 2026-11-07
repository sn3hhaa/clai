# Evaluation

`backend/scripts/evaluate.py` runs the labelled questions in
`evaluations/questions.json` against the two fictional fixture agreements and writes
`evaluations/results/latest.json`.

```powershell
cd backend
.venv\Scripts\python -m scripts.evaluate          # extractive: deterministic, no API keys
.venv\Scripts\python -m scripts.evaluate --llm    # uses OPENROUTER_MODEL (spends free quota)
```

## The question set

23 questions: 19 answerable (one is a follow-up in the same conversation) and 4 that
the agreement doesn't answer. Each answerable question names the clause that must be
cited and strings the answer must contain.

## Latest results

Extractive mode, run 2026-11-07 on Windows (Intel i5-14450HX, CPU retrieval), from
`evaluations/results/latest.json`:

| Metric | Value |
|---|---|
| Retrieval hit@1 (expected clause ranked first) | **94.7%** (18/19) |
| Retrieval hit@5 | **100%** |
| Citation accuracy (expected clause cited) | **94.7%** |
| Answer correctness (expected facts in the answer) | **100%** |
| Answerable questions marked grounded | **100%** |
| False abstentions | **0%** |
| Abstention accuracy (unanswerable questions refused) | **100%** (4/4) |
| Latency per question, p50 / p95 | 733 ms / 2,133 ms |

The one miss: "How long is the initial term?" cites clause 3.2 (renewal after the
initial term) instead of 3.1. Both clauses mention "twelve (12) months", and the
reranker scores them the same (0.992).

## Read these numbers carefully

- **The set is small and fictional:** 23 questions over 2 short agreements written for
  testing. That's evidence the pipeline works end to end, not a benchmark.
- **Fixes were developed on this same set.** Two improvements (scoring the corrective
  rewrite when reranking, and quoting short clauses whole) came from misses found
  here. The first run gave hit@1 89.5%, citation accuracy 84.2%, answer correctness
  78.9% and false abstentions 10.5%. Expect lower numbers on new agreements.
- **LLM mode hasn't been measured yet.** It needs an OpenRouter key; run it with `--llm`
  and add the results here.
- Latency is server-side retrieval and answering only. Voice latency is in
  [Voice pipeline](architecture/voice.md#measured-latency).

Adding real-world-style fictional agreements with numbering schemes the current set
doesn't cover is the most useful next step.
