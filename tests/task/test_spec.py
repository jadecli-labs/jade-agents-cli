"""Tests for the open task specification types.

RED phase: validates all frozen dataclass constraints, enum values,
serialization, and computed properties.
"""

from __future__ import annotations

import json

import pytest

from jade.task.spec import (
    ModelTier,
    ReviewFinding,
    ReviewVerdict,
    TaskPlan,
    TaskPriority,
    TaskReview,
    TaskStep,
    TaskType,
    TokenBudget,
    TokenUsage,
)


class TestTaskType:
    """Conventional commit types map to string values."""

    def test_feat_value(self) -> None:
        assert TaskType.FEAT.value == "feat"

    def test_fix_value(self) -> None:
        assert TaskType.FIX.value == "fix"

    def test_all_types_are_strings(self) -> None:
        for tt in TaskType:
            assert isinstance(tt.value, str)

    def test_from_string(self) -> None:
        assert TaskType("refactor") == TaskType.REFACTOR


class TestTokenBudget:
    """Token budget validates at creation time."""

    def test_valid_budget(self) -> None:
        b = TokenBudget(max_input_tokens=200_000, max_output_tokens=16_000, thinking_budget_tokens=10_000)
        assert b.max_input_tokens == 200_000
        assert b.total_max_tokens == 216_000

    def test_rejects_zero_input(self) -> None:
        with pytest.raises(ValueError, match="max_input_tokens must be positive"):
            TokenBudget(max_input_tokens=0, max_output_tokens=100)

    def test_rejects_zero_output(self) -> None:
        with pytest.raises(ValueError, match="max_output_tokens must be positive"):
            TokenBudget(max_input_tokens=100, max_output_tokens=0)

    def test_rejects_negative_thinking(self) -> None:
        with pytest.raises(ValueError, match="thinking_budget_tokens must be non-negative"):
            TokenBudget(max_input_tokens=100, max_output_tokens=100, thinking_budget_tokens=-1)

    def test_default_thinking_is_zero(self) -> None:
        b = TokenBudget(max_input_tokens=100, max_output_tokens=100)
        assert b.thinking_budget_tokens == 0

    def test_is_frozen(self) -> None:
        b = TokenBudget(max_input_tokens=100, max_output_tokens=100)
        with pytest.raises((AttributeError, TypeError)):
            b.max_input_tokens = 999  # type: ignore[misc]


class TestTokenUsage:
    """Token usage tracks actual API call consumption."""

    def test_total_input_tokens(self) -> None:
        u = TokenUsage(input_tokens=100, cache_creation_input_tokens=50, cache_read_input_tokens=200)
        assert u.total_input_tokens == 350

    def test_total_tokens(self) -> None:
        u = TokenUsage(input_tokens=100, output_tokens=50)
        assert u.total_tokens == 150

    def test_defaults_to_zero(self) -> None:
        u = TokenUsage()
        assert u.total_tokens == 0

    def test_cache_tokens_in_total(self) -> None:
        u = TokenUsage(input_tokens=10, output_tokens=20, cache_read_input_tokens=100)
        assert u.total_tokens == 130


class TestTaskStep:
    """Task steps validate description at creation."""

    def test_valid_step(self) -> None:
        s = TaskStep(description="Write tests", file_paths=("tests/test_x.py",), estimated_tokens=2000)
        assert s.description == "Write tests"

    def test_rejects_empty_description(self) -> None:
        with pytest.raises(ValueError, match="description must be a non-empty string"):
            TaskStep(description="")

    def test_rejects_whitespace_description(self) -> None:
        with pytest.raises(ValueError, match="description must be a non-empty string"):
            TaskStep(description="   ")

    def test_default_task_type_is_feat(self) -> None:
        s = TaskStep(description="Do something")
        assert s.task_type == TaskType.FEAT

    def test_default_file_paths_is_empty(self) -> None:
        s = TaskStep(description="Do something")
        assert s.file_paths == ()


