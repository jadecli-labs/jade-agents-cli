"""Redis hot memory client for session-scoped working memory.

Fail-fast: connection failures raise immediately.
Supports FakeRedis for testing without a running server.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class HotMemoryConfig:
    """Configuration for the hot memory client."""

    redis_url: str
    default_ttl_seconds: int = 3600  # 1 hour default

    def __post_init__(self) -> None:
        if not self.redis_url or not self.redis_url.strip():
            msg = "redis_url must be a non-empty string"
            raise ValueError(msg)


class _FakeRedis:
    """In-memory Redis substitute for testing."""

    def __init__(self) -> None:
        self._data: dict[str, str] = {}
        self._ttls: dict[str, int] = {}
        self._lists: dict[str, list[str]] = {}

    def set(self, key: str, value: str, ex: int | None = None) -> None:
        self._data[key] = value
        if ex is not None:
            self._ttls[key] = ex

    def get(self, key: str) -> str | None:
        return self._data.get(key)

    def delete(self, key: str) -> None:
        self._data.pop(key, None)
        self._ttls.pop(key, None)
        self._lists.pop(key, None)

    def ttl(self, key: str) -> int:
        return self._ttls.get(key, -1)

    def rpush(self, key: str, value: str) -> None:
        if key not in self._lists:
            self._lists[key] = []
        self._lists[key].append(value)

    def lrange(self, key: str, start: int, end: int) -> list[str]:
        lst = self._lists.get(key, [])
        if end == -1:
            return lst[start:]
        return lst[start : end + 1]


class HotMemoryClient:
    """Redis hot memory client for session-scoped state."""

    def __init__(self, config: HotMemoryConfig, *, use_fake: bool = False) -> None:
        self._config = config
        self._default_ttl = config.default_ttl_seconds

        if use_fake:
            self._redis = _FakeRedis()
        else:
            import redis

            self._redis = redis.from_url(config.redis_url, decode_responses=True)
            # Fail fast: verify connection
            self._redis.ping()

    def _session_key(self, session_id: str) -> str:
        return f"jade:session:{session_id}"

    def _working_memory_key(self, session_id: str, namespace: str) -> str:
        return f"jade:wm:{session_id}:{namespace}"

    def write_session(
        self, session_id: str, data: dict[str, Any], ttl_seconds: int | None = None
    ) -> None:
        """Write session state with TTL."""
        key = self._session_key(session_id)
        ttl = ttl_seconds or self._default_ttl
        self._redis.set(key, json.dumps(data), ex=ttl)

    def read_session(self, session_id: str) -> dict[str, Any] | None:
        """Read session state. Returns None if not found."""
        key = self._session_key(session_id)
        value = self._redis.get(key)
        if value is None:
            return None
        return json.loads(value)

    def delete_session(self, session_id: str) -> None:
        """Delete session state."""
        key = self._session_key(session_id)
        self._redis.delete(key)

    def get_ttl(self, session_id: str) -> int | None:
        """Get remaining TTL for a session. Returns None if key doesn't exist."""
        key = self._session_key(session_id)
        ttl = self._redis.ttl(key)
        if ttl < 0:
            return None
        return ttl

    def add_working_memory(self, session_id: str, namespace: str, item: str) -> None:
        """Add an item to a session's working memory list."""
        key = self._working_memory_key(session_id, namespace)
        self._redis.rpush(key, item)

    def get_working_memory(self, session_id: str, namespace: str) -> list[str]:
        """Get all items in a session's working memory list."""
        key = self._working_memory_key(session_id, namespace)
        return self._redis.lrange(key, 0, -1)

    def clear_working_memory(self, session_id: str, namespace: str) -> None:
        """Clear a session's working memory list."""
        key = self._working_memory_key(session_id, namespace)
        self._redis.delete(key)
