from dataclasses import dataclass


@dataclass
class PageContent:
    page_number: int
    text: str


@dataclass
class DocumentContent:
    document_id: str
    filename: str
    pages: list[PageContent]
    page_count: int


@dataclass
class DocumentChunk:
    chunk_id: str
    document_id: str
    page_number: int
    section: str | None
    clause: str | None
    text: str