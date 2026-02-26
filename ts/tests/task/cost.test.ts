/**
 * Tests for the token cost calculator (TypeScript).
 *
 * Pure math — mirrors tests/task/test_cost.py.
 */

import { describe, expect, it } from "bun:test";
import {
  PRICING,
  calculateCost,
  estimateCost,
  formatCost,
  formatUsageSummary,
} from "../../task/cost";
import { ModelTier, createTokenUsage } from "../../task/spec";

describe("calculateCost", () => {
  it("sonnet basic", () => {
    const usage = createTokenUsage({ inputTokens: 1000, outputTokens: 500 });
    const cost = calculateCost(usage, ModelTier.SONNET);
    expect(cost).toBe(0.0105);
  });

  it("opus basic", () => {
    const usage = createTokenUsage({ inputTokens: 1000, outputTokens: 500 });
    const cost = calculateCost(usage, ModelTier.OPUS);
    expect(cost).toBe(0.0175);
  });

  it("haiku basic", () => {
    const usage = createTokenUsage({ inputTokens: 1000, outputTokens: 500 });
    const cost = calculateCost(usage, ModelTier.HAIKU);
    expect(cost).toBe(0.0035);
  });

  it("cache write cost", () => {
    const usage = createTokenUsage({
      cacheCreationInputTokens: 1_000_000,
    });
    const cost = calculateCost(usage, ModelTier.SONNET);
    expect(cost).toBe(3.75);
  });

  it("cache read cost", () => {
    const usage = createTokenUsage({
      cacheReadInputTokens: 1_000_000,
    });
    const cost = calculateCost(usage, ModelTier.SONNET);
    expect(cost).toBe(0.3);
  });

  it("cache read 90% discount", () => {
    const baseUsage = createTokenUsage({ inputTokens: 1_000_000 });
    const cachedUsage = createTokenUsage({
      cacheReadInputTokens: 1_000_000,
    });
    const baseCost = calculateCost(baseUsage, ModelTier.OPUS);
    const cachedCost = calculateCost(cachedUsage, ModelTier.OPUS);
    expect(cachedCost).toBe(baseCost * 0.1);
  });

  it("long context multiplier", () => {
    const usage = createTokenUsage({ inputTokens: 1000, outputTokens: 500 });
    const normal = calculateCost(usage, ModelTier.SONNET, false);
    const long = calculateCost(usage, ModelTier.SONNET, true);
    expect(long).toBeGreaterThan(normal);
    expect(long).toBe(0.01725);
  });

  it("zero usage", () => {
    const usage = createTokenUsage();
    const cost = calculateCost(usage, ModelTier.OPUS);
    expect(cost).toBe(0);
  });

  it("mixed cache and regular", () => {
    const usage = createTokenUsage({
      inputTokens: 500,
      outputTokens: 200,
      cacheCreationInputTokens: 300,
      cacheReadInputTokens: 1000,
    });
    const cost = calculateCost(usage, ModelTier.OPUS);
    expect(cost).toBe(0.009875);
  });
});

describe("estimateCost", () => {
  it("sonnet estimate", () => {
    const cost = estimateCost(10_000, 2_000, ModelTier.SONNET);
    expect(cost).toBe(0.06);
  });

  it("long context auto detected", () => {
    const normal = estimateCost(100_000, 1_000, ModelTier.SONNET);
    const long = estimateCost(300_000, 1_000, ModelTier.SONNET);
    expect(long).toBeGreaterThan(normal * 2);
  });
});

describe("formatCost", () => {
  it("small cost", () => {
    expect(formatCost(0.0035)).toBe("$0.0035");
  });

  it("larger cost", () => {
    expect(formatCost(1.5)).toBe("$1.50");
  });

  it("penny threshold", () => {
    expect(formatCost(0.01)).toBe("$0.01");
  });

  it("sub penny", () => {
    expect(formatCost(0.009)).toBe("$0.0090");
  });
});

describe("formatUsageSummary", () => {
  it("basic summary", () => {
    const usage = createTokenUsage({ inputTokens: 1000, outputTokens: 500 });
    const summary = formatUsageSummary(usage, ModelTier.SONNET);
    expect(summary).toContain("1,500 tokens");
    expect(summary).toContain("1,000 in");
    expect(summary).toContain("500 out");
  });

  it("cached summary", () => {
    const usage = createTokenUsage({
      inputTokens: 100,
      outputTokens: 50,
      cacheReadInputTokens: 900,
    });
    const summary = formatUsageSummary(usage, ModelTier.SONNET);
    expect(summary).toContain("900 cached");
  });

  it("includes cost", () => {
    const usage = createTokenUsage({ inputTokens: 1000, outputTokens: 500 });
    const summary = formatUsageSummary(usage, ModelTier.OPUS);
    expect(summary).toContain("$");
  });
});

describe("pricing completeness", () => {
  it("all tiers have pricing", () => {
    for (const tier of Object.values(ModelTier)) {
      const p = PRICING[tier];
      expect(p).toBeDefined();
      expect(p.inputPerMtok).toBeGreaterThan(0);
      expect(p.outputPerMtok).toBeGreaterThan(0);
      expect(p.cacheWritePerMtok).toBeGreaterThan(0);
      expect(p.cacheReadPerMtok).toBeGreaterThan(0);
    }
  });
});
