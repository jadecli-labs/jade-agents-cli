"""Tests for Neon cold memory (pgvector) client.

Fail-fast: connection failures raise immediately.
Uses in-memory fake for testing without a running database.
"""

from __future__ import annotations

import pytest

from jade.memory.cold import ColdMemoryClient, ColdMemoryConfig


class TestColdMemoryConfig:
    """Configuration validates at creation time."""

    def test_config_requires_database_url(self) -> None:
        with pytest.raises(ValueError):
            ColdMemoryConfig(database_url="", api_key="test")

    def test_config_requires_api_key(self) -> None:
        with pytest.raises(ValueError):
            ColdMemoryConfig(database_url="postgresql://localhost/test", api_key="")

    def test_valid_config(self) -> None:
        config = ColdMemoryConfig(
            database_url="postgresql://localhost/test", api_key="test-key"
        )
        assert config.database_url == "postgresql://localhost/test"
        assert config.api_key == "test-key"

    def test_default_embedding_dimensions(self) -> None:
        config = ColdMemoryConfig(
            database_url="postgresql://localhost/test", api_key="test-key"
        )
        assert config.embedding_dimensions == 1536

    def test_config_is_frozen(self) -> None:
        config = ColdMemoryConfig(
            database_url="postgresql://localhost/test", api_key="test-key"
        )
        with pytest.raises((AttributeError, TypeError)):
            config.database_url = "other"  # type: ignore[misc]


class TestColdMemoryInsert:
    """Insert entities with embeddings."""

    @pytest.fixture
    def client(self) -> ColdMemoryClient:
        return ColdMemoryClient(
            ColdMemoryConfig(
                database_url="postgresql://localhost/test",
                api_key="test-key",
            ),
            use_fake=True,
        )

    def test_insert_entity(self, client: ColdMemoryClient) -> None:
        client.insert_entity(
            name="use-tdd",
            entity_type="Decision",
            observations=["TDD ensures quality"],
            embedding=[0.1] * 1536,
        )
        result = client.get_entity("use-tdd")
        assert result is not None
        assert result["name"] == "use-tdd"
        assert result["entity_type"] == "Decision"

    def test_insert_entity_requires_name(self, client: ColdMemoryClient) -> None:
        with pytest.raises(ValueError):
            client.insert_entity(
                name="",
                entity_type="Decision",
                observations=["test"],
                embedding=[0.1] * 1536,
            )

    def test_insert_entity_validates_embedding_dimensions(self, client: ColdMemoryClient) -> None:
        with pytest.raises(ValueError):
            client.insert_entity(
                name="test",
                entity_type="Decision",
                observations=["test"],
                embedding=[0.1] * 100,  # Wrong dimensions
            )


class TestColdMemorySearch:
    """Semantic similarity search using embeddings."""

    @pytest.fixture
    def client(self) -> ColdMemoryClient:
        client = ColdMemoryClient(
            ColdMemoryConfig(
                database_url="postgresql://localhost/test",
                api_key="test-key",
            ),
            use_fake=True,
        )
        # Insert test data
        client.insert_entity(
            name="use-tdd",
            entity_type="Decision",
            observations=["TDD ensures quality before implementation"],
            embedding=[1.0] + [0.0] * 1535,
        )
        client.insert_entity(
            name="redis-hot-memory",
            entity_type="Decision",
            observations=["Redis provides fast session-scoped state"],
            embedding=[0.0, 1.0] + [0.0] * 1534,
        )
        return client

    def test_semantic_search_returns_results(self, client: ColdMemoryClient) -> None:
        results = client.semantic_search(
            query_embedding=[1.0] + [0.0] * 1535,
            limit=5,
        )
        assert len(results) > 0

    def test_semantic_search_ranks_by_similarity(self, client: ColdMemoryClient) -> None:
        results = client.semantic_search(
            query_embedding=[1.0] + [0.0] * 1535,
            limit=5,
        )
        assert results[0]["name"] == "use-tdd"

    def test_semantic_search_respects_limit(self, client: ColdMemoryClient) -> None:
        results = client.semantic_search(
            query_embedding=[0.5, 0.5] + [0.0] * 1534,
            limit=1,
        )
        assert len(results) == 1


class TestColdMemoryQuery:
    """Query by entity type, date, session."""

    @pytest.fixture
    def client(self) -> ColdMemoryClient:
        client = ColdMemoryClient(
            ColdMemoryConfig(
                database_url="postgresql://localhost/test",
                api_key="test-key",
            ),
            use_fake=True,
        )
        client.insert_entity(
            name="decision-1",
            entity_type="Decision",
            observations=["test"],
            embedding=[0.1] * 1536,
        )
        client.insert_entity(
            name="concept-1",
            entity_type="Concept",
            observations=["test"],
            embedding=[0.2] * 1536,
        )
        return client

    def test_query_by_entity_type(self, client: ColdMemoryClient) -> None:
        results = client.query_by_type("Decision")
        assert len(results) == 1
        assert results[0]["name"] == "decision-1"

    def test_query_by_type_returns_empty_for_unknown(self, client: ColdMemoryClient) -> None:
        results = client.query_by_type("UnknownType")
        assert len(results) == 0
