"""Answer generation: one structured LLM call over the EvidencePack, or an extractive fallback."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

from app.llm import LLM, LLMUnavailable
from app.retrieval.hybrid import Candidate
from app.retrieval.lexical import tokenize
from app.validation import split_sentences

ABSTAIN_TEXT = "I couldn't find this in the agreement."
ABSTAIN_SPOKEN = "I couldn't find that in this agreement. Try asking about a specific clause or term."

SYSTEM_PROMPT = """You are Clai, an assistant that explains what ONE agreement says.
Rules:
- Use ONLY the numbered sources provided. Never use outside knowledge about law or typical contracts.
- If the sources do not answer the question, set "sufficient" to false and say what is missing.
- Quote exact figures (days, amounts, percentages) as written in the sources.
- Do not give legal advice or opinions about whether terms are fair. Do not add disclaimers.
- "answer": 1-3 plain sentences. "spoken_answer": the same answer in at most 2 short, natural
  sentences for text-to-speech, mentioning the clause number when known, with no brackets or IDs.
- "key_points": up to 3 short factual points from the sources.
- "citations": the source labels (e.g. "S1") that support the answer."""

ANSWER_SCHEMA: dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "required": ["answer", "spoken_answer", "key_points", "citations", "sufficient"],
    "properties": {
        "answer": {"type": "string"},
        "spoken_answer": {"type": "string"},
        "key_points": {"type": "array", "items": {"type": "string"}},
        "citations": {"type": "array", "items": {"type": "string"}},
        "sufficient": {"type": "boolean"},
    },
}


@dataclass
class Draft:
    answer: str
    spoken_answer: str
    key_points: list[str]
    citations: list[str]
    sufficient: bool
    generation: str  # "llm" | "extractive"


def _label(c: Candidate) -> str:
    parts = [f"page {c.chunk.page_number}"]
    if c.chunk.clause:
        parts.append(f"clause {c.chunk.clause}")
    if c.chunk.heading:
        parts.append(c.chunk.heading)
    return ", ".join(parts)


def build_user_prompt(question: str, history: list[tuple[str, str]], evidence: list[Candidate]) -> str:
    lines = []
    if history:
        lines.append("Earlier in this conversation:")
        for q, a in history[-2:]:
            lines.append(f"Q: {q}\nA: {a}")
        lines.append("")
    lines.append("Sources:")
    for i, c in enumerate(evidence, 1):
        lines.append(f"[S{i}] ({_label(c)}) {c.chunk.text}")
    lines.append("")
    lines.append(f"Question: {question}")
    return "\n".join(lines)


def generate_with_llm(llm: LLM, question: str, history: list[tuple[str, str]], evidence: list[Candidate]) -> Draft:
    data = llm.complete_json(SYSTEM_PROMPT, build_user_prompt(question, history, evidence), ANSWER_SCHEMA)
    labels = {f"S{i}": c.chunk.chunk_id for i, c in enumerate(evidence, 1)}
    citations = []
    for raw in data.get("citations", []):
        label = str(raw).strip().strip("[]").upper()
        if label in labels and labels[label] not in citations:
            citations.append(labels[label])
    answer = str(data.get("answer", "")).strip()
    spoken = str(data.get("spoken_answer", "")).strip() or answer
    if not answer:
        raise LLMUnavailable("empty answer")
    # Strip any leaked source labels from text meant for display or speech.
    answer = re.sub(r"\s*\[S\d+\]", "", answer)
    spoken = re.sub(r"\s*\[?S\d+\]?", "", spoken)
    key_points = [str(k).strip() for k in data.get("key_points", []) if str(k).strip()][:3]
    return Draft(answer, spoken, key_points, citations, bool(data.get("sufficient", True)), "llm")


def generate_extractive(question: str, evidence: list[Candidate]) -> Draft:
    """Quote the best-matching sentence(s) of the top passage. Never paraphrases."""
    top = evidence[0]
    terms = set(tokenize(question))
    sentences = split_sentences(top.chunk.text) or [top.chunk.text]
    ranked = sorted(sentences, key=lambda s: len(terms & set(tokenize(s))), reverse=True)
    quote = ranked[0].strip()
    where = f"Clause {top.chunk.clause}" if top.chunk.clause else "The agreement"
    page = f" (page {top.chunk.page_number})"
    answer = f"{where}{page} says: “{quote}”"
    lead = f"According to clause {top.chunk.clause}, " if top.chunk.clause else "The agreement says "
    spoken = lead + quote[0].lower() + quote[1:] if top.chunk.clause else lead + quote
    # Only the quoted, cited text: neighbouring passages were not asked about.
    key_points = [quote]
    return Draft(answer, spoken, key_points[:3], [top.chunk.chunk_id], True, "extractive")
