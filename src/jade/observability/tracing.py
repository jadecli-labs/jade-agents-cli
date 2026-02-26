"""MLflow tracing for observability.

Fail-fast: invalid tracking URI raises immediately.
Uses in-memory fake for testing.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class TracingConfig:
    """Configuration for the tracing service."""

    tracking_uri: str
    experiment_name: str = "jade"

    def __post_init__(self) -> None:
        if not self.tracking_uri or not self.tracking_uri.strip():
            msg = "tracking_uri must be a non-empty string"
            raise ValueError(msg)


class TracingService:
    """Records spans for tool calls, token usage, and other events."""

    def __init__(self, config: TracingConfig, *, use_fake: bool = False) -> None:
        self._config = config
        self._use_fake = use_fake
        self._spans: list[dict[str, Any]] = []

        if not use_fake:
            msg = "Real MLflow tracing not implemented. Use use_fake=True for testing."
            raise NotImplementedError(msg)

    def record_tool_call(
        self,
        tool_name: str,
        input_data: dict[str, Any],
        output_data: dict[str, Any],
        duration_ms: float,
    ) -> None:
        """Record a tool call span."""
        self._spans.append({
            "type": "tool_call",
            "tool_name": tool_name,
            "input": input_data,
            "output": output_data,
            "duration_ms": duration_ms,
        })

    def record_token_usage(
        self,
        prompt_tokens: int,
        completion_tokens: int,
        model: str,
    ) -> None:
        """Record token usage span."""
        self._spans.append({
            "type": "token_usage",
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "model": model,
        })

    def get_recorded_spans(self) -> list[dict[str, Any]]:
        """Get all recorded spans."""
        return list(self._spans)

    def clear_spans(self) -> None:
        """Clear all recorded spans."""
        self._spans.clear()
