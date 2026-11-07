from __future__ import annotations

from pathlib import Path

from app.config import BACKEND_ROOT, Settings


def test_blank_qdrant_path_falls_back_to_data_dir(tmp_path: Path) -> None:
    # Mirrors a fresh .env copied from .env.example, where QDRANT_PATH is empty.
    settings = Settings(_env_file=None, data_dir=tmp_path, qdrant_path="")  # type: ignore[call-arg]
    assert settings.qdrant_path is None
    assert settings.resolved_qdrant_path == tmp_path / "qdrant"


def test_relative_paths_resolve_against_backend_root() -> None:
    settings = Settings(_env_file=None, data_dir="./data", qdrant_path="./data/vectors")  # type: ignore[call-arg]
    assert settings.data_dir == (BACKEND_ROOT / "data").resolve()
    assert settings.resolved_qdrant_path == (BACKEND_ROOT / "data" / "vectors").resolve()


def test_cors_origins_are_split_and_trimmed() -> None:
    settings = Settings(_env_file=None, frontend_origin="http://localhost:3000, https://sn3hhaa.github.io")  # type: ignore[call-arg]
    assert settings.cors_origins == ["http://localhost:3000", "https://sn3hhaa.github.io"]
