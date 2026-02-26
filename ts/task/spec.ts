/**
 * Open task specification — conventional commits + token budget awareness.
 *
 * TypeScript mirror of src/jade/task/spec.py. Defines the same data model
 * for interop between the Python planner and TypeScript reviewer.
 *
 * All types are readonly. Factory functions validate at creation time (fail-fast).
 */

// --- Enums as const objects (TypeScript pattern for string enums) ---

export const TaskType = {
  FEAT: "feat",
  FIX: "fix",
  REFACTOR: "refactor",
  TEST: "test",
  DOCS: "docs",
  CHORE: "chore",
  PERF: "perf",
  CI: "ci",
} as const;

export type TaskType = (typeof TaskType)[keyof typeof TaskType];

export const TaskPriority = {
  CRITICAL: "critical",
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
} as const;

export type TaskPriority = (typeof TaskPriority)[keyof typeof TaskPriority];

export const ModelTier = {
  OPUS: "opus",
  SONNET: "sonnet",
  HAIKU: "haiku",
} as const;

export type ModelTier = (typeof ModelTier)[keyof typeof ModelTier];

export const ReviewVerdict = {
  APPROVE: "approve",
  REVISE: "revise",
  REJECT: "reject",
} as const;

export type ReviewVerdict = (typeof ReviewVerdict)[keyof typeof ReviewVerdict];

export const FindingSeverity = {
  CRITICAL: "critical",
  SUGGESTION: "suggestion",
  NIT: "nit",
} as const;

export type FindingSeverity =
  (typeof FindingSeverity)[keyof typeof FindingSeverity];

// --- Data types ---

export interface TokenBudget {
  readonly maxInputTokens: number;
  readonly maxOutputTokens: number;
  readonly thinkingBudgetTokens: number;
}

export interface TokenUsage {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cacheCreationInputTokens: number;
  readonly cacheReadInputTokens: number;
}

export interface TaskStep {
  readonly description: string;
  readonly filePaths: readonly string[];
  readonly taskType: TaskType;
  readonly estimatedTokens: number;
}

export interface TaskPlan {
  readonly title: string;
  readonly summary: string;
  readonly taskType: TaskType;
  readonly priority: TaskPriority;
  readonly modelTier: ModelTier;
  readonly steps: readonly TaskStep[];
  readonly commitMessage: string;
  readonly reasoning: string;
}

export interface ReviewFinding {
  readonly severity: FindingSeverity;
  readonly message: string;
  readonly stepIndex: number | null;
}

export interface TaskReview {
  readonly verdict: ReviewVerdict;
  readonly findings: readonly ReviewFinding[];
  readonly revisedPlan: TaskPlan | null;
  readonly usage: TokenUsage;
  readonly reasoning: string;
}

// --- Factory functions (fail-fast validation) ---

export function createTokenBudget(params: {
  maxInputTokens: number;
  maxOutputTokens: number;
  thinkingBudgetTokens?: number;
}): TokenBudget {
  if (params.maxInputTokens <= 0) {
    throw new Error("maxInputTokens must be positive");
  }
  if (params.maxOutputTokens <= 0) {
    throw new Error("maxOutputTokens must be positive");
  }
  const thinking = params.thinkingBudgetTokens ?? 0;
  if (thinking < 0) {
    throw new Error("thinkingBudgetTokens must be non-negative");
  }
  return Object.freeze({
    maxInputTokens: params.maxInputTokens,
    maxOutputTokens: params.maxOutputTokens,
    thinkingBudgetTokens: thinking,
  });
}

export function createTokenUsage(
  params: Partial<TokenUsage> = {}
): TokenUsage {
  return Object.freeze({
    inputTokens: params.inputTokens ?? 0,
    outputTokens: params.outputTokens ?? 0,
    cacheCreationInputTokens: params.cacheCreationInputTokens ?? 0,
    cacheReadInputTokens: params.cacheReadInputTokens ?? 0,
  });
}

export function createTaskStep(params: {
  description: string;
  filePaths?: readonly string[];
  taskType?: TaskType;
  estimatedTokens?: number;
}): TaskStep {
  if (!params.description || !params.description.trim()) {
    throw new Error("description must be a non-empty string");
  }
  return Object.freeze({
    description: params.description,
    filePaths: Object.freeze([...(params.filePaths ?? [])]),
    taskType: params.taskType ?? TaskType.FEAT,
    estimatedTokens: params.estimatedTokens ?? 0,
  });
}