class TestTaskPlan:
    """Task plans validate title/summary and support serialization."""

    def _make_plan(self, **overrides: object) -> TaskPlan:
        defaults: dict[str, object] = {
            "title": "Add feature X",
            "summary": "Implements feature X with tests.",
            "task_type": TaskType.FEAT,
            "priority": TaskPriority.MEDIUM,
            "model_tier": ModelTier.SONNET,
            "steps": (
                TaskStep(description="Write tests", estimated_tokens=2000),
                TaskStep(description="Implement", estimated_tokens=3000),
            ),
            "commit_message": "feat: add feature X",
        }
        defaults.update(overrides)
        return TaskPlan(**defaults)  # type: ignore[arg-type]

    def test_valid_plan(self) -> None:
        p = self._make_plan()
        assert p.title == "Add feature X"

    def test_rejects_empty_title(self) -> None:
        with pytest.raises(ValueError, match="title must be a non-empty string"):
            self._make_plan(title="")

    def test_rejects_empty_summary(self) -> None:
        with pytest.raises(ValueError, match="summary must be a non-empty string"):
            self._make_plan(summary="")

    def test_estimated_total_tokens(self) -> None:
        p = self._make_plan()
        assert p.estimated_total_tokens == 5000

    def test_to_dict_structure(self) -> None:
        p = self._make_plan()
        d = p.to_dict()
        assert d["title"] == "Add feature X"
        assert d["taskType"] == "feat"
        assert d["priority"] == "medium"
        assert d["modelTier"] == "sonnet"
        assert len(d["steps"]) == 2
        assert d["estimatedTotalTokens"] == 5000

    def test_to_json_is_valid_json(self) -> None:
        p = self._make_plan()
        parsed = json.loads(p.to_json())
        assert parsed["title"] == "Add feature X"

    def test_steps_use_camel_case_keys(self) -> None:
        p = self._make_plan()
        d = p.to_dict()
        step = d["steps"][0]
        assert "filePaths" in step
        assert "estimatedTokens" in step
        assert "taskType" in step


class TestReviewFinding:
    """Review findings validate severity."""

    def test_valid_finding(self) -> None:
        f = ReviewFinding(severity="critical", message="Missing tests")
        assert f.severity == "critical"

    def test_rejects_invalid_severity(self) -> None:
        with pytest.raises(ValueError, match="severity must be"):
            ReviewFinding(severity="minor", message="Something")

    def test_rejects_empty_message(self) -> None:
        with pytest.raises(ValueError, match="message must be a non-empty string"):
            ReviewFinding(severity="nit", message="")


class TestTaskReview:
    """Task reviews track verdict, findings, and revised plan."""

    def test_approve_verdict(self) -> None:
        r = TaskReview(verdict=ReviewVerdict.APPROVE)
        assert r.verdict == ReviewVerdict.APPROVE
        assert not r.has_critical_findings

    def test_has_critical_findings(self) -> None:
        r = TaskReview(
            verdict=ReviewVerdict.REVISE,
            findings=(ReviewFinding(severity="critical", message="Missing step"),),
        )
        assert r.has_critical_findings

    def test_no_critical_with_suggestions(self) -> None:
        r = TaskReview(
            verdict=ReviewVerdict.APPROVE,
            findings=(ReviewFinding(severity="suggestion", message="Consider caching"),),
        )
        assert not r.has_critical_findings

    def test_to_dict_structure(self) -> None:
        r = TaskReview(
            verdict=ReviewVerdict.REVISE,
            findings=(ReviewFinding(severity="critical", message="Fix this", step_index=0),),
            reasoning="Plan needs work",
        )
        d = r.to_dict()
        assert d["verdict"] == "revise"
        assert len(d["findings"]) == 1
        assert d["findings"][0]["stepIndex"] == 0
        assert d["reasoning"] == "Plan needs work"

    def test_to_json_is_valid_json(self) -> None:
        r = TaskReview(verdict=ReviewVerdict.APPROVE)
        parsed = json.loads(r.to_json())
        assert parsed["verdict"] == "approve"

    def test_usage_in_dict(self) -> None:
        r = TaskReview(
            verdict=ReviewVerdict.APPROVE,
            usage=TokenUsage(input_tokens=500, output_tokens=200),
        )
        d = r.to_dict()
        assert d["usage"]["inputTokens"] == 500
        assert d["usage"]["outputTokens"] == 200
        assert d["usage"]["totalTokens"] == 700
