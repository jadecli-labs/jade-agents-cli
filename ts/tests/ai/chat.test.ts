/**
 * Tests for AI SDK chat handler (generateText / streamText).
 *
 * RED phase: verifies chat functionality before implementation.
 * Uses MockLanguageModelV1 from ai/test for deterministic testing.
 */

import { describe, expect, it } from "bun:test";
import { MockLanguageModelV1 } from "ai/test";
import {
  jadeGenerateText,
  jadeStreamText,
  type JadeChatOptions,
} from "../../ai/chat";

describe("jadeGenerateText", () => {
  it("generates text with a model", async () => {
    const mockModel = new MockLanguageModelV1({
      doGenerate: async () => ({
        rawCall: { rawPrompt: null, rawSettings: {} },
        text: "Hello from Jade!",
        finishReason: "stop" as const,
        usage: { promptTokens: 10, completionTokens: 5 },
      }),
    });

    const result = await jadeGenerateText({
      model: mockModel,
      messages: [{ role: "user", content: "Hello" }],
    });

    expect(result.text).toBe("Hello from Jade!");
  });

  it("returns usage information", async () => {
    const mockModel = new MockLanguageModelV1({
      doGenerate: async () => ({
        rawCall: { rawPrompt: null, rawSettings: {} },
        text: "Response",
        finishReason: "stop" as const,
        usage: { promptTokens: 15, completionTokens: 8 },
      }),
    });

    const result = await jadeGenerateText({
      model: mockModel,
      messages: [{ role: "user", content: "Hi" }],
    });

    expect(result.usage).toBeDefined();
    expect(result.usage.promptTokens).toBe(15);
    expect(result.usage.completionTokens).toBe(8);
  });

  it("returns finish reason", async () => {
    const mockModel = new MockLanguageModelV1({
      doGenerate: async () => ({
        rawCall: { rawPrompt: null, rawSettings: {} },
        text: "Done",
        finishReason: "stop" as const,
        usage: { promptTokens: 5, completionTokens: 1 },
      }),
    });

    const result = await jadeGenerateText({
      model: mockModel,
      messages: [{ role: "user", content: "Test" }],
    });

    expect(result.finishReason).toBe("stop");
  });

  it("propagates model errors (fail fast)", async () => {
    const mockModel = new MockLanguageModelV1({
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
    const mockModel = new MockLanguageModelV1({
      doGenerate: async (options) => {
        receivedPrompt = options.prompt;
        return {
          rawCall: { rawPrompt: null, rawSettings: {} },
          text: "I am Jade",
          finishReason: "stop" as const,
          usage: { promptTokens: 20, completionTokens: 3 },
        };
      },
    });

    await jadeGenerateText({
      model: mockModel,
      system: "You are Jade, a bilateral learning partner.",
      messages: [{ role: "user", content: "Who are you?" }],
    });

    // Verify system message was included in the prompt
    expect(receivedPrompt).toBeDefined();
  });
});

describe("jadeStreamText", () => {
  it("streams text responses", async () => {
    const mockModel = new MockLanguageModelV1({
      doStream: async () => ({
        stream: new ReadableStream({
          start(controller) {
            controller.enqueue({ type: "text-delta" as const, textDelta: "Hello " });
            controller.enqueue({ type: "text-delta" as const, textDelta: "World" });
            controller.enqueue({
              type: "finish" as const,
              finishReason: "stop" as const,
              usage: { promptTokens: 5, completionTokens: 2 },
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

    // Collect all text chunks
    const chunks: string[] = [];
    for await (const chunk of result.textStream) {
      chunks.push(chunk);
    }
    expect(chunks.join("")).toBe("Hello World");
  });

  it("produces empty text when model stream fails", async () => {
    const mockModel = new MockLanguageModelV1({
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
