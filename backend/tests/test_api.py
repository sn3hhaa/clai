from __future__ import annotations

import jwt  # PyJWT ships with livekit-api
from fastapi.testclient import TestClient


def _upload(client: TestClient, data: bytes, name: str = "services.pdf") -> dict:
    response = client.post("/documents", files={"file": (name, data, "application/pdf")})
    assert response.status_code == 201, response.text
    return response.json()


def test_health(client: TestClient) -> None:
    body = client.get("/health").json()
    assert body["status"] == "ok" and body["llm"] == "not_configured"


def test_document_lifecycle(client: TestClient, services_pdf: bytes) -> None:
    doc = _upload(client, services_pdf)
    assert doc["status"] == "ready" and doc["page_count"] == 2 and doc["chunk_count"] > 10
    assert any(o["label"] == "8 Termination" for o in doc["outline"])

    assert client.get(f"/documents/{doc['id']}").json()["id"] == doc["id"]
    pdf = client.get(f"/documents/{doc['id']}/file")
    assert pdf.status_code == 200 and pdf.content == services_pdf
    assert [d["id"] for d in client.get("/documents").json()["documents"]] == [doc["id"]]

    assert client.delete(f"/documents/{doc['id']}").status_code == 204
    missing = client.get(f"/documents/{doc['id']}")
    assert missing.status_code == 404
    assert missing.json() == {"error": {"code": "not_found", "message": "Document not found."}}


def test_rejects_non_pdf_with_error_schema(client: TestClient) -> None:
    response = client.post("/documents", files={"file": ("notes.pdf", b"just text", "application/pdf")})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "not_a_pdf"
    assert client.get("/documents").json()["documents"] == []


def test_query_and_conversation_flow(client: TestClient, services_pdf: bytes) -> None:
    doc = _upload(client, services_pdf)
    answer = client.post(
        "/query", json={"document_id": doc["id"], "question": "What is the termination notice period?"}
    ).json()
    assert "30 days" in answer["answer"]
    assert answer["grounding"] == "grounded"
    cited = [e for e in answer["evidence"] if e["cited"]]
    assert cited[0]["page_number"] == 2 and cited[0]["clause"] == "8.1"

    conv = client.get(f"/conversations/{answer['conversation_id']}").json()
    assert [m["role"] for m in conv["messages"]] == ["user", "assistant"]
    summary = client.post(f"/conversations/{answer['conversation_id']}/end").json()
    assert summary["questions"] == ["What is the termination notice period?"]


def test_query_validation_errors(client: TestClient) -> None:
    response = client.post("/query", json={"document_id": "x", "question": ""})
    assert response.status_code == 422 and response.json()["error"]["code"] == "validation_error"
    assert client.post("/query", json={"document_id": "0" * 32, "question": "hi"}).status_code == 404


def test_conversation_cannot_cross_documents(client: TestClient, services_pdf: bytes, nda_pdf: bytes) -> None:
    a = _upload(client, services_pdf)
    b = _upload(client, nda_pdf, "nda.pdf")
    first = client.post("/query", json={"document_id": a["id"], "question": "termination notice?"}).json()
    cross = client.post(
        "/query", json={"document_id": b["id"], "question": "and?", "conversation_id": first["conversation_id"]}
    )
    assert cross.status_code == 404


def test_voice_token_dispatches_agent_with_metadata(client: TestClient, services_pdf: bytes) -> None:
    doc = _upload(client, services_pdf)
    body = client.post("/voice/token", json={"document_id": doc["id"]}).json()
    claims = jwt.decode(body["participant_token"], "secret", algorithms=["HS256"], options={"verify_aud": False})
    assert claims["video"]["room"] == body["room_name"] and claims["video"]["roomJoin"] is True
    dispatch = claims["roomConfig"]["agents"][0]
    assert dispatch["agentName"] == "clai-voice"
    assert doc["id"] in dispatch["metadata"] and body["conversation_id"] in dispatch["metadata"]
    assert "secret" not in body["participant_token"]


def test_openapi_lists_core_endpoints(client: TestClient) -> None:
    paths = client.get("/openapi.json").json()["paths"]
    for path in ("/health", "/documents", "/documents/{document_id}", "/query", "/voice/token"):
        assert path in paths
