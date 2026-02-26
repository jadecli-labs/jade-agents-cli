/**
 * Tests for the open task specification types.
 *
 * Validates factory function constraints, computed helpers,
 * serialization, and Object.freeze immutability.
 */

import { describe, expect, it } from "bun:test";
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
  createTokenBudget,
  createTokenUsage,
  estimatedTotalTokens,
  hasCriticalFindings,
  taskPlanToDict,
  taskPlanToJson,
  taskReviewToDict,
  taskReviewToJson,
  totalInputTokens,
  totalMaxTokens,
  totalTokens,
} from "../../task/spec";

describe("TaskType", () => {
  it("has feat value", () => {
    expect(TaskType.FEAT).toBe("feat");
  });

  it("has fix value", () => {
    expect(TaskType.FIX).toBe("fix");
  });

  it("all values are strings", () => {
    for (const value of Object.values(TaskType)) {
      expect(typeof value).toBe("string");
    }
  });
});

describe("createTokenBudget", () => {
  it("creates valid budget", () => {
    const b = createTokenBudget({
      maxInputTokens: 200_000,
      maxOutputTokens: 16_000,
      thinkingBudgetTokens: 10_000,
    });
    expect(b.maxInputTokens).toBe(200_000);
    expect(totalMaxTokens(b)).toBe(216_000);
  });

  it("rejects zero input", () => {
    expect(() =>
      createTokenBudget({ maxInputTokens: 0, maxOutputTokens: 100 })
    ).toThrow("maxInputTokens must be positive");
  });

  it("rejects zero output", () => {
    expect(() =>
      createTokenBudget({ maxInputTokens: 100, maxOutputTokens: 0 })
    ).toThrow("maxOutputTokens must be positive");
  });

  it("rejects negative thinking", () => {
    expect(() =>
      createTokenBudget({
        maxInputTokens: 100,
        maxOutputTokens: 100,
        thinkingBudgetTokens: -1,
      })
    ).toThrow("thinkingBudgetTokens must be non-negative");
  });

  it("defaults thinking to zero", () => {
    const b = createTokenBudget({
      maxInputTokens: 100,
      maxOutputTokens: 100,
    });
    expect(b.thinkingBudgetTokens).toBe(0);
  });

  it("is frozen", () => {
    const b = createTokenBudget({
      maxInputTokens: 100,
      maxOutputTokens: 100,
    });
    expect(() => {
      (b as any).maxInputTokens = 999;
    }).toThrow();
  });
});

describe("createTokenUsage", () => {
  it("computes total input tokens", () => {
    const u = createTokenUsage({
      inputTokens: 100,
      cacheCreationInputTokens: 50,
      cacheReadInputTokens: 200,
    });
    expect(totalInputTokens(u)).toBe(350);
  });

  it("computes total tokens", () => {
    const u = createTokenUsage({ inputTokens: 100, outputTokens: 50 });
    expect(totalTokens(u)).toBe(150);
  });

  it("defaults to zero", () => {
    const u = createTokenUsage();
    expect(totalTokens(u)).toBe(0);
  });

  it("includes cache in total", () => {
    const u = createTokenUsage({
      inputTokens: 10,
      outputTokens: 20,
      cacheReadInputTokens: 100,
    });
    expect(totalTokens(u)).toBe(130);
  });
});

describe("createTaskStep", () => {
  it("creates valid step", () => {
    const s = createTaskStep({
      description: "Write tests",
      filePaths: ["tests/test_x.py"],
      estimatedTokens: 2000,
    });
    expect(s.description).toBe("Write tests");
  });

  it("rejects empty description", () => {
    expect(() => createTaskStep({ description: "" })).toThrow(
      "description must be a non-empty string"
    );
  });

  it("rejects whitespace description", () => {
    expect(() => createTaskStep({ description: "   " })).toThrow(
      "description must be a non-empty string"
    );
  });

  it("defaults task type to feat", () => {
    const s = createTaskStep({ description: "Something" });
    expect(s.taskType).toBe(TaskType.FEAT);
  });

  it("defaults file paths to empty", () => {
    const s = createTaskStep({ description: "Something" });
    expect(s.filePaths).toEqual([]);
  });
});

