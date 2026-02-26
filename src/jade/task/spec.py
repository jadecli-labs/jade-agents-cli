"""Open task specification — conventional commits + token budget awareness.

Defines the data model for task planning and review. Combines
conventional commit semantics (what type of work) with Claude SDK
token/cost budgets (how much it will cost).

This is an open spec: all types are frozen dataclasses with JSON
serialization. No API calls, no side effects.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any


class TaskType(StrEnum):
    """Conventional commit types — maps 1:1 to commit prefixes."""

    FEAT = "feat"
    FIX = "fix"
    REFACTOR = "refactor"
    TEST = "test"
    DOCS = "docs"
    CHORE = "chore"
    PERF = "perf"
    CI = "ci"


class TaskPriority(StrEnum):
    """Priority levels — affects token budget allocation."""

    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class ModelTier(StrEnum):
    """Claude model tiers — determines pricing and capability."""

    OPUS = "opus"
    SONNET = "sonnet"
    HAIKU = "haiku"


class ReviewVerdict(StrEnum):
    """Reviewer's overall verdict on a task plan."""

    APPROVE = "approve"
    REVISE = "revise"
    REJECT = "reject"


@dataclass(frozen=True)
class TokenBudget:
    """Token budget for a single API call.

    Mirrors the Anthropic SDK Usage object fields.
    """

    max_input_tokens: int
    max_output_tokens: int
    thinking_budget_tokens: int = 0

    def __post_init__(self) -> None:
        if self.max_input_tokens <= 0:
            msg = "max_input_tokens must be positive"
            raise ValueError(msg)
        if self.max_output_tokens <= 0:
            msg = "max_output_tokens must be positive"
            raise ValueError(msg)
        if self.thinking_budget_tokens < 0:
            msg = "thinking_budget_tokens must be non-negative"
            raise ValueError(msg)

    @property
    def total_max_tokens(self) -> int:
        return self.max_input_tokens + self.max_output_tokens


@dataclass(frozen=True)
class TokenUsage:
    """Actual token usage from an API call.

    Maps directly to anthropic.types.Usage fields.
    """

    input_tokens: int = 0
    output_tokens: int = 0
    cache_creation_input_tokens: int = 0
    cache_read_input_tokens: int = 0

    @property
    def total_input_tokens(self) -> int:
        return self.input_tokens + self.cache_creation_input_tokens + self.cache_read_input_tokens

    @property
    def total_tokens(self) -> int:
        return self.total_input_tokens + self.output_tokens


@dataclass(frozen=True)
class TaskStep:
    """A single step in a task plan."""

    description: str
    file_paths: tuple[str, ...] = ()
    task_type: TaskType = TaskType.FEAT
    estimated_tokens: int = 0

    def __post_init__(self) -> None:
        if not self.description or not self.description.strip():
            msg = "description must be a non-empty string"
            raise ValueError(msg)


@dataclass(frozen=True)
class TaskPlan:
    """Complete task plan produced by the Python planner."""

    title: str
    summary: str
    task_type: TaskType
    priority: TaskPriority
    model_tier: ModelTier
    steps: tuple[TaskStep, ...] = ()
    commit_message: str = ""
    budget: TokenBudget | None = None
    reasoning: str = ""

    def __post_init__(self) -> None:
        if not self.title or not self.title.strip():
            msg = "title must be a non-empty string"
            raise ValueError(msg)
        if not self.summary or not self.summary.strip():
            msg = "summary must be a non-empty string"
            raise ValueError(msg)

    @property
    def estimated_total_tokens(self) -> int:
        return sum(s.estimated_tokens for s in self.steps)

    def to_dict(self) -> dict[str, Any]:
        """Serialize to plain dict for JSON/XML transport."""
        return {
            "title": self.title,
            "summary": self.summary,
            "taskType": self.task_type.value,
            "priority": self.priority.value,
            "modelTier": self.model_tier.value,
            "steps": [
                {
                    "description": s.description,
                    "filePaths": list(s.file_paths),
                    "taskType": s.task_type.value,
                    "estimatedTokens": s.estimated_tokens,
                }
                for s in self.steps
            ],
            "commitMessage": self.commit_message,
            "reasoning": self.reasoning,
            "estimatedTotalTokens": self.estimated_total_tokens,
        }

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), indent=2)


@dataclass(frozen=True)
class ReviewFinding:
    """A single finding from the TypeScript reviewer."""

    severity: str  # "critical" | "suggestion" | "nit"
    message: str
    step_index: int | None = None

    def __post_init__(self) -> None:
        if not self.message or not self.message.strip():
            msg = "message must be a non-empty string"
            raise ValueError(msg)
        if self.severity not in ("critical", "suggestion", "nit"):
            msg = f"severity must be 'critical', 'suggestion', or 'nit', got '{self.severity}'"
            raise ValueError(msg)


@dataclass(frozen=True)
class TaskReview:
    """Review result from the TypeScript reviewer."""

    verdict: ReviewVerdict
    findings: tuple[ReviewFinding, ...] = ()
    revised_plan: TaskPlan | None = None
    usage: TokenUsage = field(default_factory=TokenUsage)
    reasoning: str = ""

    @property
    def has_critical_findings(self) -> bool:
        return any(f.severity == "critical" for f in self.findings)

    def to_dict(self) -> dict[str, Any]:
        return {
            "verdict": self.verdict.value,
            "findings": [
                {
                    "severity": f.severity,
                    "message": f.message,
                    "stepIndex": f.step_index,
                }
                for f in self.findings
            ],
            "revisedPlan": self.revised_plan.to_dict() if self.revised_plan else None,
            "reasoning": self.reasoning,
            "usage": {
                "inputTokens": self.usage.input_tokens,
                "outputTokens": self.usage.output_tokens,
                "cacheCreationInputTokens": self.usage.cache_creation_input_tokens,
                "cacheReadInputTokens": self.usage.cache_read_input_tokens,
                "totalTokens": self.usage.total_tokens,
            },
        }

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), indent=2)
