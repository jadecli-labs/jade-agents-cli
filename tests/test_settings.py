"""Tests for settings module — fail-fast configuration loading."""

from __future__ import annotations

import pytest


class TestSettingsFailFast:
    """Settings must raise SettingsError immediately when required keys are missing."""

    def test_missing_anthropic_api_key_raises(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
        from jade.settings import SettingsError, load_settings

        with pytest.raises(SettingsError, match="ANTHROPIC_API_KEY"):
            load_settings()

    def test_missing_neon_database_url_raises(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.delenv("NEON_DATABASE_URL", raising=False)
        from jade.settings import SettingsError, load_settings

        with pytest.raises(SettingsError, match="NEON_DATABASE_URL"):
            load_settings()

    def test_missing_neon_api_key_raises(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.delenv("NEON_API_KEY", raising=False)
        from jade.settings import SettingsError, load_settings

        with pytest.raises(SettingsError, match="NEON_API_KEY"):
            load_settings()

    def test_missing_redis_url_raises(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.delenv("REDIS_URL", raising=False)
        from jade.settings import SettingsError, load_settings

        with pytest.raises(SettingsError, match="REDIS_URL"):
            load_settings()

    def test_missing_cube_api_url_raises(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.delenv("CUBE_API_URL", raising=False)
        from jade.settings import SettingsError, load_settings

        with pytest.raises(SettingsError, match="CUBE_API_URL"):
            load_settings()

    def test_missing_cube_api_key_raises(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.delenv("CUBE_API_KEY", raising=False)
        from jade.settings import SettingsError, load_settings

        with pytest.raises(SettingsError, match="CUBE_API_KEY"):
            load_settings()

    def test_missing_mlflow_tracking_uri_raises(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.delenv("MLFLOW_TRACKING_URI", raising=False)
        from jade.settings import SettingsError, load_settings

        with pytest.raises(SettingsError, match="MLFLOW_TRACKING_URI"):
            load_settings()


class TestSettingsLoadsCorrectly:
    """When all required keys are present, settings load with correct typed values."""

    def test_load_settings_returns_settings_object(self) -> None:
        from jade.settings import Settings, load_settings

        settings = load_settings()
        assert isinstance(settings, Settings)

    def test_anthropic_settings_has_api_key(self) -> None:
        from jade.settings import load_settings

        settings = load_settings()
        assert settings.anthropic.api_key == "test-key-not-real"

    def test_anthropic_settings_has_default_model(self) -> None:
        from jade.settings import load_settings

        settings = load_settings()
        assert "claude" in settings.anthropic.model.lower() or "sonnet" in settings.anthropic.model.lower()

    def test_neon_settings_has_database_url(self) -> None:
        from jade.settings import load_settings

        settings = load_settings()
        assert settings.neon.database_url.startswith("postgresql://")

    def test_neon_settings_has_api_key(self) -> None:
        from jade.settings import load_settings

        settings = load_settings()
        assert settings.neon.api_key == "test-neon-key"

    def test_redis_settings_has_url(self) -> None:
        from jade.settings import load_settings

        settings = load_settings()
        assert settings.redis.url.startswith("redis://")

    def test_cube_settings_has_api_url(self) -> None:
        from jade.settings import load_settings

        settings = load_settings()
        assert settings.cube.api_url.startswith("http")

    def test_mlflow_settings_has_tracking_uri(self) -> None:
        from jade.settings import load_settings

        settings = load_settings()
        assert settings.mlflow.tracking_uri.startswith("http")

    def test_mcp_settings_has_memory_file_path(self) -> None:
        from jade.settings import load_settings

        settings = load_settings()
        assert settings.mcp.memory_file_path.endswith(".jsonl")


class TestSettingsImmutability:
    """Settings objects must be frozen — no mutation after creation."""

    def test_settings_is_frozen(self) -> None:
        from jade.settings import load_settings

        settings = load_settings()
        with pytest.raises((AttributeError, TypeError)):
            settings.anthropic = None  # type: ignore[assignment]

    def test_anthropic_settings_is_frozen(self) -> None:
        from jade.settings import load_settings

        settings = load_settings()
        with pytest.raises((AttributeError, TypeError)):
            settings.anthropic.api_key = "mutated"  # type: ignore[misc]
