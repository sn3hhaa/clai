"""Application settings, validated at startup from environment variables / backend/.env."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: Literal["development", "test", "production"] = "development"
    app_host: str = "127.0.0.1"
    app_port: int = 8000
    # Comma-separated origins allowed by CORS.
    frontend_origin: str = "http://localhost:3000"

    data_dir: Path = BACKEND_ROOT / "data"

    # Upload limits
    max_upload_mb: int = Field(default=20, ge=1, le=100)
    max_pages: int = Field(default=300, ge=1, le=2000)

    # Models (downloaded from Hugging Face on first use, cached locally)
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    embedding_dim: int = 384
    reranker_model: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"
    reranker_enabled: bool = True

    # Qdrant: "local" = embedded store at qdrant_path; "remote" = server or Qdrant Cloud.
    qdrant_mode: Literal["local", "remote", "memory"] = "local"
    qdrant_path: Path | None = None
    qdrant_url: str = ""
    qdrant_api_key: str = ""
    qdrant_collection: str = "clai_chunks"

    # Retrieval / agent
    retrieval_top_k: int = Field(default=12, ge=1, le=50)
    rerank_top_n: int = Field(default=5, ge=1, le=20)
    rrf_k: int = 60
    agent_max_retries: int = Field(default=1, ge=0, le=3)
    history_turns: int = Field(default=4, ge=0, le=20)

    # LLM (OpenRouter, OpenAI-compatible API)
    openrouter_api_key: str = ""
    openrouter_model: str = "nvidia/nemotron-3.5-super-vl:free"
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    llm_timeout_s: float = Field(default=30.0, gt=0)
    llm_max_retries: int = Field(default=1, ge=0, le=3)

    # LiveKit (server-side only)
    livekit_url: str = "ws://127.0.0.1:7880"
    livekit_api_key: str = "devkey"
    livekit_api_secret: str = "secret"
    livekit_token_ttl_s: int = 900
    livekit_agent_name: str = "clai-voice"

    # Voice providers
    stt_provider: Literal["whisper", "gradium"] = "whisper"
    tts_provider: Literal["piper", "gradium"] = "piper"
    gradium_api_key: str = ""
    gradium_voice_id: str = ""
    whisper_model: str = "base.en"
    # auto = NVIDIA GPU when CUDA wheels from requirements-gpu.txt are installed, else CPU.
    whisper_device: Literal["auto", "cpu", "cuda"] = "auto"
    whisper_compute_type: str = "int8"
    piper_voice: str = "en_US-lessac-medium"
    # Piper runs as a separate process (its own venv, GPL-3.0) exposing HTTP /synthesize.
    piper_url: str = "http://127.0.0.1:5000"
    voice_greeting: bool = True

    # The voice worker calls the API at this address.
    api_internal_url: str = "http://127.0.0.1:8000"

    @field_validator("data_dir", mode="after")
    @classmethod
    def _absolute(cls, value: Path) -> Path:
        return value if value.is_absolute() else (BACKEND_ROOT / value).resolve()

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.frontend_origin.split(",") if o.strip()]

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024

    @property
    def resolved_qdrant_path(self) -> Path:
        return self.qdrant_path or (self.data_dir / "qdrant")

    @property
    def llm_configured(self) -> bool:
        return bool(self.openrouter_api_key and self.openrouter_model)


@lru_cache
def get_settings() -> Settings:
    return Settings()
