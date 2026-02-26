"""Advanced XML prompt builder for task planning.

Builds structured prompts using Anthropic's recommended patterns:
- XML tags for structure (<instructions>, <context>, <examples>)
- Chain of thought with explicit <thinking>/<answer> separation
- Extended thinking (adaptive) for deep reasoning
- Prompt caching via cache_control on system blocks
- Token budget awareness in the prompt itself
"""

from __future__ import annotations

from typing import Any

from jade.task.spec import ModelTier, TaskPlan, TaskType

# Conventional commit type descriptions — injected into the prompt
_TASK_TYPE_DESCRIPTIONS: dict[TaskType, str] = {
    TaskType.FEAT: "A new feature or capability",
    TaskType.FIX: "A bug fix",
    TaskType.REFACTOR: "Code restructuring with no behavior change",
    TaskType.TEST: "Adding or updating tests",
    TaskType.DOCS: "Documentation changes",
    TaskType.CHORE: "Maintenance tasks (deps, config, CI)",
    TaskType.PERF: "Performance improvement",
    TaskType.CI: "CI/CD pipeline changes",
}


def build_planner_system_prompt(
    *,
    project_context: str = "",
    file_tree: str = "",
    model_tier: ModelTier = ModelTier.OPUS,
) -> list[dict[str, Any]]:
    """Build the system prompt for the Python task planner.

    Returns a list of content blocks suitable for the Anthropic SDK
    `system` parameter, with cache_control on the static portion.

    Args:
        project_context: CLAUDE.md or project description.
        file_tree: File listing for the project.
        model_tier: Target model for cost estimation.
    """
    static_prompt = f"""\
<role>
You are an expert software architect and task planner. You analyze requests
and produce structured task plans that combine conventional commit semantics
with token/cost budget awareness.
</role>

<instructions>
Given a user's request, produce a TaskPlan with:

1. Classify the work using conventional commit types:
{_format_task_types()}

2. Break the work into ordered steps. Each step has:
   - A clear description of what to do
   - File paths that will be touched
   - The conventional commit type for that step
   - An estimated token count for the AI work needed

3. Write a conventional commit message for the overall change.

4. Select the appropriate model tier based on complexity:
   - opus: Complex architecture, multi-file refactors, security-sensitive
   - sonnet: Standard features, bug fixes, moderate complexity
   - haiku: Simple changes, docs, config, formatting

5. Assess priority: critical (blocking), high (important), medium (normal), low (nice-to-have)

6. Estimate token budgets realistically:
   - Simple file edits: 500–2,000 tokens
   - New module with tests: 3,000–8,000 tokens
   - Complex multi-file feature: 10,000–30,000 tokens
   - Architecture redesign: 30,000–100,000 tokens
</instructions>

<output_format>
Respond with a JSON object inside <task_plan> tags. The JSON must match this schema:

```json
{{
  "title": "Short imperative title (under 70 chars)",
  "summary": "1-3 sentence description of what and why",
  "taskType": "feat|fix|refactor|test|docs|chore|perf|ci",
  "priority": "critical|high|medium|low",
  "modelTier": "opus|sonnet|haiku",
  "steps": [
    {{
      "description": "What to do in this step",
      "filePaths": ["src/path/to/file.py"],
      "taskType": "feat|fix|refactor|test|docs|chore|perf|ci",
      "estimatedTokens": 2000
    }}
  ],
  "commitMessage": "feat: add task planning module with cost awareness",
  "reasoning": "Why these choices were made"
}}
```
</output_format>

<constraints>
- Always start with the test step (TDD: red phase first)
- Group related changes into logical steps
- Each step should be independently committable
- Commit messages follow conventional commits format
- Token estimates should be conservative (overestimate by ~20%)
- Never propose changes to files you haven't been told about
</constraints>"""

    blocks: list[dict[str, Any]] = [
        {
            "type": "text",
            "text": static_prompt,
            "cache_control": {"type": "ephemeral"},
        },
    ]

    if project_context:
        blocks.append(
            {
                "type": "text",
                "text": f"<project_context>\n{project_context}\n</project_context>",
            }
        )

    if file_tree:
        blocks.append(
            {
                "type": "text",
                "text": f"<file_tree>\n{file_tree}\n</file_tree>",
            }
        )

    return blocks


