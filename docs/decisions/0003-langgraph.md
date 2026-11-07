# 0003 — A LangGraph state machine with deterministic nodes

**Status:** accepted · 2026-11-07

## Context
Clai needs inspectable control flow: grade the evidence, retry with a corrective
search, abstain, validate citations. The free LLM tier allows about 50 requests a day.

## Decision
A typed LangGraph `StateGraph` with explicit nodes and one conditional edge
(`grade_evidence` → answer or corrective search, bounded by `AGENT_MAX_RETRIES`). Every
node except `generate_answer` is deterministic code. `generate_answer` makes **at most
one** LLM call and falls back to quoting.

## Consequences
- Behaviour is testable without a network, and the full graph runs in CI.
- The free daily quota covers about 50 questions, not about 300 LLM calls.
- Rule-based intent and synonyms are English-only and need maintenance. That's
  acceptable at this scale and replaceable later.
