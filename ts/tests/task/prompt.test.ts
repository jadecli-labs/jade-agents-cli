/**
 * Tests for the XML prompt builder (TypeScript).
 *
 * Validates prompt structure, XML tags, cache_control, and content.
 */

import { describe, expect, it } from "bun:test";
import {
  buildPlannerSystemPrompt,
  buildPlannerUserPrompt,
  buildReviewerSystemPrompt,
  buildReviewerUserPrompt,
} from "../../task/prompt";
import {
  ModelTier,
  TaskPriority,
  TaskType,
  createTaskPlan,
  createTaskStep,
} from "../../task/spec";

describe("buildReviewerSystemPrompt", () => {
  it("returns list of blocks", () => {
    const blocks = buildReviewerSystemPrompt();
    expect(Array.isArray(blocks)).toBe(true);
    expect(blocks.length).toBeGreaterThanOrEqual(1);
  });

  it("first block has cache_control", () => {
    const blocks = buildReviewerSystemPrompt();
    expect(blocks[0].cache_control).toEqual({ type: "ephemeral" });
  });

  it("contains role tag", () => {
    const blocks = buildReviewerSystemPrompt();
    expect(blocks[0].text).toContain("<role>");
  });

  it("contains instructions tag", () => {
    const blocks = buildReviewerSystemPrompt();
    expect(blocks[0].text).toContain("<instructions>");
  });

  it("contains review criteria", () => {
    const blocks = buildReviewerSystemPrompt();
    const text = blocks[0].text;
    expect(text).toContain("Correctness");
    expect(text).toContain("Completeness");
    expect(text).toContain("Cost efficiency");
  });

  it("contains output_format tag", () => {
    const blocks = buildReviewerSystemPrompt();
    expect(blocks[0].text).toContain("<output_format>");
  });

  it("contains task types", () => {
    const blocks = buildReviewerSystemPrompt();
    const text = blocks[0].text;
    expect(text).toContain("feat:");
    expect(text).toContain("fix:");
    expect(text).toContain("refactor:");
  });

  it("adds project context as block", () => {
    const blocks = buildReviewerSystemPrompt({
      projectContext: "My project info",
    });
    expect(blocks.length).toBeGreaterThanOrEqual(2);
    expect(blocks[1].text).toContain("<project_context>");
    expect(blocks[1].text).toContain("My project info");
  });

  it("no extra blocks without context", () => {
    const blocks = buildReviewerSystemPrompt();
    expect(blocks.length).toBe(1);
  });
});

describe("buildReviewerUserPrompt", () => {
  const makePlan = () =>
    createTaskPlan({
      title: "Add feature",
      summary: "Adds a new feature.",
      taskType: TaskType.FEAT,
      priority: TaskPriority.MEDIUM,
      modelTier: ModelTier.SONNET,
      steps: [
        createTaskStep({ description: "Write tests", estimatedTokens: 2000 }),
      ],
      commitMessage: "feat: add feature",
    });

  it("wraps plan in tags", () => {
    const prompt = buildReviewerUserPrompt(makePlan());
    expect(prompt).toContain("<task_plan_to_review>");
    expect(prompt).toContain("</task_plan_to_review>");
  });

  it("contains plan JSON", () => {
    const prompt = buildReviewerUserPrompt(makePlan());
    expect(prompt).toContain('"title": "Add feature"');
  });

  it("contains thinking instructions", () => {
    const prompt = buildReviewerUserPrompt(makePlan());
    expect(prompt).toContain("<thinking_instructions>");
  });

  it("asks for review tags", () => {
    const prompt = buildReviewerUserPrompt(makePlan());
    expect(prompt).toContain("<task_review>");
  });
});

describe("buildPlannerSystemPrompt", () => {
  it("returns list of blocks", () => {
    const blocks = buildPlannerSystemPrompt();
    expect(Array.isArray(blocks)).toBe(true);
    expect(blocks.length).toBeGreaterThanOrEqual(1);
  });

  it("first block has cache_control", () => {
    const blocks = buildPlannerSystemPrompt();
    expect(blocks[0].cache_control).toEqual({ type: "ephemeral" });
  });

  it("contains role tag", () => {
    const blocks = buildPlannerSystemPrompt();
    expect(blocks[0].text).toContain("<role>");
  });

  it("adds file tree as block", () => {
    const blocks = buildPlannerSystemPrompt({
      fileTree: "src/\n  main.py",
    });
    const found = blocks.some((b) => b.text.includes("<file_tree>"));
    expect(found).toBe(true);
  });
});

describe("buildPlannerUserPrompt", () => {
  it("wraps request in tags", () => {
    const prompt = buildPlannerUserPrompt("Add auth module");
    expect(prompt).toContain("<request>");
    expect(prompt).toContain("Add auth module");
    expect(prompt).toContain("</request>");
  });

  it("contains thinking instructions", () => {
    const prompt = buildPlannerUserPrompt("Fix bug");
    expect(prompt).toContain("<thinking_instructions>");
  });

  it("asks for task_plan tags", () => {
    const prompt = buildPlannerUserPrompt("Fix bug");
    expect(prompt).toContain("<task_plan>");
  });
});
