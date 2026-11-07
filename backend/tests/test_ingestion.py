from __future__ import annotations

import pymupdf
import pytest

from app.errors import InvalidDocument
from app.ingestion.pdf import extract_lines, validate_and_open
from app.ingestion.structure import build_chunks

LIMITS = {"max_bytes": 20 << 20, "max_pages": 300}


def _chunks(data: bytes):
    return build_chunks("doc", extract_lines(validate_and_open(data, **LIMITS)))


def test_termination_clause_has_exact_provenance(services_pdf: bytes) -> None:
    chunks, _ = _chunks(services_pdf)
    clause = next(c for c in chunks if "30 days' written notice" in c.text)
    assert clause.page_number == 2
    assert clause.clause == "8.1"
    assert clause.section == "8. Termination"
    assert clause.heading == "Termination for convenience"
    assert clause.text == "Either party may terminate this agreement with 30 days' written notice."


def test_every_numbered_clause_detected_in_order(services_pdf: bytes) -> None:
    chunks, outline = _chunks(services_pdf)
    clauses = [c.clause for c in chunks if c.clause]
    assert clauses[:3] == ["1.1", "1.2", "1.3"]
    assert clauses[-2:] == ["10.1", "10.2"]
    assert len(clauses) == len(set(clauses)), "a clause was split or duplicated"
    tops = [o.label for o in outline if o.level == 1 and o.clause]
    assert tops[0] == "1 Definitions" and tops[-1] == "10 General"
    assert next(o for o in outline if o.label == "5 Confidentiality").page_number == 2


def test_wrapped_parenthetical_numbers_are_not_clauses(services_pdf: bytes) -> None:
    chunks, _ = _chunks(services_pdf)
    assert not any(c.clause and "(12)" in c.clause for c in chunks)
    renewal = next(c for c in chunks if c.clause == "3.2")
    assert "at least 60 days before the end" in renewal.text


def test_decimals_survive_sentence_splitting(services_pdf: bytes) -> None:
    chunks, _ = _chunks(services_pdf)
    assert any("1.5% per month" in c.text for c in chunks)


def test_page_furniture_removed(services_pdf: bytes) -> None:
    chunks, _ = _chunks(services_pdf)
    assert not any("Page 1 of 2" in c.text or "Page 2 of 2" in c.text for c in chunks)


def test_preamble_has_no_invented_clause(services_pdf: bytes) -> None:
    chunks, _ = _chunks(services_pdf)
    assert chunks[0].clause is None and chunks[0].section is None
    assert chunks[0].chunk_id == "doc-c0000"


def test_long_clause_split_keeps_metadata() -> None:
    doc = pymupdf.open()
    page = doc.new_page()
    body = " ".join(f"Sentence number {i} describes an obligation of the Supplier in detail." for i in range(40))
    page.insert_textbox(pymupdf.Rect(72, 72, 520, 800), "4. Obligations\n4.1 " + body, fontsize=8)
    chunks, _ = _chunks(doc.tobytes())
    parts = [c for c in chunks if c.clause == "4.1"]
    assert len(parts) >= 2
    assert all(len(c.text) <= 900 for c in parts)
    assert all(c.section == "4. Obligations" for c in parts)


@pytest.mark.parametrize(
    ("data", "code"),
    [
        (b"", "empty_file"),
        (b"hello, not a pdf", "not_a_pdf"),
        (b"%PDF-1.7\n garbage garbage", "corrupt_pdf"),
    ],
)
def test_rejects_invalid_files(data: bytes, code: str) -> None:
    with pytest.raises(InvalidDocument) as err:
        validate_and_open(data, **LIMITS)
    assert err.value.code == code


def test_rejects_encrypted_pdf(services_pdf: bytes) -> None:
    doc = pymupdf.open(stream=services_pdf, filetype="pdf")
    encrypted = doc.tobytes(encryption=pymupdf.PDF_ENCRYPT_AES_256, user_pw="secret", owner_pw="owner")
    with pytest.raises(InvalidDocument) as err:
        validate_and_open(encrypted, **LIMITS)
    assert err.value.code == "encrypted_pdf"


def test_rejects_scanned_pdf() -> None:
    doc = pymupdf.open()
    page = doc.new_page()
    pix = pymupdf.Pixmap(pymupdf.csRGB, pymupdf.IRect(0, 0, 200, 200), False)
    pix.clear_with(200)
    page.insert_image(page.rect, pixmap=pix)
    with pytest.raises(InvalidDocument) as err:
        extract_lines(validate_and_open(doc.tobytes(), **LIMITS))
    assert err.value.code == "scanned_pdf"


def test_rejects_blank_pdf() -> None:
    doc = pymupdf.open()
    doc.new_page()
    with pytest.raises(InvalidDocument) as err:
        extract_lines(validate_and_open(doc.tobytes(), **LIMITS))
    assert err.value.code == "no_text"


def test_rejects_too_large_and_too_many_pages(services_pdf: bytes) -> None:
    with pytest.raises(InvalidDocument) as err:
        validate_and_open(services_pdf, max_bytes=100, max_pages=300)
    assert err.value.code == "file_too_large"
    with pytest.raises(InvalidDocument) as err:
        validate_and_open(services_pdf, max_bytes=20 << 20, max_pages=1)
    assert err.value.code == "too_many_pages"
