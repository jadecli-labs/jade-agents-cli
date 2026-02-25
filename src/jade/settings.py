"""Fail-fast settings loader for Jade.

All required environment variables are validated at load time.
Missing or empty values raise SettingsError immediately — no gradual degradation.
"""

from __future__ import annotations

import os
from dataclasses import dataclass


class SettingsError(Exception):
    """Raised when a required environment variable is missing or empty."""

    def __init__(self, key: str) -> None:
        super().__init__(
            f"Required environment variable '{key}' is not set or empty. "
            f"Check your .env file or env.template for required keys."
        )
        self.key = key


def _require(key: str) -> str:
    """Get a required env var or fail fast."""
    value = os.environ.get(key, "").strip()
    if not value:
        raise SettingsError(key)
    return value


@dataclass(frozen=True)
class AnthropicSettings:
    api_key: str
    model: str = "claude-sonnet-4-20250514"


@dataclass(frozen=True)
class NeonSettings:
    database_url: str
    api_key: str


@dataclass(frozen=True)
class RedisSettings:
    url: str


@dataclass(frozen=True)
class McpSettings:
    memory_file_path: str


@dataclass(frozen=True)
class CubeSettings:
    api_url: str
    api_key: str


@dataclass(frozen=True)
class MlflowSettings:
    tracking_uri: str


@dataclass(frozen=True)
class Settings:
    anthropic: AnthropicSettings
    neon: NeonSettings
    redis: RedisSettings
    mcp: McpSettings
    cube: CubeSettings
    mlflow: MlflowSettings


def load_settings() -> Settings:
    """Load and validate all settings from environment variables.

    Raises SettingsError immediately if any required key is missing.
    """
    return Settings(
        anthropic=AnthropicSettings(
            api_key=_require("ANTHROPIC_API_KEY"),
        ),
        neon=NeonSettings(
            database_url=_require("NEON_DATABASE_URL"),
            api_key=_require("NEON_API_KEY"),
        ),
        redis=RedisSettings(
            url=_require("REDIS_URL"),
        ),
        mcp=McpSettings(
            memory_file_path=os.environ.get("MEMORY_FILE_PATH", "./memory.jsonl").strip() or "./memory.jsonl",
        ),
        cube=CubeSettings(
            api_url=_require("CUBE_API_URL"),
            api_key=_require("CUBE_API_KEY"),
        ),
        mlflow=MlflowSettings(
            tracking_uri=_require("MLFLOW_TRACKING_URI"),
        ),
    )
