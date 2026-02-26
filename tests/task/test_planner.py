"""Tests for the Python task planner.

Uses FakePlanner for deterministic tests and a mock client
for integration-level testing of prompt construction and parsing.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import pytest

from jade.task.planner import (
    FakePlanner,
    PlannerConfig,
    PlannerResult,
    TaskPlanner,
    _extract_json_from_tags,
    _parse_task_plan,
)
from jade.task.spec import (
    ModelTier,
    TaskPlan,
    TaskPriority,
    TaskType,
)


class TestPlannerConfig:
    """PlannerConfig validates at creation time."""

    def test_valid_config(self) -> None:
        c = PlannerConfig(model="claude-opus-4-6", max_tokens=16_000)
        assert c.model == "claude-opus-4-6"

    def test_default_values(self) -> None:
        c = PlannerConfig()
        assert c.model == "claude-opus-4-6"
        assert c.max_tokens == 16_000
        assert c.model_tier == ModelTier.OPUS

    def test_rejects_empty_model(self) -> None:
        with pytest.raises(ValueError, match="model must be a non-empty string"):
            PlannerConfig(model="")

    def test_rejects_zero_max_tokens(self) -> None:
        with pytest.raises(ValueError, match="max_tokens must be positive"):
            PlannerConfig(max_tokens=0)

    def test_is_frozen(self) -> None:
        c = PlannerConfig()
        with pytest.raises((AttributeError, TypeError)):
            c.model = "other"  # type: ignore[misc]


class TestExtractJsonFromTags:
    """JSON extraction from XML-wrapped responses."""

    def test_extracts_valid_json(self) -> None:
        text = 'Some text\n<task_plan>\n{"title": "Test"}\n</task_plan>\nMore text'
        result = _extract_json_from_tags(text, "task_plan")
        assert result["title"] == "Test"

    def test_handles_multiline_json(self) -> None:
        text = '<task_plan>\n{\n  "title": "Test",\n  "summary": "A test"\n}\n</task_plan>'
        result = _extract_json_from_tags(text, "task_plan")
        assert result["title"] == "Test"
        assert result["summary"] == "A test"

    def test_raises_on_missing_tags(self) -> None:
        with pytest.raises(ValueError, match="No <task_plan> tags found"):
            _extract_json_from_tags("Just text, no tags", "task_plan")

    def test_extracts_review_tags(self) -> None:
        text = '<task_review>\n{"verdict": "approve"}\n</task_review>'
        result = _extract_json_from_tags(text, "task_review")
        assert result["verdict"] == "approve"


class TestParseTaskPlan:
    """Parsing JSON dict into TaskPlan dataclass."""

    def test_parses_minimal_plan(self) -> None:
        data = {
            "title": "Add auth",
            "summary": "Add authentication module.",
            "taskType": "feat",
            "priority": "high",
            "modelTier": "opus",
            "steps": [],
        }
        plan = _parse_task_plan(data)
        assert plan.title == "Add auth"
        assert plan.task_type == TaskType.FEAT
        assert plan.priority == TaskPriority.HIGH
        assert plan.model_tier == ModelTier.OPUS

    def test_parses_steps(self) -> None:
        data = {
            "title": "Fix bug",
            "summary": "Fix the login bug.",
            "steps": [
                {
                    "description": "Write regression test",
                    "filePaths": ["tests/test_auth.py"],
                    "taskType": "test",
                    "estimatedTokens": 1500,
                },
                {
                    "description": "Fix handler",
                    "filePaths": ["src/auth.py"],
                    "taskType": "fix",
                    "estimatedTokens": 800,
                },
            ],
        }
        plan = _parse_task_plan(data)
        assert len(plan.steps) == 2
        assert plan.steps[0].task_type == TaskType.TEST
        assert plan.steps[0].file_paths == ("tests/test_auth.py",)
        assert plan.steps[1].estimated_tokens == 800

    def test_defaults_for_missing_fields(self) -> None:
        data = {"title": "Minimal", "summary": "Minimal plan."}
        plan = _parse_task_plan(data)
        assert plan.task_type == TaskType.FEAT
        assert plan.priority == TaskPriority.MEDIUM
        assert plan.model_tier == ModelTier.SONNET
        assert plan.steps == ()


# Fake Anthropic message client for testing


@dataclass
class _FakeContentBlock:
    type: str
    text: str = ""


@dataclass
class _FakeUsage:
    input_tokens: int = 1000
    output_tokens: int = 500
    cache_creation_input_tokens: int = 0
    cache_read_input_tokens: int = 0


@dataclass
class _FakeResponse:
    content: list[_FakeContentBlock]
    usage: _FakeUsage


class _FakeMessageClient:
    """Fake Anthropic messages client that returns canned responses."""

    def __init__(self, response_text: str) -> None:
        self._response_text = response_text
        self.last_kwargs: dict[str, Any] = {}

    def create(self, **kwargs: Any) -> _FakeResponse:
        self.last_kwargs = kwargs
        return _FakeResponse(
            content=[_FakeContentBlock(type="text", text=self._response_text)],
            usage=_FakeUsage(),
        )


class TestTaskPlanner:
    """Integration test: TaskPlanner with fake client."""

    def _make_planner(self, response_text: str) -> tuple[TaskPlanner, _FakeMessageClient]:
        client = _FakeMessageClient(response_text)
        planner = TaskPlanner(client, PlannerConfig())
        return planner, client

    def _valid_response(self) -> str:
        return """
