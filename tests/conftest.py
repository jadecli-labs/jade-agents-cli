"""Shared test fixtures and configuration."""

from __future__ import annotations

import os
from typing import TYPE_CHECKING

import pytest

if TYPE_CHECKING:
    from collections.abc import Generator


@pytest.fixture(autouse=True)
def _test_env(monkeypatch: pytest.MonkeyPatch) -> None:
    """Set minimal test environment variables so settings can load without real secrets."""
    test_vars = {
        "ANTHROPIC_API_KEY": "test-key-not-real",
        "NEON_DATABASE_URL": "postgresql://test:test@localhost:5432/test",
        "NEON_API_KEY": "test-neon-key",
        "REDIS_URL": "redis://localhost:6379",
        "CUBE_API_URL": "http://localhost:4000",
        "CUBE_API_KEY": "test-cube-key",
        "MLFLOW_TRACKING_URI": "http://localhost:5000",
        "MEMORY_FILE_PATH": "/tmp/jade-test-memory.jsonl",
    }
    for key, value in test_vars.items():
        monkeypatch.setenv(key, value)


@pytest.fixture
def clean_memory_file(tmp_path: object) -> Generator[str, None, None]:
    """Provide a clean temporary JSONL memory file path."""
    import tempfile

    with tempfile.NamedTemporaryFile(mode="w", suffix=".jsonl", delete=False) as f:
        path = f.name
    yield path
    if os.path.exists(path):
        os.unlink(path)
