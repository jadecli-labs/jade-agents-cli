/**
 * Tests for Jade agent tool definitions.
 *
 * RED phase: verifies tool schemas are correct before implementation.
 */

import { describe, expect, it } from "bun:test";
import {
  getJadeToolDefinitions,
  type JadeToolDefinition,
} from "../../agent/tools";

describe("getJadeToolDefinitions", () => {
  it("returns an array of tool definitions", () => {
    const tools = getJadeToolDefinitions();
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBeGreaterThan(0);
  });

  it("each tool has name and description", () => {
    const tools = getJadeToolDefinitions();
    for (const tool of tools) {
      expect(tool.name).toBeTruthy();
      expect(typeof tool.name).toBe("string");
      expect(tool.description).toBeTruthy();
      expect(typeof tool.description).toBe("string");
    }
  });

  it("each tool has an inputSchema", () => {
    const tools = getJadeToolDefinitions();
    for (const tool of tools) {
      expect(tool.inputSchema).toBeDefined();
      expect(typeof tool.inputSchema).toBe("object");
    }
  });

  it("includes memory tools", () => {
    const tools = getJadeToolDefinitions();
    const names = tools.map((t) => t.name);
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

  it("includes jade-specific tools", () => {
    const tools = getJadeToolDefinitions();
    const names = tools.map((t) => t.name);
    expect(names).toContain("record_decision");
    expect(names).toContain("recall_context");
    expect(names).toContain("update_hot_memory");
    expect(names).toContain("log_insight");
  });

  it("has exactly 13 tools (9 memory + 4 jade)", () => {
    const tools = getJadeToolDefinitions();
    expect(tools.length).toBe(13);
  });
});

describe("Tool input schemas", () => {
  it("create_entities schema requires entities array", () => {
    const tools = getJadeToolDefinitions();
    const createEntities = tools.find((t) => t.name === "create_entities");
    expect(createEntities).toBeDefined();
    expect(createEntities!.inputSchema.type).toBe("object");
    expect(createEntities!.inputSchema.properties).toHaveProperty("entities");
  });

  it("record_decision schema requires decisionName", () => {
    const tools = getJadeToolDefinitions();
    const recordDecision = tools.find((t) => t.name === "record_decision");
    expect(recordDecision).toBeDefined();
    expect(recordDecision!.inputSchema.properties).toHaveProperty(
      "decisionName"
    );
  });

  it("search_nodes schema requires query", () => {
    const tools = getJadeToolDefinitions();
    const searchNodes = tools.find((t) => t.name === "search_nodes");
    expect(searchNodes).toBeDefined();
    expect(searchNodes!.inputSchema.properties).toHaveProperty("query");
  });
});
