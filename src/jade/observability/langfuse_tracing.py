"""Langfuse tracing for LLM observability.

Replaces MLflow with purpose-built LLM tracing.
Free tier: 50K observations/month at cloud.langfuse.com.

Fail-fast: throws on missing credentials.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class LangfuseConfig:
    """Configuration for Langfuse tracing."""

    public_key: str
    secret_key: str
    host: str = "https://cloud.langfuse.com"

    def __post_init__(self) -> None:
        if not self.public_key or not self.public_key.strip():
            msg = "public_key must be a non-empty string"
            raise ValueError(msg)
        if not self.secret_key or not self.secret_key.strip():
            msg = "secret_key must be a non-empty string"
            raise ValueError(msg)


class LangfuseTracing:
    """Langfuse-backed tracing service for LLM observability."""

    def __init__(self, config: LangfuseConfig, *, use_fake: bool = False) -> None:
        self._config = config
        self._use_fake = use_fake
        self._client = None

        if not use_fake:
            from langfuse import Langfuse

            self._client = Langfuse(
                public_key=config.public_key,
                secret_key=config.secret_key,
                host=config.host,
            )

    def create_trace(
        self,
        name: str,
        user_id: str | None = None,
        session_id: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> Any:
        """Create a trace for a user interaction."""
        if self._client:
            return self._client.trace(
                name=name,
                user_id=user_id,
                session_id=session_id,
                metadata=metadata or {},
            )
        return None

    def record_tool_call(
        self,
        trace: Any,
        tool_name: str,
        input_data: dict[str, Any],
        output_data: dict[str, Any],
        duration_ms: float,
    ) -> None:
        """Record a tool call as a span within a trace."""
        if trace and hasattr(trace, "span"):
            trace.span(
                name=f"tool:{tool_name}",
                input=input_data,
                output=output_data,
                metadata={"duration_ms": duration_ms},
            )

    def record_generation(
        self,
        trace: Any,
        model: str,
        input_text: str,
        output_text: str,
        prompt_tokens: int,
        completion_tokens: int,
    ) -> None:
        """Record an LLM generation within a trace."""
        if trace and hasattr(trace, "generation"):
            trace.generation(
                name="chat",
                model=model,
                input=input_text,
                output=output_text,
                usage={
                    "input": prompt_tokens,
                    "output": completion_tokens,
                },
            )

    def flush(self) -> None:
        """Flush pending events."""
        if self._client:
            self._client.flush()

    def shutdown(self) -> None:
        """Shutdown the client."""
        if self._client:
            self._client.shutdown()
