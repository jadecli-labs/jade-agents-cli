"""Embedding pipeline for generating vector representations.

Fail-fast: API errors propagate immediately.
Uses deterministic fake for testing.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass


@dataclass(frozen=True)
class EmbeddingConfig:
    """Configuration for the embedding pipeline."""

    api_key: str
    model: str = "voyage-3"
    dimensions: int = 1536

    def __post_init__(self) -> None:
        if not self.api_key or not self.api_key.strip():
            msg = "api_key must be a non-empty string"
            raise ValueError(msg)


def _fake_embed(text: str, dimensions: int) -> list[float]:
    """Generate a deterministic fake embedding from text hash."""
    h = hashlib.sha256(text.encode()).digest()
    values = []
    for i in range(dimensions):
        byte_idx = i % len(h)
        values.append((h[byte_idx] - 128) / 256.0)
    return values


class EmbeddingPipeline:
    """Embedding generation pipeline."""

    def __init__(self, config: EmbeddingConfig, *, use_fake: bool = False) -> None:
        self._config = config
        self._use_fake = use_fake
        self.dimensions = config.dimensions

    def embed(self, text: str) -> list[float]:
        """Generate embedding for a single text."""
        if not text or not text.strip():
            msg = "text must be a non-empty string"
            raise ValueError(msg)

        if self._use_fake:
            return _fake_embed(text, self.dimensions)

        msg = "Real embedding API not implemented. Use use_fake=True for testing."
        raise NotImplementedError(msg)

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Generate embeddings for multiple texts."""
        return [self.embed(text) for text in texts]
