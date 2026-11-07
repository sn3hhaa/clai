"""FastAPI application factory.

Run:  python -m uvicorn app.main:app --port 8000
"""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app import __version__
from app.api.routes import router
from app.config import Settings, get_settings
from app.errors import ClaiError
from app.services import Clai

log = logging.getLogger("clai")


def _error(status: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(status_code=status, content={"error": {"code": code, "message": message}})


def create_app(settings: Settings | None = None, clai: Clai | None = None) -> FastAPI:
    settings = settings or get_settings()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        app.state.clai = clai or Clai(settings)
        log.info(
            "Clai %s ready (qdrant=%s, llm=%s)",
            __version__,
            settings.qdrant_mode,
            settings.openrouter_model if app.state.clai.llm else "extractive-only",
        )
        try:
            yield
        finally:
            app.state.clai.close()

    app = FastAPI(
        title="Clai API",
        version=__version__,
        description="Voice-first agreement intelligence: grounded answers with page, section and clause evidence.",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["GET", "POST", "DELETE"],
        allow_headers=["Content-Type"],
    )

    @app.exception_handler(ClaiError)
    async def clai_error(_: Request, exc: ClaiError) -> JSONResponse:
        return _error(exc.status_code, exc.code, exc.message)

    @app.exception_handler(RequestValidationError)
    async def validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        first = exc.errors()[0] if exc.errors() else {}
        where = ".".join(str(p) for p in first.get("loc", []) if p != "body")
        return _error(422, "validation_error", f"{where}: {first.get('msg', 'invalid request')}".strip(": "))

    @app.exception_handler(Exception)
    async def unhandled(_: Request, exc: Exception) -> JSONResponse:
        log.exception("unhandled error", exc_info=exc)
        return _error(500, "internal_error", "Something went wrong on the server.")

    app.include_router(router)
    return app


app = create_app()
