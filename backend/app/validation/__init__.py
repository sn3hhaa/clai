"""Deterministic claim extraction and citation validation.

A claim is supported when (a) every number it states appears in its cited evidence and
(b) enough of its content terms appear in that evidence. Citations to chunks outside the
EvidencePack are dropped. No LLM is used here, so validation is reproducible.
"""

from __future__ import annotations

import re

from app.retrieval.lexical import tokenize
from app.schemas import Claim, Grounding

SUPPORT_THRESHOLD = 0.5
_NUMBER = re.compile(r"\d+(?:[.,]\d+)*")
_WORD_NUMBERS = {
    "one": "1", "two": "2", "three": "3", "four": "4", "five": "5", "six": "6", "seven": "7",
    "eight": "8", "nine": "9", "ten": "10", "twelve": "12", "fifteen": "15", "thirty": "30",
    "sixty": "60", "ninety": "90",
}  # fmt: skip
_CLAUSE_REF = re.compile(r"\b(clause|section|article|page)\s+[\w.()]+", re.IGNORECASE)


def split_sentences(text: str) -> list[str]:
    parts = re.split(r"(?<=[.!?])\s+(?=[A-Z\"'(])", text.strip())
    return [p.strip() for p in parts if len(p.strip()) > 2]


def _numbers(text: str) -> set[str]:
    found = {n.replace(",", "") for n in _NUMBER.findall(text)}
    found |= {v for w, v in _WORD_NUMBERS.items() if re.search(rf"\b{w}\b", text, re.IGNORECASE)}
    return found


def support(claim: str, evidence_text: str) -> float:
    # References like "clause 8.1" or "page 2" are provenance, not substantive claims.
    stripped = _CLAUSE_REF.sub(" ", claim)
    numbers = _numbers(stripped)
    if numbers and not numbers <= _numbers(evidence_text):
        return 0.0
    terms = set(tokenize(stripped))
    if not terms:
        return 1.0
    evidence_terms = set(tokenize(evidence_text))
    return len(terms & evidence_terms) / len(terms)


def extract_claims(answer: str, citations: list[str]) -> list[tuple[str, list[str]]]:
    return [(sentence, list(citations)) for sentence in split_sentences(answer)]


def validate(
    claims: list[tuple[str, list[str]]], evidence_text: dict[str, str]
) -> tuple[list[Claim], list[str], Grounding]:
    """Return validated claims, the surviving citations and the overall grounding label."""
    validated: list[Claim] = []
    used: list[str] = []
    for text, cited in claims:
        valid_ids = [cid for cid in cited if cid in evidence_text]
        joined = " ".join(evidence_text[cid] for cid in valid_ids)
        score = support(text, joined) if valid_ids else 0.0
        supported = score >= SUPPORT_THRESHOLD
        validated.append(Claim(text=text, chunk_ids=valid_ids, supported=supported, support_score=round(score, 3)))
        if supported:
            used.extend(cid for cid in valid_ids if cid not in used)

    if not validated or not used:
        return validated, used, "insufficient"
    if all(c.supported for c in validated):
        return validated, used, "grounded"
    return validated, used, "partially_grounded"
