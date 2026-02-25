"""Tests for embedding pipeline.

Fail-fast: API errors propagate immediately.
Uses fake embedder for testing.
"""

from __future__ import annotations

import pytest

from jade.memory.embeddings import EmbeddingConfig, EmbeddingPipeline


class TestEmbeddingConfig:
    """Configuration validates at creation time."""

    def test_config_requires_api_key(self) -> None:
        with pytest.raises(ValueError):
            EmbeddingConfig(api_key="")

    def test_valid_config(self) -> None:
        config = EmbeddingConfig(api_key="test-key")
        assert config.api_key == "test-key"

    def test_default_dimensions(self) -> None:
        config = EmbeddingConfig(api_key="test-key")
        assert config.dimensions == 1536

    def test_default_model(self) -> None:
        config = EmbeddingConfig(api_key="test-key")
        assert "voyage" in config.model or "embed" in config.model or config.model != ""


class TestEmbeddingGeneration:
    """Embedding generation for text."""

    @pytest.fixture
    def pipeline(self) -> EmbeddingPipeline:
        return EmbeddingPipeline(
            EmbeddingConfig(api_key="test-key"),
            use_fake=True,
        )

    def test_embed_text_returns_vector(self, pipeline: EmbeddingPipeline) -> None:
        result = pipeline.embed("TDD ensures quality")
        assert isinstance(result, list)
        assert len(result) == 1536

    def test_embed_text_returns_floats(self, pipeline: EmbeddingPipeline) -> None:
        result = pipeline.embed("test text")
        assert all(isinstance(x, float) for x in result)

    def test_embed_empty_text_raises(self, pipeline: EmbeddingPipeline) -> None:
        with pytest.raises(ValueError):
            pipeline.embed("")

    def test_batch_embed(self, pipeline: EmbeddingPipeline) -> None:
        results = pipeline.embed_batch(["text 1", "text 2", "text 3"])
        assert len(results) == 3
        assert all(len(v) == 1536 for v in results)

    def test_dimensions_match_config(self, pipeline: EmbeddingPipeline) -> None:
        result = pipeline.embed("test")
        assert len(result) == pipeline.dimensions
