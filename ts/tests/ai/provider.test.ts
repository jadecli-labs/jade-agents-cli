/**
 * Tests for AI SDK Anthropic provider configuration.
 *
 * RED phase: verifies provider setup before implementation.
 */

import { describe, expect, it } from "bun:test";
import {
  createJadeProvider,
  type JadeProviderConfig,
} from "../../ai/provider";

describe("createJadeProvider", () => {
  it("creates a provider with valid API key", () => {
    const provider = createJadeProvider({ apiKey: "sk-test" });
    expect(provider).toBeDefined();
  });

  it("throws on empty API key", () => {
    expect(() => createJadeProvider({ apiKey: "" })).toThrow();
  });

  it("throws on whitespace-only API key", () => {
    expect(() => createJadeProvider({ apiKey: "   " })).toThrow();
  });

  it("returns a provider with model accessor", () => {
    const provider = createJadeProvider({ apiKey: "sk-test" });
    // Provider should be callable to get a model instance
    const model = provider.model("claude-sonnet-4-20250514");
    expect(model).toBeDefined();
  });

  it("model has correct modelId", () => {
    const provider = createJadeProvider({ apiKey: "sk-test" });
    const model = provider.model("claude-sonnet-4-20250514");
    expect(model.modelId).toBe("claude-sonnet-4-20250514");
  });

  it("provider has default model configured", () => {
    const provider = createJadeProvider({ apiKey: "sk-test" });
    const defaultModel = provider.defaultModel();
    expect(defaultModel).toBeDefined();
    expect(defaultModel.modelId).toContain("claude");
  });
});

describe("Provider configuration", () => {
  it("supports custom base URL", () => {
    const provider = createJadeProvider({
      apiKey: "sk-test",
      baseURL: "https://custom.api.example.com",
    });
    expect(provider).toBeDefined();
  });

  it("supports cache control configuration", () => {
    const provider = createJadeProvider({
      apiKey: "sk-test",
      cacheControl: true,
    });
    expect(provider).toBeDefined();
  });
});