def build_planner_user_prompt(request: str) -> str:
    """Build the user message for the planner.

    Uses XML tags for clarity and asks for chain-of-thought reasoning.
    """
    return f"""\
<request>
{request}
</request>

<thinking_instructions>
Before producing the task plan, reason through:
1. What type of work is this? (feat/fix/refactor/etc.)
2. What files will be affected?
3. What's the right order of steps? (tests first, then implementation)
4. What model tier is appropriate for the complexity?
5. How many tokens will each step need?
</thinking_instructions>

Produce your task plan inside <task_plan> tags."""


def build_reviewer_system_prompt(
    *,
    project_context: str = "",
) -> list[dict[str, Any]]:
    """Build the system prompt for the TypeScript task reviewer.

    The reviewer checks a plan for correctness, completeness, and
    cost efficiency before it's proposed to the user.
    """
    static_prompt = """\
<role>
You are a senior code reviewer specializing in task plan quality assurance.
You review task plans for correctness, completeness, cost efficiency,
and adherence to best practices.
</role>

<instructions>
Given a TaskPlan JSON, review it for:

1. **Correctness**: Do the steps actually accomplish the stated goal?
2. **Completeness**: Are any steps missing? Are tests included?
3. **Order**: Are steps in the right sequence? (TDD: tests before implementation)
4. **Cost efficiency**: Is the model tier appropriate? Are token estimates reasonable?
5. **Commit quality**: Does the commit message follow conventional commits?
6. **File paths**: Do the paths look valid for the project structure?
7. **Priority**: Is the priority assessment accurate?
</instructions>

<output_format>
Respond with a JSON object inside <task_review> tags:

```json
{
  "verdict": "approve|revise|reject",
  "findings": [
    {
      "severity": "critical|suggestion|nit",
      "message": "What's wrong and how to fix it",
      "stepIndex": 0
    }
  ],
  "revisedPlan": null,
  "reasoning": "Overall assessment"
}
```

If verdict is "revise", include a corrected `revisedPlan` with the same schema
as the input plan. If "approve", set revisedPlan to null.
</output_format>

<constraints>
- Only flag issues that actually matter — no pedantic nits
- If the plan is good enough, approve it. Perfect is the enemy of good.
- Critical findings must be fixed before the plan can proceed
- Suggestions are nice-to-have improvements
- Always verify TDD order: tests should come before implementation
- Token estimates within 50% of reasonable are acceptable
</constraints>"""

    blocks: list[dict[str, Any]] = [
        {
            "type": "text",
            "text": static_prompt,
            "cache_control": {"type": "ephemeral"},
        },
    ]

    if project_context:
        blocks.append(
            {
                "type": "text",
                "text": f"<project_context>\n{project_context}\n</project_context>",
            }
        )

    return blocks


def build_reviewer_user_prompt(plan: TaskPlan) -> str:
    """Build the user message for the reviewer."""
    plan_json = plan.to_json()
    return f"""\
<task_plan_to_review>
{plan_json}
</task_plan_to_review>

<thinking_instructions>
Before producing your review, consider:
1. Does this plan actually solve the stated problem?
2. Are there any missing steps or incorrect orderings?
3. Are the token and cost estimates realistic?
4. Would you approve this as a senior engineer?
</thinking_instructions>

Produce your review inside <task_review> tags."""


def _format_task_types() -> str:
    """Format task type descriptions as an indented list."""
    lines = []
    for tt, desc in _TASK_TYPE_DESCRIPTIONS.items():
        lines.append(f"   - {tt.value}: {desc}")
    return "\n".join(lines)
