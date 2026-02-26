/**
 * Tests for the TypeScript task reviewer.
 *
 * Uses FakeReviewer and a mock MessageClient for testing without API calls.
 */

import { describe, expect, it } from "bun:test";
import {
  FakeReviewer,
  TaskReviewer,
  createReviewerConfig,
  type MessageClient,
  type ReviewerResult,
} from "../../task/reviewer";
import {
  FindingSeverity,
  ModelTier,
  ReviewVerdict,
  TaskPriority,
  TaskType,
  createReviewFinding,
  createTaskPlan,
  createTaskReview,
  createTaskStep,
} from "../../task/spec";

// --- Fake message client ---

function createFakeMessageClient(responseText: string): MessageClient & {
  lastParams: Record<string, unknown> | null;
} {
  const client = {
    lastParams: null as Record<string, unknown> | null,
    async create(params: Record<string, unknown>) {
      client.lastParams = params;
      return {
        content: [{ type: "text" as const, text: responseText }],
        usage: {
          input_tokens: 800,
          output_tokens: 300,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 0,
        },
      };
    },
  };
  return client;
}

const validResponse = `
I'll review this plan carefully.

<task_review>
{
  "verdict": "approve",
  "findings": [
    {
      "severity": "suggestion",
      "message": "Consider adding integration test step",
      "stepIndex": 1
    }
  ],
  "revisedPlan": null,
  "reasoning": "Plan is solid. TDD order correct. Token estimates reasonable."
}
</task_review>
`;

const reviseResponse = `
<task_review>
{
  "verdict": "revise",
  "findings": [
    {
      "severity": "critical",
      "message": "Tests must come before implementation",
      "stepIndex": 0
    }
  ],
  "revisedPlan": {
    "title": "Add auth module",
    "summary": "JWT auth with tests first.",
    "taskType": "feat",
    "priority": "high",
    "modelTier": "opus",
    "steps": [
      {
        "description": "Write auth tests",
        "filePaths": ["tests/test_auth.py"],
        "taskType": "test",
        "estimatedTokens": 2000
      },
      {
        "description": "Implement auth",
        "filePaths": ["src/auth.py"],
        "taskType": "feat",
        "estimatedTokens": 4000
      }
    ],
    "commitMessage": "feat: add JWT auth module",
    "reasoning": "Reordered to TDD."
  },
  "reasoning": "Implementation step was before tests."
}
</task_review>
`;

function makePlan() {
  return createTaskPlan({
    title: "Add auth module",
    summary: "Implement authentication.",
    taskType: TaskType.FEAT,
    priority: TaskPriority.HIGH,
    modelTier: ModelTier.OPUS,
    steps: [
      createTaskStep({
        description: "Write tests",
        filePaths: ["tests/test_auth.py"],
        taskType: TaskType.TEST,
        estimatedTokens: 2000,
      }),
      createTaskStep({
        description: "Implement auth",
        filePaths: ["src/auth.py"],
        taskType: TaskType.FEAT,
        estimatedTokens: 4000,
      }),
    ],
    commitMessage: "feat: add auth module",
  });
}

describe("createReviewerConfig", () => {
  it("creates valid config with defaults", () => {
    const config = createReviewerConfig();
    expect(config.model).toBe("claude-sonnet-4-6");
    expect(config.maxTokens).toBe(16_000);
    expect(config.modelTier).toBe(ModelTier.SONNET);
  });

  it("accepts overrides", () => {
    const config = createReviewerConfig({
      model: "claude-opus-4-6",
      modelTier: ModelTier.OPUS,
    });
    expect(config.model).toBe("claude-opus-4-6");
    expect(config.modelTier).toBe(ModelTier.OPUS);
  });

  it("rejects empty model", () => {
    expect(() => createReviewerConfig({ model: "" })).toThrow(
      "model must be a non-empty string"
    );
  });

  it("rejects zero maxTokens", () => {
    expect(() => createReviewerConfig({ maxTokens: 0 })).toThrow(
      "maxTokens must be positive"
    );
  });

  it("is frozen", () => {
    const config = createReviewerConfig();
    expect(() => {
      (config as any).model = "other";
    }).toThrow();
  });
});

