"""Tests for the XML prompt builder.

Validates prompt structure: XML tags, cache_control, content blocks,
and proper formatting for both planner and reviewer prompts.
"""

from __future__ import annotations

from jade.task.prompt import (
    build_planner_system_prompt,
    build_planner_user_prompt,
    build_reviewer_system_prompt,
    build_reviewer_user_prompt,
)
from jade.task.spec import (
    ModelTier,
    TaskPlan,
    TaskPriority,
    TaskStep,
    TaskType,
)


class TestPlannerSystemPrompt:
    """Planner system prompt structure and content."""

    def test_returns_list_of_blocks(self) -> None:
        blocks = build_planner_system_prompt()
        assert isinstance(blocks, list)
        assert len(blocks) >= 1

    def test_first_block_has_cache_control(self) -> None:
        blocks = build_planner_system_prompt()
        assert blocks[0]["cache_control"] == {"type": "ephemeral"}

    def test_contains_role_tag(self) -> None:
        blocks = build_planner_system_prompt()
        assert "<role>" in blocks[0]["text"]

    def test_contains_instructions_tag(self) -> None:
        blocks = build_planner_system_prompt()
        assert "<instructions>" in blocks[0]["text"]

    def test_contains_output_format_tag(self) -> None:
        blocks = build_planner_system_prompt()
        assert "<output_format>" in blocks[0]["text"]

    def test_contains_constraints_tag(self) -> None:
        blocks = build_planner_system_prompt()
        assert "<constraints>" in blocks[0]["text"]

    def test_contains_task_types(self) -> None:
        blocks = build_planner_system_prompt()
        text = blocks[0]["text"]
        assert "feat:" in text
        assert "fix:" in text
        assert "refactor:" in text

    def test_project_context_added_as_block(self) -> None:
        blocks = build_planner_system_prompt(project_context="My project info")
        assert len(blocks) >= 2
        ctx_block = blocks[1]
        assert "<project_context>" in ctx_block["text"]
        assert "My project info" in ctx_block["text"]

    def test_file_tree_added_as_block(self) -> None:
        blocks = build_planner_system_prompt(file_tree="src/\n  main.py")
        found = any("<file_tree>" in b["text"] for b in blocks)
        assert found

    def test_no_extra_blocks_without_context(self) -> None:
        blocks = build_planner_system_prompt()
        assert len(blocks) == 1


class TestPlannerUserPrompt:
    """Planner user prompt wraps request in XML."""

    def test_wraps_request_in_tags(self) -> None:
        prompt = build_planner_user_prompt("Add auth module")
        assert "<request>" in prompt
        assert "Add auth module" in prompt
        assert "</request>" in prompt

    def test_contains_thinking_instructions(self) -> None:
        prompt = build_planner_user_prompt("Fix bug")
        assert "<thinking_instructions>" in prompt

    def test_asks_for_task_plan_tags(self) -> None:
        prompt = build_planner_user_prompt("Fix bug")
        assert "<task_plan>" in prompt


class TestReviewerSystemPrompt:
    """Reviewer system prompt structure."""

    def test_returns_list_of_blocks(self) -> None:
        blocks = build_reviewer_system_prompt()
        assert isinstance(blocks, list)
        assert len(blocks) >= 1

    def test_first_block_has_cache_control(self) -> None:
        blocks = build_reviewer_system_prompt()
        assert blocks[0]["cache_control"] == {"type": "ephemeral"}

    def test_contains_review_criteria(self) -> None:
        blocks = build_reviewer_system_prompt()
        text = blocks[0]["text"]
        assert "Correctness" in text
        assert "Completeness" in text
        assert "Cost efficiency" in text

    def test_contains_output_format(self) -> None:
        blocks = build_reviewer_system_prompt()
        text = blocks[0]["text"]
        assert "<task_review>" in text

    def test_project_context_added(self) -> None:
        blocks = build_reviewer_system_prompt(project_context="Context here")
        assert len(blocks) >= 2
        assert "Context here" in blocks[1]["text"]


class TestReviewerUserPrompt:
    """Reviewer user prompt includes the plan JSON."""

    def _make_plan(self) -> TaskPlan:
        return TaskPlan(
            title="Add feature",
            summary="Adds a new feature.",
            task_type=TaskType.FEAT,
            priority=TaskPriority.MEDIUM,
            model_tier=ModelTier.SONNET,
            steps=(TaskStep(description="Write tests", estimated_tokens=2000),),
            commit_message="feat: add feature",
        )

    def test_wraps_plan_in_tags(self) -> None:
        prompt = build_reviewer_user_prompt(self._make_plan())
        assert "<task_plan_to_review>" in prompt
        assert "</task_plan_to_review>" in prompt

    def test_contains_plan_json(self) -> None:
        prompt = build_reviewer_user_prompt(self._make_plan())
        assert '"title": "Add feature"' in prompt

    def test_contains_thinking_instructions(self) -> None:
        prompt = build_reviewer_user_prompt(self._make_plan())
        assert "<thinking_instructions>" in prompt

    def test_asks_for_review_tags(self) -> None:
        prompt = build_reviewer_user_prompt(self._make_plan())
        assert "<task_review>" in prompt
