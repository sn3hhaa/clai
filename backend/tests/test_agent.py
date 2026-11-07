from __future__ import annotations

from pathlib import Path

from app.agent import query as q
from app.agent.graph import build_graph
from app.services import Clai
from app.validation import support, validate
from tests.conftest import FakeLLM, make_settings


def _clai_with(tmp_path: Path, embedder, reranker, llm) -> Clai:  # type: ignore[no-untyped-def]
    return Clai(make_settings(tmp_path), embedder=embedder, reranker=reranker, llm=llm)


# ── deterministic query understanding ─────────────────────────────────
def test_intent_classification() -> None:
    assert q.classify_intent("What is the termination notice period?") == "termination"
    assert q.classify_intent("When is each invoice due?") == "payment"
    assert q.classify_intent("Which courts handle disputes?") == "dispute"
    assert q.classify_intent("Tell me about the weather") == "general"


def test_follow_up_resolution_uses_previous_question() -> None:
    history = [("What is the termination notice period?", "30 days.")]
    resolved = q.resolve_question("What about for cause?", history)
    assert "termination notice period" in resolved
    assert q.resolve_question("Who owns the deliverables?", history) == "Who owns the deliverables?"
    assert q.resolve_question("What about for cause?", []) == "What about for cause?"


# ── validation ───────────────────────────────────────────────────────
def test_number_mismatch_is_unsupported() -> None:
    evidence = "Either party may terminate this agreement with 30 days' written notice."
    assert support("Either party can terminate with 30 days' written notice.", evidence) >= 0.5
    assert support("Either party can terminate with 60 days' written notice.", evidence) == 0.0


def test_citations_outside_evidence_are_dropped() -> None:
    claims, used, grounding = validate([("Notice is 30 days.", ["unknown-chunk"])], {"c1": "30 days notice"})
    assert used == [] and grounding == "insufficient" and not claims[0].supported


# ── full graph ───────────────────────────────────────────────────────
def test_answers_termination_question_extractively(clai: Clai, services_pdf: bytes) -> None:
    doc = clai.ingest("services.pdf", services_pdf)
    result = clai.ask(doc.id, "What is the termination notice period?")
    assert result.generation == "extractive"  # no LLM key configured in tests
    assert "30 days" in result.answer and "30 days" in result.spoken_answer
    assert result.grounding == "grounded"
    cited = [e for e in result.evidence if e.cited]
    assert len(cited) == 1 and cited[0].clause == "8.1" and cited[0].page_number == 2


def test_llm_answer_is_grounded_and_mapped_to_chunk_ids(tmp_path, embedder, reranker, services_pdf) -> None:  # type: ignore[no-untyped-def]
    llm = FakeLLM()
    clai = _clai_with(tmp_path, embedder, reranker, llm)
    doc = clai.ingest("services.pdf", services_pdf)
    result = clai.ask(doc.id, "What is the termination notice period?")
    assert result.generation == "llm"
    assert len(llm.calls) == 1, "exactly one LLM call per question"
    assert result.citations and result.citations[0].startswith(doc.id)
    assert result.grounding == "grounded"
    assert "S1" not in result.spoken_answer
    clai.close()


def test_llm_outage_falls_back_to_extractive(tmp_path, embedder, reranker, services_pdf) -> None:  # type: ignore[no-untyped-def]
    clai = _clai_with(tmp_path, embedder, reranker, FakeLLM(fail=True))
    doc = clai.ingest("services.pdf", services_pdf)
    result = clai.ask(doc.id, "When is each invoice payable?")
    assert result.generation == "extractive"
    assert "15 days" in result.answer
    clai.close()


def test_abstains_and_runs_corrective_search_when_evidence_missing(clai: Clai, services_pdf: bytes) -> None:
    doc = clai.ingest("services.pdf", services_pdf)
    result = clai.ask(doc.id, "What is the dress code for employees at the office?")
    assert result.grounding == "insufficient"
    assert not result.sufficient
    assert result.retrieval_rounds == 2, "one corrective search before abstaining"
    assert "couldn't find" in result.answer
    assert result.citations == []


def test_follow_up_keeps_context(clai: Clai, services_pdf: bytes) -> None:
    doc = clai.ingest("services.pdf", services_pdf)
    first = clai.ask(doc.id, "What is the termination notice period?")
    follow = clai.ask(doc.id, "And what if the other party breaches it?", first.conversation_id)
    assert "follow-up to" in follow.resolved_question
    assert follow.evidence[0].clause == "8.2"
    assert "10 days" in follow.answer


def test_graph_has_documented_nodes(clai: Clai) -> None:
    graph = build_graph(clai.retriever, None)
    nodes = set(graph.get_graph().nodes)
    assert {
        "understand_query", "classify_intent", "plan_investigation", "retrieve", "rerank", "grade_evidence",
        "corrective_search", "generate_answer", "extract_claims", "validate_citations",
    } <= nodes  # fmt: skip


def test_conversation_summary(clai: Clai, services_pdf: bytes) -> None:
    doc = clai.ingest("services.pdf", services_pdf)
    a = clai.ask(doc.id, "What is the termination notice period?", channel="voice")
    clai.ask(doc.id, "What is the dress code?", a.conversation_id)
    summary = clai.end_conversation(a.conversation_id)
    assert summary.questions == ["What is the termination notice period?", "What is the dress code?"]
    assert summary.unresolved == ["What is the dress code?"]
    assert summary.sources[0].clause == "8.1" and summary.sources[0].page_number == 2
    assert summary.ended_at is not None
    assert len(summary.transcript) == 4
