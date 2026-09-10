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