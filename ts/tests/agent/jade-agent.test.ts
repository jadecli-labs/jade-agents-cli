/**
 * Tests for Jade Agent — TypeScript agent with MCP tool integration.
 *
 * RED phase: these tests define expected behavior before implementation.
 */

import { describe, expect, it } from "bun:test";
import {
  JadeAgent,
  type JadeAgentConfig,
} from "../../agent/jade-agent";

describe("JadeAgentConfig validation", () => {
  it("throws on empty apiKey", () => {
    expect(() =>
      new JadeAgent({
        apiKey: "",
        model: "claude-sonnet-4-20250514",
        memoryFilePath: "./memory.jsonl",
      })
    ).toThrow();
  });

  it("throws on empty model", () => {
    expect(() =>
      new JadeAgent({
        apiKey: "sk-test",
        model: "",
        memoryFilePath: "./memory.jsonl",
      })
    ).toThrow();
  });

  it("throws on empty memoryFilePath", () => {
    expect(() =>
      new JadeAgent({
        apiKey: "sk-test",
        model: "claude-sonnet-4-20250514",
        memoryFilePath: "",
      })
    ).toThrow();
  });

  it("creates agent with valid config", () => {
    const agent = new JadeAgent({
      apiKey: "sk-test",
      model: "claude-sonnet-4-20250514",
      memoryFilePath: "./memory.jsonl",
    });
    expect(agent).toBeDefined();
  });
});

describe("JadeAgent properties", () => {
  const agent = new JadeAgent({
    apiKey: "sk-test",
    model: "claude-sonnet-4-20250514",
    memoryFilePath: "./memory.jsonl",
  });

  it("has model configured", () => {
    expect(agent.model).toBe("claude-sonnet-4-20250514");
  });

  it("has tools available", () => {
    const tools = agent.getTools();
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBeGreaterThan(0);
  });

  it("includes memory tools", () => {
    const toolNames = agent.getTools().map((t) => t.name);
    expect(toolNames).toContain("create_entities");
    expect(toolNames).toContain("search_nodes");
    expect(toolNames).toContain("read_graph");
  });

  it("includes jade-specific tools", () => {
    const toolNames = agent.getTools().map((t) => t.name);
    expect(toolNames).toContain("record_decision");
    expect(toolNames).toContain("recall_context");
    expect(toolNames).toContain("log_insight");
  });
});

describe("JadeAgent tool routing", () => {
  it("routes memory tool calls correctly", async () => {
    const agent = new JadeAgent({
      apiKey: "sk-test",
      model: "claude-sonnet-4-20250514",
      memoryFilePath: "/tmp/jade-agent-test-routing.jsonl",
    });
    const result = await agent.handleToolCall("create_entities", {
      entities: [
        { name: "TestEntity", entityType: "Concept", observations: ["test"] },
      ],
    });
    expect(result).toHaveProperty("created");
  });

  it("routes jade tool calls correctly", async () => {
    const agent = new JadeAgent({
      apiKey: "sk-test",
      model: "claude-sonnet-4-20250514",
      memoryFilePath: "/tmp/jade-agent-test-jade.jsonl",
    });
    const result = await agent.handleToolCall("record_decision", {
      decisionName: "Use TDD",
      rationale: "Ensures quality",
      decidedBy: "Team",
      sessionId: "sess-1",
    });
    expect(result).toHaveProperty("status");
  });

  it("throws on unknown tool", async () => {
    const agent = new JadeAgent({
      apiKey: "sk-test",
      model: "claude-sonnet-4-20250514",
      memoryFilePath: "/tmp/jade-agent-test-unknown.jsonl",
    });
    await expect(
      agent.handleToolCall("nonexistent_tool", {})
    ).rejects.toThrow();
  });
});
