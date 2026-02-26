/**
 * Advanced XML prompt builder for task review (TypeScript).
 *
 * Builds structured prompts for the TypeScript reviewer using:
 * - XML tags for structure
 * - Chain of thought with thinking instructions
 * - Prompt caching via cache_control
 * - JSON output within XML tags
 *
 * Mirrors the Python prompt builder but specialized for the review phase.
 */

import {
  type TaskPlan,
  TaskType,
  taskPlanToJson,
} from "./spec";

interface ContentBlock {
  type: "text";
  text: string;
  cache_control?: { type: "ephemeral" };
}

const TASK_TYPE_DESCRIPTIONS: Record<string, string> = {
  [TaskType.FEAT]: "A new feature or capability",
  [TaskType.FIX]: "A bug fix",
  [TaskType.REFACTOR]: "Code restructuring with no behavior change",
  [TaskType.TEST]: "Adding or updating tests",
  [TaskType.DOCS]: "Documentation changes",
  [TaskType.CHORE]: "Maintenance tasks (deps, config, CI)",
  [TaskType.PERF]: "Performance improvement",
  [TaskType.CI]: "CI/CD pipeline changes",
};

function formatTaskTypes(): string {
  return Object.entries(TASK_TYPE_DESCRIPTIONS)
    .map(([type, desc]) => `   - ${type}: ${desc}`)
    .join("\n");
}

export function buildReviewerSystemPrompt(options?: {
  projectContext?: string;
}): ContentBlock[] {
  const staticPrompt = `<role>
You are a senior code reviewer specializing in task plan quality assurance.
You review task plans produced by an AI planner for correctness, completeness,
cost efficiency, and adherence to engineering best practices.
</role>

<instructions>
Given a TaskPlan JSON, review it for:

1. **Correctness**: Do the steps actually accomplish the stated goal?
2. **Completeness**: Are any steps missing? Are tests included (TDD)?
3. **Order**: Are steps in the right sequence? (Tests before implementation)
4. **Cost efficiency**: Is the model tier appropriate for the complexity?
   Are token estimates reasonable?
5. **Commit quality**: Does the commit message follow conventional commits?
   Valid types: ${Object.values(TaskType).join(", ")}
6. **File paths**: Do the paths look valid for the project structure?
7. **Priority**: Is the priority assessment accurate?

Conventional commit types:
${formatTaskTypes()}
</instructions>

<output_format>
Respond with a JSON object inside <task_review> tags:

\`\`\`json
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
\`\`\`

If verdict is "revise", include a corrected \`revisedPlan\` with the same
schema as the input plan. If "approve", set revisedPlan to null.
</output_format>

<constraints>
- Only flag issues that actually matter — no pedantic nits
- If the plan is good enough, approve it. Perfect is the enemy of good.
- Critical findings must be fixed before the plan can proceed
- Suggestions are nice-to-have improvements
- Always verify TDD order: tests should come before implementation
- Token estimates within 50% of reasonable are acceptable
- Never approve a plan with no test steps
</constraints>`;

  const blocks: ContentBlock[] = [
    {
      type: "text",
      text: staticPrompt,
      cache_control: { type: "ephemeral" },
    },
  ];

  if (options?.projectContext) {
    blocks.push({
      type: "text",
      text: `<project_context>\n${options.projectContext}\n</project_context>`,
    });
  }

  return blocks;
}

export function buildReviewerUserPrompt(plan: TaskPlan): string {
  const planJson = taskPlanToJson(plan);
  return `<task_plan_to_review>
${planJson}
</task_plan_to_review>

<thinking_instructions>
Before producing your review, consider:
1. Does this plan actually solve the stated problem?
2. Are there any missing steps or incorrect orderings?
3. Are the token and cost estimates realistic?
4. Would you approve this as a senior engineer?
</thinking_instructions>

Produce your review inside <task_review> tags.`;
}

export function buildPlannerSystemPrompt(options?: {
  projectContext?: string;
  fileTree?: string;
}): ContentBlock[] {
  const staticPrompt = `<role>
You are an expert software architect and task planner. You analyze requests
and produce structured task plans that combine conventional commit semantics
with token/cost budget awareness.
</role>

<instructions>
Given a user's request, produce a TaskPlan with:

1. Classify the work using conventional commit types:
${formatTaskTypes()}

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
Respond with a JSON object inside <task_plan> tags.
</output_format>

<constraints>
- Always start with the test step (TDD: red phase first)
- Group related changes into logical steps
- Each step should be independently committable
- Commit messages follow conventional commits format
- Token estimates should be conservative (overestimate by ~20%)
- Never propose changes to files you haven't been told about
</constraints>`;

  const blocks: ContentBlock[] = [
    {
      type: "text",
      text: staticPrompt,
      cache_control: { type: "ephemeral" },
    },
  ];

  if (options?.projectContext) {
    blocks.push({
      type: "text",
      text: `<project_context>\n${options.projectContext}\n</project_context>`,
    });
  }

  if (options?.fileTree) {
    blocks.push({
      type: "text",
      text: `<file_tree>\n${options.fileTree}\n</file_tree>`,
    });
  }

  return blocks;
}

export function buildPlannerUserPrompt(request: string): string {
  return `<request>
${request}
</request>

<thinking_instructions>
Before producing the task plan, reason through:
1. What type of work is this? (feat/fix/refactor/etc.)
2. What files will be affected?
3. What's the right order of steps? (tests first, then implementation)
4. What model tier is appropriate for the complexity?
5. How many tokens will each step need?
</thinking_instructions>

Produce your task plan inside <task_plan> tags.`;
}