describe("TaskReviewer", () => {
  it("returns reviewer result", async () => {
    const client = createFakeMessageClient(validResponse);
    const reviewer = new TaskReviewer(client);
    const result = await reviewer.review(makePlan());
    expect(result.review).toBeDefined();
    expect(result.usage).toBeDefined();
    expect(result.costUsd).toBeGreaterThanOrEqual(0);
  });

  it("parses approve verdict", async () => {
    const client = createFakeMessageClient(validResponse);
    const reviewer = new TaskReviewer(client);
    const result = await reviewer.review(makePlan());
    expect(result.review.verdict).toBe(ReviewVerdict.APPROVE);
  });

  it("parses findings", async () => {
    const client = createFakeMessageClient(validResponse);
    const reviewer = new TaskReviewer(client);
    const result = await reviewer.review(makePlan());
    expect(result.review.findings.length).toBe(1);
    expect(result.review.findings[0].severity).toBe("suggestion");
    expect(result.review.findings[0].stepIndex).toBe(1);
  });

  it("parses revise with revised plan", async () => {
    const client = createFakeMessageClient(reviseResponse);
    const reviewer = new TaskReviewer(client);
    const result = await reviewer.review(makePlan());
    expect(result.review.verdict).toBe(ReviewVerdict.REVISE);
    expect(result.review.revisedPlan).not.toBeNull();
    expect(result.review.revisedPlan!.title).toBe("Add auth module");
    expect(result.review.revisedPlan!.steps.length).toBe(2);
  });

  it("tracks usage", async () => {
    const client = createFakeMessageClient(validResponse);
    const reviewer = new TaskReviewer(client);
    const result = await reviewer.review(makePlan());
    expect(result.usage.inputTokens).toBe(800);
    expect(result.usage.outputTokens).toBe(300);
  });

  it("calculates cost", async () => {
    const client = createFakeMessageClient(validResponse);
    const reviewer = new TaskReviewer(client);
    const result = await reviewer.review(makePlan());
    expect(result.costUsd).toBeGreaterThan(0);
  });

  it("includes usage summary", async () => {
    const client = createFakeMessageClient(validResponse);
    const reviewer = new TaskReviewer(client);
    const result = await reviewer.review(makePlan());
    expect(result.usageSummary).toContain("tokens");
  });

  it("passes adaptive thinking", async () => {
    const client = createFakeMessageClient(validResponse);
    const reviewer = new TaskReviewer(client);
    await reviewer.review(makePlan());
    expect(client.lastParams!.thinking).toEqual({ type: "adaptive" });
  });

  it("passes model from config", async () => {
    const client = createFakeMessageClient(validResponse);
    const reviewer = new TaskReviewer(client, {
      model: "claude-opus-4-6",
    });
    await reviewer.review(makePlan());
    expect(client.lastParams!.model).toBe("claude-opus-4-6");
  });

  it("passes system blocks with cache_control", async () => {
    const client = createFakeMessageClient(validResponse);
    const reviewer = new TaskReviewer(client);
    await reviewer.review(makePlan());
    const system = client.lastParams!.system as any[];
    expect(Array.isArray(system)).toBe(true);
    expect(system[0].cache_control).toEqual({ type: "ephemeral" });
  });

  it("rejects plan with empty title", async () => {
    const client = createFakeMessageClient(validResponse);
    const reviewer = new TaskReviewer(client);
    const badPlan = { ...makePlan(), title: "" } as any;
    await expect(reviewer.review(badPlan)).rejects.toThrow();
  });

  it("raises on unparseable response", async () => {
    const client = createFakeMessageClient("No review tags here.");
    const reviewer = new TaskReviewer(client);
    await expect(reviewer.review(makePlan())).rejects.toThrow(
      "No <task_review> tags found"
    );
  });
});

describe("FakeReviewer", () => {
  it("returns deterministic review", async () => {
    const fake = new FakeReviewer();
    const result = await fake.doReview(makePlan());
    expect(result.review.verdict).toBe(ReviewVerdict.APPROVE);
  });

  it("records last plan", async () => {
    const fake = new FakeReviewer();
    const plan = makePlan();
    await fake.doReview(plan);
    expect(fake.lastPlan).toBe(plan);
  });

  it("accepts custom review", async () => {
    const customReview = createTaskReview({
      verdict: ReviewVerdict.REJECT,
      findings: [
        createReviewFinding({
          severity: FindingSeverity.CRITICAL,
          message: "Plan is fundamentally flawed",
        }),
      ],
    });
    const fake = new FakeReviewer(customReview);
    const result = await fake.doReview(makePlan());
    expect(result.review.verdict).toBe(ReviewVerdict.REJECT);
  });

  it("rejects plan with empty title", async () => {
    const fake = new FakeReviewer();
    const badPlan = { ...makePlan(), title: "" } as any;
    await expect(fake.doReview(badPlan)).rejects.toThrow();
  });
});
