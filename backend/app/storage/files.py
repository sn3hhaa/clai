"""Local file store for original PDFs. Paths are derived from server-generated IDs only."""

from __future__ import annotations

import re
from pathlib import Path

_ID = re.compile(r"^[a-f0-9]{32}$")


class FileStore:
    def __init__(self, root: Path):
        self.root = root
        self.root.mkdir(parents=True, exist_ok=True)

    def path(self, document_id: str) -> Path:
        if not _ID.match(document_id):  # never build paths from untrusted strings
            raise ValueError("invalid document id")
        return self.root / f"{document_id}.pdf"

    def save(self, document_id: str, data: bytes) -> Path:
        target = self.path(document_id)
        target.write_bytes(data)
        return target

    def delete(self, document_id: str) -> None:
        self.path(document_id).unlink(missing_ok=True)
