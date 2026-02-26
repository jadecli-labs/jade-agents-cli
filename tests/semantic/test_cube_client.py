"""Tests for Cube.js semantic layer client.

Fail-fast: connection errors propagate immediately.
Uses fake client for testing.
"""

from __future__ import annotations

import pytest

from jade.semantic.cube_client import CubeClient, CubeConfig


class TestCubeConfig:
    """Configuration validates at creation time."""

    def test_config_requires_api_url(self) -> None:
        with pytest.raises(ValueError):
            CubeConfig(api_url="", api_key="test")

    def test_config_requires_api_key(self) -> None:
        with pytest.raises(ValueError):
            CubeConfig(api_url="http://localhost:4000", api_key="")

    def test_valid_config(self) -> None:
        config = CubeConfig(api_url="http://localhost:4000", api_key="test-key")
        assert config.api_url == "http://localhost:4000"
        assert config.api_key == "test-key"

    def test_config_is_frozen(self) -> None:
        config = CubeConfig(api_url="http://localhost:4000", api_key="test-key")
        with pytest.raises((AttributeError, TypeError)):
            config.api_url = "other"  # type: ignore[misc]


class TestCubeClientCreation:
    """Client creation and configuration."""

    def test_create_client(self) -> None:
        client = CubeClient(
            CubeConfig(api_url="http://localhost:4000", api_key="test-key"),
            use_fake=True,
        )
        assert client is not None

    def test_client_has_api_url(self) -> None:
        client = CubeClient(
            CubeConfig(api_url="http://localhost:4000", api_key="test-key"),
            use_fake=True,
        )
        assert client.api_url == "http://localhost:4000"


class TestCubeQuery:
    """Cube.js query execution."""

    @pytest.fixture
    def client(self) -> CubeClient:
        return CubeClient(
            CubeConfig(api_url="http://localhost:4000", api_key="test-key"),
            use_fake=True,
        )

    def test_query_returns_result(self, client: CubeClient) -> None:
        result = client.query({
            "measures": ["Sessions.count"],
            "dimensions": ["Sessions.entityType"],
        })
        assert result is not None
        assert "data" in result

    def test_query_result_has_data_array(self, client: CubeClient) -> None:
        result = client.query({
            "measures": ["Sessions.count"],
        })
        assert isinstance(result["data"], list)

    def test_query_validates_measures(self, client: CubeClient) -> None:
        with pytest.raises(ValueError):
            client.query({})  # No measures or dimensions

    def test_query_with_filters(self, client: CubeClient) -> None:
        result = client.query({
            "measures": ["Sessions.count"],
            "filters": [
                {"member": "Sessions.entityType", "operator": "equals", "values": ["Decision"]},
            ],
        })
        assert result is not None

    def test_query_with_time_dimension(self, client: CubeClient) -> None:
        result = client.query({
            "measures": ["Sessions.count"],
            "timeDimensions": [
                {"dimension": "Sessions.createdAt", "granularity": "day"},
            ],
        })
        assert result is not None
