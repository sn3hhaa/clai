from __future__ import annotations

from app.retrieval.fusion import reciprocal_rank_fusion
from app.retrieval.lexical import stem, tokenize
from app.services import Clai


def test_rrf_rewards_agreement_between_rankings() -> None:
    fused = reciprocal_rank_fusion([["a", "b", "c"], ["b", "a", "d"]], k=60)
    ids = [cid for cid, _ in fused]
    assert set(ids[:2]) == {"a", "b"}
    assert ids[-1] in {"c", "d"}
    assert abs(dict(fused)["a"] - (1 / 61 + 1 / 62)) < 1e-12


def test_rrf_single_list_preserves_order() -> None:
    assert [cid for cid, _ in reciprocal_rank_fusion([["x", "y", "z"]])] == ["x", "y", "z"]


def test_stemming_joins_word_families() -> None:
    assert stem("terminate") == stem("termination") == stem("terminated")
    assert stem("payments") == stem("payment")
    assert "the" not in tokenize("The termination of the agreement")


def test_bm25_scoped_to_document(clai: Clai, services_pdf: bytes, nda_pdf: bytes) -> None:
    a = clai.ingest("services.pdf", services_pdf)
    b = clai.ingest("nda.pdf", nda_pdf)
    hits_a = clai.retriever.lexical.search(a.id, "terminate notice", 10)
    hits_b = clai.retriever.lexical.search(b.id, "terminate notice", 10)
    assert hits_a and hits_b
    assert all(cid.startswith(a.id) for cid, _ in hits_a)
    assert all(cid.startswith(b.id) for cid, _ in hits_b)


def test_hybrid_finds_termination_clause_first(clai: Clai, services_pdf: bytes) -> None:
    doc = clai.ingest("services.pdf", services_pdf)
    question = "What is the termination notice period?"
    candidates = clai.retriever.retrieve(doc.id, [question])
    assert candidates[0].dense_rank is not None or candidates[0].lexical_rank is not None
    top = clai.retriever.rerank(question, candidates, 3)
    assert top[0].chunk.clause == "8.1"
    assert top[0].score > 0.5


def test_dense_and_lexical_both_contribute(clai: Clai, services_pdf: bytes) -> None:
    doc = clai.ingest("services.pdf", services_pdf)
    candidates = clai.retriever.retrieve(doc.id, ["How much do late payments cost?"])
    target = next(c for c in candidates if c.chunk.clause == "4.3")
    assert target.dense_rank is not None and target.lexical_rank is not None


def test_cross_document_isolation(clai: Clai, services_pdf: bytes, nda_pdf: bytes) -> None:
    services = clai.ingest("services.pdf", services_pdf)
    nda = clai.ingest("nda.pdf", nda_pdf)
    question = "How many days' notice is needed to terminate?"
    for doc, expected, other in ((services, "30 days", "90 days"), (nda, "90 days", "30 days")):
        evidence = clai.retriever.rerank(question, clai.retriever.retrieve(doc.id, [question]), 5)
        assert evidence, doc.filename
        assert all(c.chunk.document_id == doc.id for c in evidence)
        assert expected in evidence[0].chunk.text
        assert not any(other in c.chunk.text for c in evidence)


def test_vectors_and_lexical_removed_on_delete(clai: Clai, services_pdf: bytes) -> None:
    doc = clai.ingest("services.pdf", services_pdf)
    assert clai.vectors.count(doc.id) == doc.chunk_count
    clai.delete_document(doc.id)
    assert clai.vectors.count(doc.id) == 0
    assert clai.retriever.lexical.search(doc.id, "terminate", 5) == []
    assert clai.db.get_chunks(doc.id) == []
    assert not clai.files.path(doc.id).exists()
