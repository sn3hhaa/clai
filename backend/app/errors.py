"""Domain errors that map to a consistent JSON error schema: {"error": {"code", "message"}}."""

from __future__ import annotations


class ClaiError(Exception):
    status_code = 400
    code = "bad_request"

    def __init__(self, message: str, *, code: str | None = None, status_code: int | None = None):
        super().__init__(message)
        self.message = message
        if code:
            self.code = code
        if status_code:
            self.status_code = status_code


class InvalidDocument(ClaiError):
    status_code = 422
    code = "invalid_document"


class NotFound(ClaiError):
    status_code = 404
    code = "not_found"


class DocumentNotReady(ClaiError):
    status_code = 409
    code = "document_not_ready"
