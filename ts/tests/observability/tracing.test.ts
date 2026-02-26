/**
 * Tests for tracing service.
 */

import { describe, expect, it, beforeEach } from "bun:test";
import { TracingService, type TracingConfig } from "../../observability/tracing";

describe("TracingConfig validation", () => {
  it("throws on empty trackingUri", () => {
    expect(
      () => new TracingService({ trackingUri: "", useFake: true })
    ).toThrow();
  });

  it("creates service with valid config", () => {
    const service = new TracingService({
      trackingUri: "http://localhost:5000",
      useFake: true,
    });
    expect(service).toBeDefined();
  });
});

describe("Tracing spans", () => {
  let service: TracingService;

  beforeEach(() => {
    service = new TracingService({
      trackingUri: "http://localhost:5000",
      useFake: true,
    });
  });

  it("records tool call span", () => {
    service.recordToolCall({
      toolName: "create_entities",
      input: { entities: [{ name: "test" }] },
      output: { created: ["test"] },
      durationMs: 42.5,
    });
    const spans = service.getRecordedSpans();
    expect(spans).toHaveLength(1);
    expect(spans[0].toolName).toBe("create_entities");
  });

  it("records token usage", () => {
    service.recordTokenUsage({
      promptTokens: 100,
      completionTokens: 50,
      model: "claude-sonnet-4-20250514",
    });
    const spans = service.getRecordedSpans();
    expect(spans).toHaveLength(1);
    expect(spans[0].promptTokens).toBe(100);
  });

  it("records multiple spans", () => {
    service.recordToolCall({
      toolName: "tool1",
      input: {},
      output: {},
      durationMs: 10,
    });
    service.recordToolCall({
      toolName: "tool2",
      input: {},
      output: {},
      durationMs: 20,
    });
    service.recordTokenUsage({
      promptTokens: 50,
      completionTokens: 25,
      model: "claude-sonnet-4-20250514",
    });
    expect(service.getRecordedSpans()).toHaveLength(3);
  });

  it("spans include duration", () => {
    service.recordToolCall({
      toolName: "create_entities",
      input: {},
      output: {},
      durationMs: 42.5,
    });
    expect(service.getRecordedSpans()[0].durationMs).toBe(42.5);
  });

  it("clears spans", () => {
    service.recordToolCall({
      toolName: "tool1",
      input: {},
      output: {},
      durationMs: 10,
    });
    service.clearSpans();
    expect(service.getRecordedSpans()).toHaveLength(0);
  });
});
