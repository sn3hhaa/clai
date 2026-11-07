"""The Clai LangGraph agent.

START â†’ understand_query â†’ classify_intent â†’ plan_investigation â†’ retrieve â†’ rerank â†’ grade_evidence
  â”œâ”€ sufficient â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â†’ generate_answer
  â”œâ”€ insufficient, retries left â†’ corrective_search â†’ retrieve â†’ â€¦ â†’ grade_evidence
  â””â”€ insufficient, no retries â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â†’ generate_answer (abstains)
generate_answer â†’ extract_claims â†’ validate_citations â†’ END

Only generate_answer may call the LLM (at most once per question).
"""

from __future__ import annotations

import logging
import time
from collections.abc import Callable
from typing import Any, TypedDict

from langgraph.graph import END, START, StateGraph

from app.agent import query as q
from app.agent.answer import ABSTAIN_SPOKEN, ABSTAIN_TEXT, Draft, generate_extractive, generate_with_llm
from app.llm import LLM, LLMUnavailable
from app.retrieval.hybrid import Candidate, HybridRetriever
from app.retrieval.lexical import tokenize
from app.schemas import Claim, Grounding, Intent
from app.validation import extract_claims, validate

log = logging.getLogger("clai.agent")

# Evidence grading thresholds on the cross-encoder probability (see docs/architecture/agent.md).
STRONG_EVIDENCE = 0.5
WEAK_EVIDENCE = 0.1
MIN_TERM_OVERLAP = 0.5


class AgentState(TypedDict, total=False):
    document_id: str
    question: str
    history: list[tuple[str, str]]
    resolved_question: str
    intent: Intent
    queries: list[str]
    candidates: list[Candidate]
    evidence: list[Candidate]
    sufficient: bool
    grade_reason: str
    retries: int
    rounds: int
    draft: Draft
    raw_claims: list[tuple[str, list[str]]]
    claims: list[Claim]
    citations: list[str]
    grounding: Grounding
    timings_ms: dict[str, float]


def _timed(name: str, fn: Callable[[AgentState], dict[str, Any]]) -> Callable[[AgentState], dict[str, Any]]:
    def wrapper(state: AgentState) -> dict[str, Any]:
        started = time.perf_counter()
        update = fn(state)
        timings = dict(state.get("timings_ms", {}))
        timings[name] = round(timings.get(name, 0.0) + (time.perf_counter() - started) * 1000, 1)
        update["timings_ms"] = timings
        return update

    return wrapper


def grade(question: str, evidence: list[Candidate]) -> tuple[bool, str]:
    if not evidence:
        return False, "no passages retrieved"
    top = evidence[0]
    if top.score >= STRONG_EVIDENCE:
        return True, f"top passage relevance {top.score:.2f}"
    terms = set(tokenize(question))
    overlap = len(terms & set(tokenize(top.chunk.text + " " + (top.chunk.heading or "")))) / max(len(terms), 1)
    if top.score >= WEAK_EVIDENCE and overlap >= MIN_TERM_OVERLAP:
        return True, f"moderate relevance {top.score:.2f} with {overlap:.0%} term overlap"
    return False, f"top relevance {top.score:.2f}, term overlap {overlap:.0%}"


