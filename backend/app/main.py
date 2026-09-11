from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, File, HTTPException, UploadFile
from pydantic import BaseModel

from .agent.graph import ClaiAgent
from .answer_generator import AnswerGenerator
from .ingestion.chunker import chunk_document
from .ingestion.pdf_parser import extract_pdf


app = FastAPI(
    title="Clai",
    description="Talk to Your Agreements",
    version="0.1.0",
)


UPLOAD_DIR = Path("test_documents/uploads")
UPLOAD_DIR.mkdir(
    parents=True,
    exist_ok=True,
)


class QueryRequest(BaseModel):
    document_id: str
    question: str


class DocumentRecord:
    """
    In-memory representation of a processed agreement.
    """

    def __init__(
        self,
        document_id: str,
        filename: str,
        page_count: int,
        chunks: list,
        agent: ClaiAgent,
    ) -> None:
        self.document_id = document_id
        self.filename = filename
        self.page_count = page_count
        self.chunks = chunks
        self.agent = agent


documents: dict[str, DocumentRecord] = {}


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "clai",
    }


@app.post("/documents")
async def upload_document(
    file: UploadFile = File(...),
):
    """
    Upload a PDF agreement, process it, and create an in-memory
    Clai agent for subsequent queries.
    """

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="A filename is required.",
        )

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported.",
        )

    document_id = str(uuid4())

    document_path = UPLOAD_DIR / f"{document_id}.pdf"

    contents = await file.read()

    if not contents:
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is empty.",
        )

    document_path.write_bytes(contents)

    try:
        document = extract_pdf(
            document_path,
            document_id=document_id,
        )

        chunks = chunk_document(document)

        answer_generator = AnswerGenerator()

        agent = ClaiAgent(
            chunks=chunks,
            answer_generator=answer_generator,
        )

    except Exception as exc:
        document_path.unlink(
            missing_ok=True,
        )

        raise HTTPException(
            status_code=400,
            detail=f"Could not process PDF: {exc}",
        ) from exc

    documents[document_id] = DocumentRecord(
        document_id=document_id,
        filename=file.filename,
        page_count=document.page_count,
        chunks=chunks,
        agent=agent,
    )

    return {
        "document_id": document_id,
        "filename": file.filename,
        "page_count": document.page_count,
        "chunk_count": len(chunks),
        "status": "processed",
    }


@app.post("/query")
def query_document(request: QueryRequest):
    """
    Ask a question about a previously processed agreement.
    """

    if request.document_id not in documents:
        raise HTTPException(
            status_code=404,
            detail="Document not found.",
        )

    if not request.question.strip():
        raise HTTPException(
            status_code=400,
            detail="Question cannot be empty.",
        )

    document = documents[request.document_id]

    try:
        result = document.agent.invoke(
            request.question.strip(),
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Could not generate answer: {exc}",
        ) from exc

    evidence_pack = result.get("evidence_pack")

    evidence = []

    if evidence_pack is not None:
        evidence = [
            {
                "chunk_id": item.chunk_id,
                "document_id": item.document_id,
                "page_number": item.page_number,
                "section": item.section,
                "clause": item.clause,
                "text": item.text,
                "relevance_score": item.relevance_score,
            }
            for item in evidence_pack.evidence
        ]

    return {
        "document_id": request.document_id,
        "question": request.question,
        "answer": result.get("answer", ""),
        "evidence": evidence,
        "evidence_sufficient": (
            evidence_pack.sufficient
            if evidence_pack is not None
            else False
        ),
        "queries_used": result.get(
            "queries_used",
            [],
        ),
        "correction_attempted": result.get(
            "correction_attempted",
            False,
        ),
    }