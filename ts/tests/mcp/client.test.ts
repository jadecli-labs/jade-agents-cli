/**
 * Tests for MCP client manager.
 *
 * RED phase: verifies MCP client creation and tool discovery before implementation.
 */

import { describe, expect, it } from "bun:test";
import {
  createJadeMCPClient,
  type JadeMCPClientConfig,
} from "../../mcp/client";

describe("createJadeMCPClient", () => {
  it("creates a client with valid memoryFilePath", async () => {
    const client = await createJadeMCPClient({
      memoryFilePath: "/tmp/jade-mcp-client-test.jsonl",
    });
    expect(client).toBeDefined();
  });

  it("throws on empty memoryFilePath", async () => {
    await expect(
      createJadeMCPClient({ memoryFilePath: "" })
    ).rejects.toThrow();
  });
});

describe("JadeMCPClient tool discovery", () => {
  it("discovers memory tools from server", async () => {
    const client = await createJadeMCPClient({
      memoryFilePath: "/tmp/jade-mcp-client-tools.jsonl",
    });
    const tools = await client.listTools();
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBeGreaterThan(0);
  });

  it("discovers all 9 memory tools", async () => {
    const client = await createJadeMCPClient({
      memoryFilePath: "/tmp/jade-mcp-client-9tools.jsonl",
    });
    const tools = await client.listTools();
    const names = tools.map((t: { name: string }) => t.name);
    expect(names).toContain("create_entities");
    expect(names).toContain("create_relations");
    expect(names).toContain("add_observations");
    expect(names).toContain("delete_entities");
    expect(names).toContain("delete_observations");
    expect(names).toContain("delete_relations");
    expect(names).toContain("read_graph");
    expect(names).toContain("search_nodes");
    expect(names).toContain("open_nodes");
  });

  it("discovers jade-specific tools", async () => {
    const client = await createJadeMCPClient({
      memoryFilePath: "/tmp/jade-mcp-client-jade-tools.jsonl",
    });
    const tools = await client.listTools();
    const names = tools.map((t: { name: string }) => t.name);
    expect(names).toContain("record_decision");
    expect(names).toContain("recall_context");
    expect(names).toContain("update_hot_memory");
    expect(names).toContain("log_insight");
  });
});

describe("JadeMCPClient tool routing", () => {
  it("routes tool calls to correct server", async () => {
    const client = await createJadeMCPClient({
      memoryFilePath: "/tmp/jade-mcp-client-routing.jsonl",
    });
    const result = await client.callTool("create_entities", {
      entities: [
        { name: "TestEntity", entityType: "Concept", observations: ["test"] },
      ],
    });
    expect(result).toBeDefined();
  });

  it("routes jade tool calls correctly", async () => {
    const client = await createJadeMCPClient({
      memoryFilePath: "/tmp/jade-mcp-client-jade-routing.jsonl",
    });
    const result = await client.callTool("record_decision", {
      decisionName: "Use MCP",
      rationale: "Standard protocol",
      decidedBy: "Team",
      sessionId: "sess-1",
    });
    expect(result).toBeDefined();
  });

  it("throws on unknown tool call", async () => {
    const client = await createJadeMCPClient({
      memoryFilePath: "/tmp/jade-mcp-client-unknown.jsonl",
    });
    await expect(
      client.callTool("nonexistent_tool", {})
    ).rejects.toThrow();
  });
});
