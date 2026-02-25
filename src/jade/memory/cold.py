"""Neon cold memory client with pgvector for semantic search.

Fail-fast: connection failures raise immediately.
Uses in-memory fake for testing.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class ColdMemoryConfig:
    """Configuration for the cold memory client."""

    database_url: str
    api_key: str
    embedding_dimensions: int = 1536

    def __post_init__(self) -> None:
        if not self.database_url or not self.database_url.strip():
            msg = "database_url must be a non-empty string"
            raise ValueError(msg)
        if not self.api_key or not self.api_key.strip():
            msg = "api_key must be a non-empty string"
            raise ValueError(msg)


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    """Compute cosine similarity between two vectors."""
    dot = sum(x * y for x, y in zip(a, b, strict=True))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


class _FakeStore:
    """In-memory pgvector substitute for testing."""

    def __init__(self, dimensions: int) -> None:
        self.dimensions = dimensions
        self.entities: list[dict[str, Any]] = []

    def insert(self, entity: dict[str, Any]) -> None:
        self.entities.append(entity)

    def get(self, name: str) -> dict[str, Any] | None:
        for e in self.entities:
            if e["name"] == name:
                return e
        return None

    def search(self, query_embedding: list[float], limit: int) -> list[dict[str, Any]]:
        scored = []
        for e in self.entities:
            sim = _cosine_similarity(query_embedding, e.get("embedding", []))
            scored.append((sim, e))
        scored.sort(key=lambda x: x[0], reverse=True)
        return [e for _, e in scored[:limit]]

    def query_by_type(self, entity_type: str) -> list[dict[str, Any]]:
        return [e for e in self.entities if e.get("entity_type") == entity_type]


class ColdMemoryClient:
    """Neon pgvector cold memory client."""

    def __init__(self, config: ColdMemoryConfig, *, use_fake: bool = False) -> None:
        self._config = config
        self._dimensions = config.embedding_dimensions

        if use_fake:
            self._store = _FakeStore(config.embedding_dimensions)
        else:
            msg = "Real Neon connection not implemented. Use use_fake=True for testing."
            raise NotImplementedError(msg)

    def insert_entity(
        self,
        name: str,
        entity_type: str,
        observations: list[str],
        embedding: list[float],
    ) -> None:
        """Insert an entity with its embedding vector."""
        if not name or not name.strip():
            msg = "name must be a non-empty string"
            raise ValueError(msg)
        if len(embedding) != self._dimensions:
            msg = f"embedding must have {self._dimensions} dimensions, got {len(embedding)}"
            raise ValueError(msg)

        self._store.insert({
            "name": name,
            "entity_type": entity_type,
            "observations": observations,
            "embedding": embedding,
        })

    def get_entity(self, name: str) -> dict[str, Any] | None:
        """Get an entity by name."""
        return self._store.get(name)

    def semantic_search(
        self, query_embedding: list[float], limit: int = 10
    ) -> list[dict[str, Any]]:
        """Search entities by cosine similarity."""
        return self._store.search(query_embedding, limit)

    def query_by_type(self, entity_type: str) -> list[dict[str, Any]]:
        """Query entities by type."""
        return self._store.query_by_type(entity_type)
