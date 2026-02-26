/**
 * Tests for AI SDK chat handler (generateText / streamText).
 *
 * Uses MockLanguageModelV3 from ai/test for deterministic testing.
 */

import { describe, expect, it } from "bun:test";
import { MockLanguageModelV3 } from "ai/test";
import type { LanguageModelV3GenerateResult, LanguageModelV3StreamPart } from "@ai-sdk/provider";
import {
  jadeGenerateText,
  jadeStreamText,
  type JadeChatOptions,
} from "../../ai/chat";

function mockGenResult(text: string, inputTotal = 10, outputTotal = 5): LanguageModelV3GenerateResult {
  return {
    content: [{ type: "text", text }],
    finishReason: { unified: "stop", raw: undefined },
    usage: {
      inputTokens: { total: inputTotal, noCache: inputTotal, cacheRead: undefined, cacheWrite: undefined },
      outputTokens: { total: outputTotal, text: outputTotal, reasoning: undefined },
    },
    warnings: [],
  };
}

describe("jadeGenerateText", () => {
  it("generates text with a model", async () => {
    const mockModel = new MockLanguageModelV3({
      doGenerate: mockGenResult("Hello from Jade!"),
    });

    const result = await jadeGenerateText({
      model: mockModel,
      messages: [{ role: "user", content: "Hello" }],
    });

    expect(result.text).toBe("Hello from Jade!");
  });

  it("returns usage information", async () => {
    const mockModel = new MockLanguageModelV3({
      doGenerate: mockGenResult("Response", 15, 8),
    });

    const result = await jadeGenerateText({
      model: mockModel,
      messages: [{ role: "user", content: "Hi" }],
    });

    expect(result.usage).toBeDefined();
    expect(result.usage.inputTokens).toBe(15);
    expect(result.usage.outputTokens).toBe(8);
  });

  it("returns finish reason", async () => {
    const mockModel = new MockLanguageModelV3({
      doGenerate: mockGenResult("Done", 5, 1),
    });

    const result = await jadeGenerateText({
      model: mockModel,
      messages: [{ role: "user", content: "Test" }],
    });

    expect(result.finishReason).toBe("stop");
  });

  it("propagates model errors (fail fast)", async () => {
    const mockModel = new MockLanguageModelV3({
      doGenerate: async () => {
        throw new Error("API rate limit exceeded");
      },
    });

    await expect(
      jadeGenerateText({
        model: mockModel,
        messages: [{ role: "user", content: "Test" }],
      })
    ).rejects.toThrow("API rate limit exceeded");
  });

  it("supports system message", async () => {
    let receivedPrompt: unknown;
    const mockModel = new MockLanguageModelV3({
      doGenerate: async (options) => {
        receivedPrompt = options.prompt;
        return mockGenResult("I am Jade", 20, 3);
      },
    });

    await jadeGenerateText({
      model: mockModel,
      system: "You are Jade, a bilateral learning partner.",
      messages: [{ role: "user", content: "Who are you?" }],
    });

    expect(receivedPrompt).toBeDefined();
  });
});

describe("jadeStreamText", () => {
  it("streams text responses", async () => {
    const mockModel = new MockLanguageModelV3({
      doStream: async () => ({
        stream: new ReadableStream<LanguageModelV3StreamPart>({
          start(controller) {
            controller.enqueue({ type: "text-delta", id: "1", delta: "Hello " });
            controller.enqueue({ type: "text-delta", id: "2", delta: "World" });
            controller.enqueue({
              type: "finish",
              finishReason: { unified: "stop", raw: undefined },
              usage: {
                inputTokens: { total: 5, noCache: 5, cacheRead: undefined, cacheWrite: undefined },
                outputTokens: { total: 2, text: 2, reasoning: undefined },
              },
            });
            controller.close();
          },
        }),
        rawCall: { rawPrompt: null, rawSettings: {} },
      }),
    });

    const result = await jadeStreamText({
      model: mockModel,
      messages: [{ role: "user", content: "Hello" }],
    });

    const chunks: string[] = [];
    for await (const chunk of result.textStream) {
      chunks.push(chunk);
    }
    expect(chunks.join("")).toBe("Hello World");
  });

  it("produces empty text when model stream fails", async () => {
    const mockModel = new MockLanguageModelV3({
      doStream: async () => {
        throw new Error("Stream connection failed");
      },
    });

    const result = await jadeStreamText({
      model: mockModel,
      messages: [{ role: "user", content: "Test" }],
    });

    // AI SDK swallows doStream errors — stream produces no chunks
    const chunks: string[] = [];
    for await (const chunk of result.textStream) {
      chunks.push(chunk);
    }
    expect(chunks.length).toBe(0);
  });
});