Let me analyze this request.

<task_plan>
{
  "title": "Add user authentication",
  "summary": "Implement JWT-based auth with login and signup endpoints.",
  "taskType": "feat",
  "priority": "high",
  "modelTier": "opus",
  "steps": [
    {
      "description": "Write auth tests",
      "filePaths": ["tests/test_auth.py"],
      "taskType": "test",
      "estimatedTokens": 3000
    },
    {
      "description": "Implement auth module",
      "filePaths": ["src/auth.py"],
      "taskType": "feat",
      "estimatedTokens": 5000
    }
  ],
  "commitMessage": "feat: add JWT authentication with login and signup",
  "reasoning": "Auth is a core feature. Using Opus for security-sensitive code."
}
</task_plan>
"""

    def test_returns_planner_result(self) -> None:
        planner, _ = self._make_planner(self._valid_response())
        result = planner.plan("Add user authentication")
        assert isinstance(result, PlannerResult)

    def test_parses_plan_correctly(self) -> None:
        planner, _ = self._make_planner(self._valid_response())
        result = planner.plan("Add user authentication")
        assert result.plan.title == "Add user authentication"
        assert result.plan.task_type == TaskType.FEAT
        assert len(result.plan.steps) == 2

    def test_tracks_usage(self) -> None:
        planner, _ = self._make_planner(self._valid_response())
        result = planner.plan("Add auth")
        assert result.usage.input_tokens == 1000
        assert result.usage.output_tokens == 500

    def test_calculates_cost(self) -> None:
        planner, _ = self._make_planner(self._valid_response())
        result = planner.plan("Add auth")
        assert result.cost_usd > 0

    def test_includes_usage_summary(self) -> None:
        planner, _ = self._make_planner(self._valid_response())
        result = planner.plan("Add auth")
        assert "tokens" in result.usage_summary

    def test_passes_adaptive_thinking(self) -> None:
        planner, client = self._make_planner(self._valid_response())
        planner.plan("Add auth")
        assert client.last_kwargs["thinking"] == {"type": "adaptive"}

    def test_passes_model_from_config(self) -> None:
        planner, client = self._make_planner(self._valid_response())
        planner.plan("Add auth")
        assert client.last_kwargs["model"] == "claude-opus-4-6"

    def test_passes_system_blocks(self) -> None:
        planner, client = self._make_planner(self._valid_response())
        planner.plan("Add auth")
        system = client.last_kwargs["system"]
        assert isinstance(system, list)
        assert system[0]["cache_control"] == {"type": "ephemeral"}

    def test_rejects_empty_request(self) -> None:
        planner, _ = self._make_planner(self._valid_response())
        with pytest.raises(ValueError, match="request must be a non-empty string"):
            planner.plan("")

    def test_raises_on_unparseable_response(self) -> None:
        planner, _ = self._make_planner("No task plan tags here.")
        with pytest.raises(ValueError, match="No <task_plan> tags found"):
            planner.plan("Do something")


class TestFakePlanner:
    """FakePlanner for testing downstream code without API calls."""

    def test_returns_deterministic_plan(self) -> None:
        fake = FakePlanner()
        result = fake.plan("Any request")
        assert isinstance(result, PlannerResult)
        assert result.plan.title == "Add test module"

    def test_records_last_request(self) -> None:
        fake = FakePlanner()
        fake.plan("My request")
        assert fake.last_request == "My request"

    def test_custom_plan(self) -> None:
        plan = TaskPlan(
            title="Custom",
            summary="A custom plan.",
            task_type=TaskType.FIX,
            priority=TaskPriority.HIGH,
            model_tier=ModelTier.OPUS,
        )
        fake = FakePlanner(plan=plan)
        result = fake.plan("Fix the bug")
        assert result.plan.title == "Custom"
        assert result.plan.task_type == TaskType.FIX

    def test_rejects_empty_request(self) -> None:
        fake = FakePlanner()
        with pytest.raises(ValueError, match="request must be a non-empty string"):
            fake.plan("")
