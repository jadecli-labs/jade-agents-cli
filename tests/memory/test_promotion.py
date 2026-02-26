"""Tests for hot→cold promotion logic.

Fail-fast: embedding or storage failures propagate immediately.
"""

from __future__ import annotations

import pytest

from jade.memory.cold import ColdMemoryClient, ColdMemoryConfig
from jade.memory.embeddings import EmbeddingConfig, EmbeddingPipeline
from jade.memory.hot import HotMemoryClient, HotMemoryConfig
from jade.memory.promotion import PromotionService


class TestPromotionService:
    """Hot→cold promotion moves session data to persistent storage."""

    @pytest.fixture
    def hot_client(self) -> HotMemoryClient:
        return HotMemoryClient(
            HotMemoryConfig(redis_url="redis://localhost:6379"),
            use_fake=True,
        )

    @pytest.fixture
    def cold_client(self) -> ColdMemoryClient:
        return ColdMemoryClient(
            ColdMemoryConfig(
                database_url="postgresql://localhost/test",
                api_key="test-key",
            ),
            use_fake=True,
        )

    @pytest.fixture
    def pipeline(self) -> EmbeddingPipeline:
        return EmbeddingPipeline(
            EmbeddingConfig(api_key="test-key"),
            use_fake=True,
        )

    @pytest.fixture
    def service(
        self,
        hot_client: HotMemoryClient,
        cold_client: ColdMemoryClient,
        pipeline: EmbeddingPipeline,
    ) -> PromotionService:
        return PromotionService(
            hot=hot_client,
            cold=cold_client,
            embeddings=pipeline,
        )

    def test_promote_session(self, service: PromotionService, hot_client: HotMemoryClient) -> None:
        hot_client.write_session("sess-1", {
            "entities": [
                {"name": "use-tdd", "entityType": "Decision", "observations": ["TDD is good"]},
            ]
        })
        result = service.promote_session("sess-1")
        assert result.promoted_count == 1

    def test_promote_preserves_entity_fields(
        self,
        service: PromotionService,
        hot_client: HotMemoryClient,
        cold_client: ColdMemoryClient,
    ) -> None:
        hot_client.write_session("sess-2", {
            "entities": [
                {
                    "name": "redis-cache",
                    "entityType": "Tool",
                    "observations": ["Fast key-value store"],
                },
            ]
        })
        service.promote_session("sess-2")
        entity = cold_client.get_entity("redis-cache")
        assert entity is not None
        assert entity["entity_type"] == "Tool"
        assert "Fast key-value store" in entity["observations"]

    def test_promote_generates_embeddings(
        self,
        service: PromotionService,
        hot_client: HotMemoryClient,
        cold_client: ColdMemoryClient,
    ) -> None:
        hot_client.write_session("sess-3", {
            "entities": [
                {"name": "embed-test", "entityType": "Concept", "observations": ["test embedding"]},
            ]
        })
        service.promote_session("sess-3")
        entity = cold_client.get_entity("embed-test")
        assert entity is not None
        assert entity.get("embedding") is not None
        assert len(entity["embedding"]) == 1536

    def test_promote_is_idempotent(
        self,
        service: PromotionService,
        hot_client: HotMemoryClient,
        cold_client: ColdMemoryClient,
    ) -> None:
        hot_client.write_session("sess-4", {
            "entities": [
                {"name": "idempotent-test", "entityType": "Concept", "observations": ["test"]},
            ]
        })
        service.promote_session("sess-4")
        # Re-write session data and promote again
        hot_client.write_session("sess-4", {
            "entities": [
                {"name": "idempotent-test", "entityType": "Concept", "observations": ["test"]},
            ]
        })
        result2 = service.promote_session("sess-4")
        # Second promotion should skip already-promoted entities
        assert result2.skipped_count == 1

    def test_promote_nonexistent_session(self, service: PromotionService) -> None:
        result = service.promote_session("nonexistent")
        assert result.promoted_count == 0
