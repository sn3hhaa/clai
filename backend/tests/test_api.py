from io import BytesIO
from types import SimpleNamespace

from fastapi.testclient import TestClient

import app.main as main


class FakeAgent:
    """
    Lightweight agent used for API tests.

    This avoids making real embedding, reranking, or LLM calls.
    """

    def __init__(self, *args, **kwargs):
        pass

    def invoke(self, query: str):
        evidence_item = SimpleNamespace(
            chunk_id="test-chunk-1",
            document_id="test-document",
            page_number=2,
            section="CLEANING FEE",
            clause="8",
            text="The cleaning fee is $200.00.",
            relevance_score=4.2,
        )

        evidence_pack = SimpleNamespace(
            evidence=[evidence_item],
            sufficient=True,
        )

        return {
            "answer": "The cleaning fee is $200.00. [Evidence 1]",
            "evidence_pack": evidence_pack,
            "queries_used": [query],
            "correction_attempted": False,
        }


class FakeAnswerGenerator:
    """
    Lightweight answer generator used during API tests.
    """

    def __init__(self, *args, **kwargs):
        pass


def test_health_endpoint():
    client = TestClient(main.app)

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "clai",
    }


def test_upload_document(monkeypatch, tmp_path):
    monkeypatch.setattr(
        main,
        "ClaiAgent",
        FakeAgent,
    )

    monkeypatch.setattr(
        main,
        "AnswerGenerator",
        FakeAnswerGenerator,
    )

    monkeypatch.setattr(
        main,
        "UPLOAD_DIR",
        tmp_path,
    )

    fake_document = SimpleNamespace(
        document_id="test-document-id",
        filename="uploaded-agreement.pdf",
        page_count=3,
    )

    fake_chunks = [
        SimpleNamespace(
            chunk_id="test-chunk-1",
        )
    ]

    def fake_extract_pdf(pdf_path, document_id):
        return fake_document

    def fake_chunk_document(document):
        return fake_chunks

    monkeypatch.setattr(
        main,
        "extract_pdf",
        fake_extract_pdf,
    )

    monkeypatch.setattr(
        main,
        "chunk_document",
        fake_chunk_document,
    )

    main.documents.clear()

    client = TestClient(main.app)

    pdf_content = b"fake pdf content"

    response = client.post(
        "/documents",
        files={
            "file": (
                "agreement.pdf",
                BytesIO(pdf_content),
                "application/pdf",
            )
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["filename"] == "agreement.pdf"
    assert data["page_count"] == 3
    assert data["chunk_count"] == 1
    assert data["status"] == "processed"

    document_id = data["document_id"]

    assert document_id in main.documents
    assert main.documents[document_id].filename == "agreement.pdf"


def test_query_document(monkeypatch):
    document_id = "test-document-id"

    main.documents.clear()

    main.documents[document_id] = main.DocumentRecord(
        document_id=document_id,
        filename="agreement.pdf",
        page_count=3,
        chunks=[],
        agent=FakeAgent(),
    )

    client = TestClient(main.app)

    response = client.post(
        "/query",
        json={
            "document_id": document_id,
            "question": "What is the cleaning fee?",
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["document_id"] == document_id
    assert data["question"] == "What is the cleaning fee?"
    assert data["answer"] == (
        "The cleaning fee is $200.00. [Evidence 1]"
    )
    assert data["evidence_sufficient"] is True
    assert data["queries_used"] == [
        "What is the cleaning fee?"
    ]
    assert data["correction_attempted"] is False

    assert len(data["evidence"]) == 1
    assert data["evidence"][0]["page_number"] == 2
    assert data["evidence"][0]["section"] == "CLEANING FEE"


def test_query_unknown_document_returns_404():
    main.documents.clear()

    client = TestClient(main.app)

    response = client.post(
        "/query",
        json={
            "document_id": "does-not-exist",
            "question": "What is the cleaning fee?",
        },
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Document not found."


def test_query_empty_question_returns_400():
    document_id = "test-document-id"

    main.documents.clear()

    main.documents[document_id] = main.DocumentRecord(
        document_id=document_id,
        filename="agreement.pdf",
        page_count=3,
        chunks=[],
        agent=FakeAgent(),
    )

    client = TestClient(main.app)

    response = client.post(
        "/query",
        json={
            "document_id": document_id,
            "question": "   ",
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Question cannot be empty."