describe("createTaskPlan", () => {
  const makePlan = (overrides?: Partial<Parameters<typeof createTaskPlan>[0]>) =>
    createTaskPlan({
      title: "Add feature X",
      summary: "Implements feature X with tests.",
      taskType: TaskType.FEAT,
      priority: TaskPriority.MEDIUM,
      modelTier: ModelTier.SONNET,
      steps: [
        createTaskStep({ description: "Write tests", estimatedTokens: 2000 }),
        createTaskStep({ description: "Implement", estimatedTokens: 3000 }),
      ],
      commitMessage: "feat: add feature X",
      ...overrides,
    });

  it("creates valid plan", () => {
    const p = makePlan();
    expect(p.title).toBe("Add feature X");
  });

  it("rejects empty title", () => {
    expect(() => makePlan({ title: "" })).toThrow(
      "title must be a non-empty string"
    );
  });

  it("rejects empty summary", () => {
    expect(() => makePlan({ summary: "" })).toThrow(
      "summary must be a non-empty string"
    );
  });

  it("computes estimated total tokens", () => {
    const p = makePlan();
    expect(estimatedTotalTokens(p)).toBe(5000);
  });

  it("serializes to dict with camelCase keys", () => {
    const p = makePlan();
    const d = taskPlanToDict(p);
    expect(d.title).toBe("Add feature X");
    expect(d.taskType).toBe("feat");
    expect(d.priority).toBe("medium");
    expect(d.modelTier).toBe("sonnet");
    expect((d.steps as any[]).length).toBe(2);
    expect(d.estimatedTotalTokens).toBe(5000);
  });

  it("serializes to valid JSON", () => {
    const p = makePlan();
    const parsed = JSON.parse(taskPlanToJson(p));
    expect(parsed.title).toBe("Add feature X");
  });

  it("steps have camelCase keys in dict", () => {
    const p = makePlan();
    const d = taskPlanToDict(p);
    const step = (d.steps as any[])[0];
    expect("filePaths" in step).toBe(true);
    expect("estimatedTokens" in step).toBe(true);
    expect("taskType" in step).toBe(true);
  });
});

describe("createReviewFinding", () => {
  it("creates valid finding", () => {
    const f = createReviewFinding({
      severity: FindingSeverity.CRITICAL,
      message: "Missing tests",
    });
    expect(f.severity).toBe("critical");
  });

  it("rejects invalid severity", () => {
    expect(() =>
      createReviewFinding({
        severity: "minor" as any,
        message: "Something",
      })
    ).toThrow("severity must be");
  });

  it("rejects empty message", () => {
    expect(() =>
      createReviewFinding({
        severity: FindingSeverity.NIT,
        message: "",
      })
    ).toThrow("message must be a non-empty string");
  });
});

describe("createTaskReview", () => {
  it("creates approve verdict", () => {
    const r = createTaskReview({ verdict: ReviewVerdict.APPROVE });
    expect(r.verdict).toBe("approve");
    expect(hasCriticalFindings(r)).toBe(false);
  });

  it("detects critical findings", () => {
    const r = createTaskReview({
      verdict: ReviewVerdict.REVISE,
      findings: [
        createReviewFinding({
          severity: FindingSeverity.CRITICAL,
          message: "Missing step",
        }),
      ],
    });
    expect(hasCriticalFindings(r)).toBe(true);
  });

  it("no critical with suggestions only", () => {
    const r = createTaskReview({
      verdict: ReviewVerdict.APPROVE,
      findings: [
        createReviewFinding({
          severity: FindingSeverity.SUGGESTION,
          message: "Consider caching",
        }),
      ],
    });
    expect(hasCriticalFindings(r)).toBe(false);
  });

  it("serializes to dict", () => {
    const r = createTaskReview({
      verdict: ReviewVerdict.REVISE,
      findings: [
        createReviewFinding({
          severity: FindingSeverity.CRITICAL,
          message: "Fix this",
          stepIndex: 0,
        }),
      ],
      reasoning: "Plan needs work",
    });
    const d = taskReviewToDict(r);
    expect(d.verdict).toBe("revise");
    expect((d.findings as any[]).length).toBe(1);
    expect((d.findings as any[])[0].stepIndex).toBe(0);
    expect(d.reasoning).toBe("Plan needs work");
  });

  it("serializes to valid JSON", () => {
    const r = createTaskReview({ verdict: ReviewVerdict.APPROVE });
    const parsed = JSON.parse(taskReviewToJson(r));
    expect(parsed.verdict).toBe("approve");
  });

  it("includes usage in dict", () => {
    const r = createTaskReview({
      verdict: ReviewVerdict.APPROVE,
      usage: createTokenUsage({ inputTokens: 500, outputTokens: 200 }),
    });
    const d = taskReviewToDict(r);
    expect((d.usage as any).inputTokens).toBe(500);
    expect((d.usage as any).outputTokens).toBe(200);
    expect((d.usage as any).totalTokens).toBe(700);
  });
});
