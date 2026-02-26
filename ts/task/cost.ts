/**
 * Token cost calculator for Claude models (TypeScript).
 *
 * Pure math — no API calls. Mirrors src/jade/task/cost.py.
 * Uses official Anthropic pricing as of Feb 2026.
 */

import {
  type ModelTier,
  ModelTier as MT,
  type TokenUsage,
  totalInputTokens,
  totalTokens,
} from "./spec";

export interface ModelPricing {
  readonly inputPerMtok: number;
  readonly outputPerMtok: number;
  readonly cacheWritePerMtok: number;
  readonly cacheReadPerMtok: number;
}

export const PRICING: Record<ModelTier, ModelPricing> = {
  [MT.OPUS]: Object.freeze({
    inputPerMtok: 5.0,
    outputPerMtok: 25.0,
    cacheWritePerMtok: 6.25,
    cacheReadPerMtok: 0.5,
  }),
  [MT.SONNET]: Object.freeze({
    inputPerMtok: 3.0,
    outputPerMtok: 15.0,
    cacheWritePerMtok: 3.75,
    cacheReadPerMtok: 0.3,
  }),
  [MT.HAIKU]: Object.freeze({
    inputPerMtok: 1.0,
    outputPerMtok: 5.0,
    cacheWritePerMtok: 1.25,
    cacheReadPerMtok: 0.1,
  }),
};

const LONG_CONTEXT_INPUT_MULTIPLIER = 2.0;
const LONG_CONTEXT_OUTPUT_MULTIPLIER = 1.5;
export const LONG_CONTEXT_THRESHOLD = 200_000;

const MTOK = 1_000_000;

export function calculateCost(
  usage: TokenUsage,
  tier: ModelTier,
  longContext = false
): number {
  const pricing = PRICING[tier];

  let inputRate = pricing.inputPerMtok;
  let outputRate = pricing.outputPerMtok;

  if (longContext) {
    inputRate *= LONG_CONTEXT_INPUT_MULTIPLIER;
    outputRate *= LONG_CONTEXT_OUTPUT_MULTIPLIER;
  }

  const cost =
    (usage.inputTokens * inputRate) / MTOK +
    (usage.outputTokens * outputRate) / MTOK +
    (usage.cacheCreationInputTokens * pricing.cacheWritePerMtok) / MTOK +
    (usage.cacheReadInputTokens * pricing.cacheReadPerMtok) / MTOK;

  return Math.round(cost * 1_000_000) / 1_000_000;
}

export function estimateCost(
  inputTokens: number,
  outputTokens: number,
  tier: ModelTier
): number {
  const pricing = PRICING[tier];

  let inputRate = pricing.inputPerMtok;
  let outputRate = pricing.outputPerMtok;

  if (inputTokens > LONG_CONTEXT_THRESHOLD) {
    inputRate *= LONG_CONTEXT_INPUT_MULTIPLIER;
    outputRate *= LONG_CONTEXT_OUTPUT_MULTIPLIER;
  }

  const cost =
    (inputTokens * inputRate) / MTOK + (outputTokens * outputRate) / MTOK;
  return Math.round(cost * 1_000_000) / 1_000_000;
}

export function formatCost(costUsd: number): string {
  if (costUsd < 0.01) {
    return `$${costUsd.toFixed(4)}`;
  }
  return `$${costUsd.toFixed(2)}`;
}

export function formatUsageSummary(
  usage: TokenUsage,
  tier: ModelTier
): string {
  const cost = calculateCost(usage, tier);
  const total = totalTokens(usage);
  const totalIn = totalInputTokens(usage);

  const parts: string[] = [
    `${total.toLocaleString()} tokens`,
    `(${totalIn.toLocaleString()} in + ${usage.outputTokens.toLocaleString()} out)`,
    formatCost(cost),
  ];

  if (usage.cacheReadInputTokens > 0) {
    parts.push(
      `(${usage.cacheReadInputTokens.toLocaleString()} cached)`
    );
  }

  return parts.join(" · ");
}
