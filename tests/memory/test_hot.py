"""Tests for Redis hot memory client.

Fail-fast: connection failures raise immediately.
Uses FakeRedis for testing without a running Redis server.
"""

from __future__ import annotations

import pytest

from jade.memory.hot import HotMemoryClient, HotMemoryConfig


class TestHotMemoryConfig:
    """Configuration validates at creation time."""

    def test_config_requires_redis_url(self) -> None:
        with pytest.raises(ValueError):
            HotMemoryConfig(redis_url="")

    def test_valid_config(self) -> None:
        config = HotMemoryConfig(redis_url="redis://localhost:6379")
        assert config.redis_url == "redis://localhost:6379"

    def test_default_ttl(self) -> None:
        config = HotMemoryConfig(redis_url="redis://localhost:6379")
        assert config.default_ttl_seconds > 0

    def test_custom_ttl(self) -> None:
        config = HotMemoryConfig(redis_url="redis://localhost:6379", default_ttl_seconds=600)
        assert config.default_ttl_seconds == 600

    def test_config_is_frozen(self) -> None:
        config = HotMemoryConfig(redis_url="redis://localhost:6379")
        with pytest.raises((AttributeError, TypeError)):
            config.redis_url = "other"  # type: ignore[misc]


class TestHotMemoryWriteRead:
    """Session state write/read operations."""

    @pytest.fixture
    def client(self) -> HotMemoryClient:
        return HotMemoryClient(
            HotMemoryConfig(redis_url="redis://localhost:6379"),
            use_fake=True,
        )

    def test_write_session_state(self, client: HotMemoryClient) -> None:
        client.write_session("sess-1", {"topic": "TDD", "status": "active"})
        result = client.read_session("sess-1")
        assert result is not None
        assert result["topic"] == "TDD"

    def test_read_nonexistent_session_returns_none(self, client: HotMemoryClient) -> None:
        result = client.read_session("nonexistent")
        assert result is None

    def test_overwrite_session(self, client: HotMemoryClient) -> None:
        client.write_session("sess-1", {"v": 1})
        client.write_session("sess-1", {"v": 2})
        result = client.read_session("sess-1")
        assert result is not None
        assert result["v"] == 2

    def test_delete_session(self, client: HotMemoryClient) -> None:
        client.write_session("sess-1", {"data": "test"})
        client.delete_session("sess-1")
        assert client.read_session("sess-1") is None


class TestHotMemoryTTL:
    """TTL behavior for session data."""

    @pytest.fixture
    def client(self) -> HotMemoryClient:
        return HotMemoryClient(
            HotMemoryConfig(redis_url="redis://localhost:6379", default_ttl_seconds=1),
            use_fake=True,
        )

    def test_session_has_ttl(self, client: HotMemoryClient) -> None:
        client.write_session("sess-ttl", {"data": "expires"})
        ttl = client.get_ttl("sess-ttl")
        assert ttl is not None
        assert ttl > 0

    def test_custom_ttl_on_write(self, client: HotMemoryClient) -> None:
        client.write_session("sess-custom", {"data": "test"}, ttl_seconds=3600)
        ttl = client.get_ttl("sess-custom")
        assert ttl is not None
        assert ttl > 0


class TestHotMemoryWorkingMemory:
    """Working memory CRUD operations for a session."""

    @pytest.fixture
    def client(self) -> HotMemoryClient:
        return HotMemoryClient(
            HotMemoryConfig(redis_url="redis://localhost:6379"),
            use_fake=True,
        )

    def test_add_working_memory_item(self, client: HotMemoryClient) -> None:
        client.add_working_memory("sess-1", "context", "Working on Redis integration")
        items = client.get_working_memory("sess-1", "context")
        assert len(items) == 1
        assert items[0] == "Working on Redis integration"

    def test_add_multiple_working_memory_items(self, client: HotMemoryClient) -> None:
        client.add_working_memory("sess-1", "threads", "TDD implementation")
        client.add_working_memory("sess-1", "threads", "Redis integration")
        items = client.get_working_memory("sess-1", "threads")
        assert len(items) == 2

    def test_clear_working_memory(self, client: HotMemoryClient) -> None:
        client.add_working_memory("sess-1", "context", "item1")
        client.add_working_memory("sess-1", "context", "item2")
        client.clear_working_memory("sess-1", "context")
        items = client.get_working_memory("sess-1", "context")
        assert len(items) == 0

    def test_session_isolation(self, client: HotMemoryClient) -> None:
        client.add_working_memory("sess-1", "data", "session1")
        client.add_working_memory("sess-2", "data", "session2")
        items1 = client.get_working_memory("sess-1", "data")
        items2 = client.get_working_memory("sess-2", "data")
        assert items1 == ["session1"]
        assert items2 == ["session2"]