def build_graph(retriever: HybridRetriever, llm: LLM | None, *, top_n: int = 5, max_retries: int = 1) -> Any:
    def understand_query(state: AgentState) -> dict[str, Any]:
        return {
            "resolved_question": q.resolve_question(state["question"], state.get("history", [])),
            "retries": 0,
            "rounds": 0,
        }

    def classify_intent(state: AgentState) -> dict[str, Any]:
        return {"intent": q.classify_intent(state["resolved_question"])}

    def plan_investigation(state: AgentState) -> dict[str, Any]:
        return {"queries": q.plan_queries(state["resolved_question"], state["intent"])}

    def retrieve(state: AgentState) -> dict[str, Any]:
        found = retriever.retrieve(state["document_id"], state["queries"])
        # Keep candidates from earlier rounds so corrective search only adds information.
        seen = {c.chunk.chunk_id for c in found}
        merged = found + [c for c in state.get("candidates", []) if c.chunk.chunk_id not in seen]
        return {"candidates": merged, "rounds": state.get("rounds", 0) + 1}

    def rerank(state: AgentState) -> dict[str, Any]:
        # After a corrective search, also score against its first rewrite (the question's own words
        # plus agreement synonyms). The broader intent expansion is deliberately not used here.
        alternatives = state["queries"][:1] if state.get("retries", 0) > 0 else None
        return {
            "evidence": retriever.rerank(
                state["resolved_question"], state["candidates"], top_n, alternatives=alternatives
            )
        }

    def grade_evidence(state: AgentState) -> dict[str, Any]:
        sufficient, reason = grade(state["resolved_question"], state["evidence"])
        return {"sufficient": sufficient, "grade_reason": reason}

    def route_after_grade(state: AgentState) -> str:
        if state["sufficient"] or state.get("retries", 0) >= max_retries:
            return "generate_answer"
        return "corrective_search"

    def corrective_search(state: AgentState) -> dict[str, Any]:
        return {
            "queries": q.corrective_queries(state["resolved_question"], state["intent"]),
            "retries": state.get("retries", 0) + 1,
        }

    def generate_answer(state: AgentState) -> dict[str, Any]:
        evidence = state["evidence"]
        if not state["sufficient"] or not evidence:
            return {"draft": Draft(ABSTAIN_TEXT, ABSTAIN_SPOKEN, [], [], False, "extractive")}
        if llm is not None:
            try:
                draft = generate_with_llm(llm, state["resolved_question"], state.get("history", []), evidence)
                if draft.sufficient or draft.citations:
                    return {"draft": draft}
                return {"draft": Draft(ABSTAIN_TEXT, ABSTAIN_SPOKEN, [], [], False, "llm")}
            except LLMUnavailable as exc:
                log.info("falling back to extractive answer: %s", exc)
        return {"draft": generate_extractive(state["resolved_question"], evidence)}

    def extract_claims_node(state: AgentState) -> dict[str, Any]:
        draft = state["draft"]
        if not draft.sufficient:
            return {"raw_claims": []}
        return {"raw_claims": extract_claims(draft.answer, draft.citations)}

    def validate_citations(state: AgentState) -> dict[str, Any]:
        evidence_text = {c.chunk.chunk_id: c.chunk.text for c in state["evidence"]}
        claims, citations, grounding = validate(state["raw_claims"], evidence_text)
        return {"claims": claims, "citations": citations, "grounding": grounding}

    graph = StateGraph(AgentState)
    nodes: dict[str, Callable[[AgentState], dict[str, Any]]] = {
        "understand_query": understand_query,
        "classify_intent": classify_intent,
        "plan_investigation": plan_investigation,
        "retrieve": retrieve,
        "rerank": rerank,
        "grade_evidence": grade_evidence,
        "corrective_search": corrective_search,
        "generate_answer": generate_answer,
        "extract_claims": extract_claims_node,
        "validate_citations": validate_citations,
    }
    for name, fn in nodes.items():
        graph.add_node(name, _timed(name, fn))  # type: ignore[call-overload]
    graph.add_edge(START, "understand_query")
    graph.add_edge("understand_query", "classify_intent")
    graph.add_edge("classify_intent", "plan_investigation")
    graph.add_edge("plan_investigation", "retrieve")
    graph.add_edge("retrieve", "rerank")
    graph.add_edge("rerank", "grade_evidence")
    graph.add_conditional_edges(
        "grade_evidence",
        route_after_grade,
        {"generate_answer": "generate_answer", "corrective_search": "corrective_search"},
    )
    graph.add_edge("corrective_search", "retrieve")
    graph.add_edge("generate_answer", "extract_claims")
    graph.add_edge("extract_claims", "validate_citations")
    graph.add_edge("validate_citations", END)
    return graph.compile()
