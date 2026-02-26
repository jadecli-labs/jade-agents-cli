/**
 * TypeScript task reviewer — reviews plans produced by the Python planner.
 *
 * Uses the Anthropic SDK (or Vercel AI SDK) with adaptive thinking
 * to review a TaskPlan, check for issues, and optionally revise it.
 *
 * For testing: use FakeReviewer which returns deterministic reviews.
 */

import { calculateCost, formatUsageSummary } from "./cost";
import { buildReviewerSystemPrompt, buildReviewerUserPrompt } from "./prompt";
import {
  type FindingSeverity,
  type ModelTier,
  ModelTier as MT,
  type ReviewVerdict,
  ReviewVerdict as RV,
  type TaskPlan,
  type TaskReview,
  type TokenUsage,
  createReviewFinding,
  createTaskPlan,
  createTaskReview,
  createTaskStep,
  createTokenUsage,
} from "./spec";

// --- Types ---

export interface ReviewerConfig {
  readonly model: string;
  readonly maxTokens: number;
  readonly modelTier: ModelTier;
  readonly projectContext: string;
}

export interface ReviewerResult {
  readonly review: TaskReview;
  readonly usage: TokenUsage;
  readonly costUsd: number;
  readonly usageSummary: string;
  readonly rawResponse: string;
}

/**
 * Protocol for the Anthropic messages.create() interface.
 * Accepts any client that has a create method returning a response
 * with content blocks and usage data.
 */
export interface MessageClient {
  create(params: Record<string, unknown>): Promise<{
    content: Array<{ type: string; text?: string }>;
    usage: {
      input_tokens: number;
      output_tokens: number;
      cache_creation_input_tokens?: number | null;
      cache_read_input_tokens?: number | null;
    };
  }>;
}

// --- Parsing helpers ---

function extractJsonFromTags(
  text: string,
  tag: string
): Record<string, unknown> {
  const pattern = new RegExp(
    `<${tag}>\\s*({[\\s\\S]*})\\s*</${tag}>`
  );
  const match = text.match(pattern);
  if (!match) {
    throw new Error(`No <${tag}> tags found in response`);
  }
  return JSON.parse(match[1]) as Record<string, unknown>;
}

function parseTaskReview(data: Record<string, unknown>): TaskReview {
  const findings = (
    (data.findings as Array<Record<string, unknown>>) ?? []
  ).map((f) =>
    createReviewFinding({
      severity: (f.severity as FindingSeverity) ?? "suggestion",
      message: (f.message as string) ?? "",
      stepIndex: (f.stepIndex as number | null) ?? null,
    })
  );

  let revisedPlan: TaskPlan | null = null;
  if (data.revisedPlan && typeof data.revisedPlan === "object") {
    const rp = data.revisedPlan as Record<string, unknown>;
    const steps = (
      (rp.steps as Array<Record<string, unknown>>) ?? []
    ).map((s) =>
      createTaskStep({
        description: s.description as string,
        filePaths: (s.filePaths as string[]) ?? [],
        taskType: (s.taskType as string as TaskPlan["taskType"]) ?? "feat",
        estimatedTokens: (s.estimatedTokens as number) ?? 0,
      })
    );
    revisedPlan = createTaskPlan({
      title: rp.title as string,
      summary: rp.summary as string,
      taskType: (rp.taskType as string as TaskPlan["taskType"]) ?? "feat",
      priority:
        (rp.priority as string as TaskPlan["priority"]) ?? "medium",
      modelTier:
        (rp.modelTier as string as TaskPlan["modelTier"]) ?? "sonnet",
      steps,
      commitMessage: (rp.commitMessage as string) ?? "",
      reasoning: (rp.reasoning as string) ?? "",
    });
  }

  return createTaskReview({
    verdict: (data.verdict as ReviewVerdict) ?? RV.APPROVE,
    findings,
    revisedPlan,
    reasoning: (data.reasoning as string) ?? "",
  });
}

function extractText(response: {
  content: Array<{ type: string; text?: string }>;
}): string {
  for (const block of response.content) {
    if (block.type === "text" && block.text) {
      return block.text;
    }
  }
  return "";
}

function extractUsage(response: {
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens?: number | null;
    cache_read_input_tokens?: number | null;
  };
}): TokenUsage {
  return createTokenUsage({
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    cacheCreationInputTokens:
      response.usage.cache_creation_input_tokens ?? 0,
    cacheReadInputTokens:
      response.usage.cache_read_input_tokens ?? 0,
  });
}

// --- Reviewer implementation ---

const DEFAULT_CONFIG: ReviewerConfig = Object.freeze({
  model: "claude-sonnet-4-6",
  maxTokens: 16_000,
  modelTier: MT.SONNET,
  projectContext: "",
});

export function createReviewerConfig(
  overrides?: Partial<ReviewerConfig>
): ReviewerConfig {
  const config = { ...DEFAULT_CONFIG, ...overrides };
  if (!config.model || !config.model.trim()) {
    throw new Error("model must be a non-empty string");
  }
  if (config.maxTokens <= 0) {
    throw new Error("maxTokens must be positive");
  }
  return Object.freeze(config);
}

export class TaskReviewer {
  private readonly client: MessageClient;
  private readonly config: ReviewerConfig;

  constructor(client: MessageClient, config?: Partial<ReviewerConfig>) {
    this.client = client;
    this.config = createReviewerConfig(config);
  }

  async review(plan: TaskPlan): Promise<ReviewerResult> {
    if (!plan.title || !plan.title.trim()) {
      throw new Error("plan must have a non-empty title");
    }

    const systemBlocks = buildReviewerSystemPrompt({
      projectContext: this.config.projectContext,
    });

    const userPrompt = buildReviewerUserPrompt(plan);

    const response = await this.client.create({
      model: this.config.model,
      max_tokens: this.config.maxTokens,
      system: systemBlocks,
      thinking: { type: "adaptive" },
      messages: [{ role: "user", content: userPrompt }],
    });

    const rawText = extractText(response);
    const reviewData = extractJsonFromTags(rawText, "task_review");
    const review = parseTaskReview(reviewData);
    const usage = extractUsage(response);
    const costUsd = calculateCost(usage, this.config.modelTier);

    return {
      review: createTaskReview({
        ...review,
        usage,
      }),
      usage,
      costUsd,
      usageSummary: formatUsageSummary(usage, this.config.modelTier),
      rawResponse: rawText,
    };
  }
}

// --- Fake reviewer for testing ---

export class FakeReviewer {
  public lastPlan: TaskPlan | null = null;
  private readonly _review: TaskReview | undefined;

  constructor(review?: TaskReview) {
    this._review = review;
  }

  async doReview(plan: TaskPlan): Promise<ReviewerResult> {
    if (!plan.title || !plan.title.trim()) {
      throw new Error("plan must have a non-empty title");
    }
    this.lastPlan = plan;

    const result =
      this._review ??
      createTaskReview({
        verdict: RV.APPROVE,
        findings: [],
        reasoning: "Plan looks good. TDD order is correct.",
      });

    const usage = createTokenUsage({
      inputTokens: 800,
      outputTokens: 300,
    });

    return {
      review: result,
      usage,
      costUsd: 0.0069,
      usageSummary: "1,100 tokens · (800 in + 300 out) · $0.0069",
      rawResponse: '<task_review>{"verdict":"approve"}</task_review>',
    };
  }
}
