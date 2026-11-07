"""Deterministic query understanding: follow-up resolution, intent classification, query planning."""

from __future__ import annotations

import re

from app.retrieval.lexical import tokenize
from app.schemas import Intent

# Ordered: the first intent whose keywords match wins.
INTENT_KEYWORDS: list[tuple[Intent, tuple[str, ...]]] = [
    ("termination", ("terminat", "cancel", "end the", "notice period", "exit", "quit", "resign", "walk away")),
    (
        "payment",
        (
            "pay",
            "fee",
            "invoice",
            "price",
            "cost",
            "salary",
            "compensat",
            "interest",
            "late",
            "money",
            "rent",
            "deposit",
        ),
    ),
    ("duration", ("term", "how long", "duration", "renew", "expire", "start", "begin", "effective")),
    ("confidentiality", ("confidential", "secret", "disclos", "nda", "privacy")),
    ("liability", ("liab", "damages", "indemn", "cap", "loss", "responsible", "warrant")),
    ("dispute", ("dispute", "court", "governing law", "jurisdiction", "arbitrat", "sue", "lawsuit")),
    ("rights", ("own", "intellectual property", "ip", "rights", "licen", "assign")),
    ("obligations", ("must", "shall", "obligat", "required", "responsib", "deliver", "duties")),
    ("definition", ("what does", "define", "definition", "meaning", "means")),
    ("summary", ("summar", "overview", "key points", "main points", "what is this agreement")),
]

INTENT_EXPANSIONS: dict[str, str] = {
    "termination": "termination terminate notice period written notice end agreement",
    "payment": "fees payment invoice payable amount interest late payment",
    "duration": "term initial term renewal renews expiry effective date",
    "confidentiality": "confidential information confidentiality obligations disclosure survive",
    "liability": "limitation of liability liable damages indemnity cap total liability",
    "dispute": "governing law disputes jurisdiction courts arbitration",
    "rights": "intellectual property ownership rights assignment licence",
    "obligations": "shall obligations perform services deliver",
    "definition": "means definitions defined terms",
    "summary": "agreement parties services term fees termination",
    "general": "",
}

# Corrective retrieval: domain synonyms for terms that commonly differ between how people
# ask and how agreements are written.
SYNONYMS: dict[str, tuple[str, ...]] = {
    "quit": ("terminate", "resign", "notice"),
    "leave": ("terminate", "resignation", "notice"),
    "fire": ("terminate", "dismissal", "for cause"),
    "cancel": ("terminate", "termination"),
    "end": ("terminate", "termination", "expiry"),
    "pay": ("fees", "payment", "invoice"),
    "salary": ("compensation", "remuneration", "fees"),
    "late": ("overdue", "interest", "late payment"),
    "sue": ("dispute", "courts", "jurisdiction"),
    "secret": ("confidential", "confidentiality"),
    "own": ("intellectual property", "rights", "assigned"),
    "cap": ("limitation of liability", "total liability"),
    "renew": ("renewal", "renews automatically", "term"),
    "long": ("term", "duration", "period"),
}

_FOLLOW_UP = re.compile(
    r"^(and|but|also|what about|how about|what if|is that|does that|can they|can it|why|so)\b"
    r"|\b(it|that|this|they|them|those|he|she|the other|same|instead)\b",
    re.IGNORECASE,
)


def is_follow_up(question: str, has_history: bool) -> bool:
    if not has_history:
        return False
    return bool(_FOLLOW_UP.search(question)) or len(tokenize(question)) <= 1


def resolve_question(question: str, history: list[tuple[str, str]]) -> str:
    """Attach the previous question as context when the new one depends on it."""
    question = question.strip()
    if not is_follow_up(question, bool(history)):
        return question
    previous = history[-1][0]
    return f"{question} (follow-up to: {previous})"


def classify_intent(question: str) -> Intent:
    lowered = question.lower()
    for intent, keywords in INTENT_KEYWORDS:
        if any(re.search(rf"\b{re.escape(k)}", lowered) for k in keywords):
            return intent
    return "general"


def plan_queries(resolved: str, intent: Intent) -> list[str]:
    queries = [resolved]
    expansion = INTENT_EXPANSIONS.get(intent, "")
    if expansion:
        queries.append(f"{_strip_follow_up(resolved)} {expansion}")
    return queries


def corrective_queries(resolved: str, intent: Intent) -> list[str]:
    words = re.findall(r"[a-z]+", resolved.lower())
    extra: list[str] = []
    for word in words:
        extra.extend(SYNONYMS.get(word, ()))
    content = " ".join(w for w in words if tokenize(w))
    queries = [f"{content} {' '.join(dict.fromkeys(extra))}".strip()]
    if intent != "general":
        queries.append(INTENT_EXPANSIONS[intent])
    return [q for q in queries if q]


def _strip_follow_up(text: str) -> str:
    return text.replace("(follow-up to:", "").replace(")", "")
