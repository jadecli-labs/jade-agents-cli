"""Tests for MLflow tracing.

Fail-fast: invalid tracking URI raises immediately.
"""

from __future__ import annotations

import pytest

from jade.observability.tracing import TracingConfig, TracingService


class TestTracingConfig:
    """Configuration validates at creation time."""

    def test_config_requires_tracking_uri(self) -> None:
        with pytest.raises(ValueError):
            TracingConfig(tracking_uri="")

    def test_valid_config(self) -> None:
        config = TracingConfig(tracking_uri="http://localhost:5000")
        assert config.tracking_uri == "http://localhost:5000"

    def test_config_is_frozen(self) -> None:
        config = TracingConfig(tracking_uri="http://localhost:5000")
        with pytest.raises((AttributeError, TypeError)):
            config.tracking_uri = "other"  # type: ignore[misc]

    def test_default_experiment_name(self) -> None:
        config = TracingConfig(tracking_uri="http://localhost:5000")
        assert config.experiment_name == "jade"


class TestTracingService:
    """Tracing service records spans."""

    @pytest.fixture
    def service(self) -> TracingService:
        return TracingService(
            TracingConfig(tracking_uri="http://localhost:5000"),
            use_fake=True,
        )

    def test_create_service(self, service: TracingService) -> None:
        assert service is not None

    def test_record_tool_call_span(self, service: TracingService) -> None:
        service.record_tool_call(
            tool_name="create_entities",
            input_data={"entities": [{"name": "test"}]},
            output_data={"created": ["test"]},
            duration_ms=42.5,
        )
        spans = service.get_recorded_spans()
        assert len(spans) == 1
        assert spans[0]["tool_name"] == "create_entities"

    def test_record_token_usage(self, service: TracingService) -> None:
        service.record_token_usage(
            prompt_tokens=100,
            completion_tokens=50,
            model="claude-sonnet-4-20250514",
        )
        spans = service.get_recorded_spans()
        assert len(spans) == 1
        assert spans[0]["prompt_tokens"] == 100
        assert spans[0]["completion_tokens"] == 50

    def test_record_multiple_spans(self, service: TracingService) -> None:
        service.record_tool_call("tool1", {}, {}, 10.0)
        service.record_tool_call("tool2", {}, {}, 20.0)
        service.record_token_usage(50, 25, "claude-sonnet-4-20250514")
        spans = service.get_recorded_spans()
        assert len(spans) == 3

    def test_spans_include_duration(self, service: TracingService) -> None:
        service.record_tool_call("create_entities", {}, {}, 42.5)
        spans = service.get_recorded_spans()
        assert spans[0]["duration_ms"] == 42.5

    def test_clear_spans(self, service: TracingService) -> None:
        service.record_tool_call("tool1", {}, {}, 10.0)
        service.clear_spans()
        assert len(service.get_recorded_spans()) == 0