export function createTaskPlan(params: {
  title: string;
  summary: string;
  taskType: TaskType;
  priority: TaskPriority;
  modelTier: ModelTier;
  steps?: readonly TaskStep[];
  commitMessage?: string;
  reasoning?: string;
}): TaskPlan {
  if (!params.title || !params.title.trim()) {
    throw new Error("title must be a non-empty string");
  }
  if (!params.summary || !params.summary.trim()) {
    throw new Error("summary must be a non-empty string");
  }
  return Object.freeze({
    title: params.title,
    summary: params.summary,
    taskType: params.taskType,
    priority: params.priority,
    modelTier: params.modelTier,
    steps: Object.freeze([...(params.steps ?? [])]),
    commitMessage: params.commitMessage ?? "",
    reasoning: params.reasoning ?? "",
  });
}

export function createReviewFinding(params: {
  severity: FindingSeverity;
  message: string;
  stepIndex?: number | null;
}): ReviewFinding {
  if (!params.message || !params.message.trim()) {
    throw new Error("message must be a non-empty string");
  }
  const validSeverities: FindingSeverity[] = [
    FindingSeverity.CRITICAL,
    FindingSeverity.SUGGESTION,
    FindingSeverity.NIT,
  ];
  if (!validSeverities.includes(params.severity)) {
    throw new Error(
      `severity must be 'critical', 'suggestion', or 'nit', got '${params.severity}'`
    );
  }
  return Object.freeze({
    severity: params.severity,
    message: params.message,
    stepIndex: params.stepIndex ?? null,
  });
}

export function createTaskReview(params: {
  verdict: ReviewVerdict;
  findings?: readonly ReviewFinding[];
  revisedPlan?: TaskPlan | null;
  usage?: TokenUsage;
  reasoning?: string;
}): TaskReview {
  return Object.freeze({
    verdict: params.verdict,
    findings: Object.freeze([...(params.findings ?? [])]),
    revisedPlan: params.revisedPlan ?? null,
    usage: params.usage ?? createTokenUsage(),
    reasoning: params.reasoning ?? "",
  });
}

// --- Computed helpers ---

export function totalInputTokens(usage: TokenUsage): number {
  return (
    usage.inputTokens +
    usage.cacheCreationInputTokens +
    usage.cacheReadInputTokens
  );
}

export function totalTokens(usage: TokenUsage): number {
  return totalInputTokens(usage) + usage.outputTokens;
}

export function totalMaxTokens(budget: TokenBudget): number {
  return budget.maxInputTokens + budget.maxOutputTokens;
}

export function estimatedTotalTokens(plan: TaskPlan): number {
  return plan.steps.reduce((sum, s) => sum + s.estimatedTokens, 0);
}

export function hasCriticalFindings(review: TaskReview): boolean {
  return review.findings.some((f) => f.severity === FindingSeverity.CRITICAL);
}

// --- Serialization ---

export function taskPlanToDict(plan: TaskPlan): Record<string, unknown> {
  return {
    title: plan.title,
    summary: plan.summary,
    taskType: plan.taskType,
    priority: plan.priority,
    modelTier: plan.modelTier,
    steps: plan.steps.map((s) => ({
      description: s.description,
      filePaths: [...s.filePaths],
      taskType: s.taskType,
      estimatedTokens: s.estimatedTokens,
    })),
    commitMessage: plan.commitMessage,
    reasoning: plan.reasoning,
    estimatedTotalTokens: estimatedTotalTokens(plan),
  };
}

export function taskPlanToJson(plan: TaskPlan): string {
  return JSON.stringify(taskPlanToDict(plan), null, 2);
}

export function taskReviewToDict(
  review: TaskReview
): Record<string, unknown> {
  return {
    verdict: review.verdict,
    findings: review.findings.map((f) => ({
      severity: f.severity,
      message: f.message,
      stepIndex: f.stepIndex,
    })),
    revisedPlan: review.revisedPlan
      ? taskPlanToDict(review.revisedPlan)
      : null,
    reasoning: review.reasoning,
    usage: {
      inputTokens: review.usage.inputTokens,
      outputTokens: review.usage.outputTokens,
      cacheCreationInputTokens: review.usage.cacheCreationInputTokens,
      cacheReadInputTokens: review.usage.cacheReadInputTokens,
      totalTokens: totalTokens(review.usage),
    },
  };
}

export function taskReviewToJson(review: TaskReview): string {
  return JSON.stringify(taskReviewToDict(review), null, 2);
}
