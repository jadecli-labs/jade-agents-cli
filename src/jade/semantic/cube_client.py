"""Cube.js semantic layer client.

Fail-fast: connection errors propagate immediately.
Uses fake client for testing.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class CubeConfig:
    """Configuration for the Cube.js client."""

    api_url: str
    api_key: str

    def __post_init__(self) -> None:
        if not self.api_url or not self.api_url.strip():
            msg = "api_url must be a non-empty string"
            raise ValueError(msg)
        if not self.api_key or not self.api_key.strip():
            msg = "api_key must be a non-empty string"
            raise ValueError(msg)


class CubeClient:
    """Cube.js semantic layer query client."""

    def __init__(self, config: CubeConfig, *, use_fake: bool = False) -> None:
        self._config = config
        self._use_fake = use_fake
        self.api_url = config.api_url

    def query(self, query: dict[str, Any]) -> dict[str, Any]:
        """Execute a Cube.js JSON Query."""
        if not query.get("measures") and not query.get("dimensions"):
            msg = "Query must have at least 'measures' or 'dimensions'"
            raise ValueError(msg)

        if self._use_fake:
            return self._fake_query(query)

        msg = "Real Cube.js API not implemented. Use use_fake=True for testing."
        raise NotImplementedError(msg)

    def _fake_query(self, query: dict[str, Any]) -> dict[str, Any]:
        """Return fake query results for testing."""
        measures = query.get("measures", [])
        dimensions = query.get("dimensions", [])

        row: dict[str, Any] = {}
        for m in measures:
            row[m] = 42
        for d in dimensions:
            row[d] = "sample_value"

        return {"data": [row]}
