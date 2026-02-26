"""Python task planner — sends advanced prompts to Claude Opus 4.6.

Uses adaptive thinking with 1M context window. Produces a TaskPlan
from a user request, then hands it to the TypeScript reviewer.

For testing: use FakePlanner which returns deterministic plans
without making API calls.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Any, Protocol

from jade.task.cost import calculate_cost, format_usage_summary
from jade.task.prompt import build_planner_system_prompt, build_planner_user_prompt
from jade.task.spec import (
    ModelTier,
    TaskPlan,
    TaskPriority,
    TaskStep,
    TaskType,
    TokenUsage,
)


class MessageClient(Protocol):
    """Protocol for the Anthropic messages.create() interface."""

    def create(self, **kwargs: Any) -> Any: ...


@dataclass(frozen=True)
class PlannerConfig:
    """Configuration for the task planner."""

    model: str = "claude-opus-4-6"
    max_tokens: int = 16_000
    model_tier: ModelTier = ModelTier.OPUS
    project_context: str = ""
    file_tree: str = ""

    def __post_init__(self) -> None:
        if not self.model or not self.model.strip():
            msg = "model must be a non-empty string"
            raise ValueError(msg)
        if self.max_tokens <= 0:
            msg = "max_tokens must be positive"
            raise ValueError(msg)


@dataclass(frozen=True)
class PlannerResult:
    """Result from the planner: plan + metadata."""

    plan: TaskPlan
    usage: TokenUsage
    cost_usd: float
    usage_summary: str
    raw_response: str = ""


def _extract_json_from_tags(text: str, tag: str) -> dict[str, Any]:
    """Extract JSON from XML-style tags like <task_plan>...</task_plan>."""
    pattern = rf"<{tag}>\s*({{.*?}})\s*</{tag}>"
    match = re.search(pattern, text, re.DOTALL)
    if not match:
        msg = f"No <{tag}> tags found in response"
        raise ValueError(msg)
    return json.loads(match.group(1))


def _parse_task_plan(data: dict[str, Any]) -> TaskPlan:
    """Parse a TaskPlan from the JSON dict returned by Claude."""
    steps = tuple(
        TaskStep(
            description=s["description"],
            file_paths=tuple(s.get("filePaths", [])),
            task_type=TaskType(s.get("taskType", "feat")),
            estimated_tokens=s.get("estimatedTokens", 0),
        )
        for s in data.get("steps", [])
    )

    return TaskPlan(
        title=data["title"],
        summary=data["summary"],
        task_type=TaskType(data.get("taskType", "feat")),
        priority=TaskPriority(data.get("priority", "medium")),
        model_tier=ModelTier(data.get("modelTier", "sonnet")),
        steps=steps,
        commit_message=data.get("commitMessage", ""),
        reasoning=data.get("reasoning", ""),
    )


def _extract_usage(response: Any) -> TokenUsage:
    """Extract token usage from an Anthropic API response."""
    usage = getattr(response, "usage", None)
    if usage is None:
        return TokenUsage()
    return TokenUsage(
        input_tokens=getattr(usage, "input_tokens", 0),
        output_tokens=getattr(usage, "output_tokens", 0),
        cache_creation_input_tokens=getattr(usage, "cache_creation_input_tokens", 0) or 0,
        cache_read_input_tokens=getattr(usage, "cache_read_input_tokens", 0) or 0,
    )


def _extract_text(response: Any) -> str:
    """Extract text content from an Anthropic API response."""
    for block in getattr(response, "content", []):
        if getattr(block, "type", None) == "text":
            return getattr(block, "text", "")
    return ""


class TaskPlanner:
    """Plans tasks by sending advanced prompts to Claude.

    Uses adaptive thinking with XML-structured prompts and
    chain-of-thought reasoning.
    """

    def __init__(self, client: MessageClient, config: PlannerConfig | None = None) -> None:
        self._client = client
        self._config = config or PlannerConfig()

    def plan(self, request: str) -> PlannerResult:
        """Generate a task plan for the given request.

        Args:
            request: Natural language description of the work to do.

        Returns:
            PlannerResult with the parsed plan and usage metadata.

        Raises:
            ValueError: If the response can't be parsed.
        """
        if not request or not request.strip():
            msg = "request must be a non-empty string"
            raise ValueError(msg)

        system_blocks = build_planner_system_prompt(
            project_context=self._config.project_context,
            file_tree=self._config.file_tree,
            model_tier=self._config.model_tier,
        )

        user_prompt = build_planner_user_prompt(request)

        response = self._client.create(
            model=self._config.model,
            max_tokens=self._config.max_tokens,
            system=system_blocks,
            thinking={"type": "adaptive"},
            messages=[{"role": "user", "content": user_prompt}],
        )

        raw_text = _extract_text(response)
        plan_data = _extract_json_from_tags(raw_text, "task_plan")
        plan = _parse_task_plan(plan_data)
        usage = _extract_usage(response)
        cost = calculate_cost(usage, self._config.model_tier)

        return PlannerResult(
            plan=plan,
            usage=usage,
            cost_usd=cost,
            usage_summary=format_usage_summary(usage, self._config.model_tier),
            raw_response=raw_text,
        )


class FakePlanner:
    """Test double that returns deterministic plans without API calls."""

    def __init__(self, plan: TaskPlan | None = None) -> None:
        self._plan = plan or _default_fake_plan()
        self.last_request: str = ""

    def plan(self, request: str) -> PlannerResult:
        if not request or not request.strip():
            msg = "request must be a non-empty string"
            raise ValueError(msg)
        self.last_request = request
        usage = TokenUsage(input_tokens=1000, output_tokens=500)
        return PlannerResult(
            plan=self._plan,
            usage=usage,
            cost_usd=0.0175,
            usage_summary="1,500 tokens · (1,000 in + 500 out) · $0.0175",
            raw_response="<task_plan>{}</task_plan>",
        )


def _default_fake_plan() -> TaskPlan:
    return TaskPlan(
        title="Add test module",
        summary="Create a new test module with unit tests.",
        task_type=TaskType.TEST,
        priority=TaskPriority.MEDIUM,
        model_tier=ModelTier.SONNET,
        steps=(
            TaskStep(
                description="Write failing tests",
                file_paths=("tests/test_example.py",),
                task_type=TaskType.TEST,
                estimated_tokens=2000,
            ),
            TaskStep(
                description="Implement module",
                file_paths=("src/example.py",),
                task_type=TaskType.FEAT,
                estimated_tokens=3000,
            ),
        ),
        commit_message="test: add test module with unit tests",
        reasoning="TDD approach: tests first, then implementation.",
    )
