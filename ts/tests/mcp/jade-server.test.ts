import { describe, expect, test, beforeEach } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("Jade MCP Server — domain-specific tools", () => {
  let memoryFilePath: string;

  beforeEach(async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "jade-test-"));
    memoryFilePath = join(tempDir, "memory.jsonl");
  });

  describe("tool discovery", () => {
    test("has record_decision tool", async () => {
      const { createJadeServer } = require("@jade/mcp/jade-server");
      const server = createJadeServer({ memoryFilePath });
      const tools = await server.listTools();
      const names = tools.map((t: any) => t.name);
      expect(names).toContain("record_decision");
    });

    test("has recall_context tool", async () => {
      const { createJadeServer } = require("@jade/mcp/jade-server");
      const server = createJadeServer({ memoryFilePath });
      const tools = await server.listTools();
      const names = tools.map((t: any) => t.name);
      expect(names).toContain("recall_context");
    });

    test("has update_hot_memory tool", async () => {
      const { createJadeServer } = require("@jade/mcp/jade-server");
      const server = createJadeServer({ memoryFilePath });
      const tools = await server.listTools();
      const names = tools.map((t: any) => t.name);
      expect(names).toContain("update_hot_memory");
    });

    test("has log_insight tool", async () => {
      const { createJadeServer } = require("@jade/mcp/jade-server");
      const server = createJadeServer({ memoryFilePath });
      const tools = await server.listTools();
      const names = tools.map((t: any) => t.name);
      expect(names).toContain("log_insight");
    });
  });

  describe("record_decision", () => {
    test("creates a decision entity", async () => {
      const { createJadeServer } = require("@jade/mcp/jade-server");
      const server = createJadeServer({ memoryFilePath });

      const result = await server.callTool("record_decision", {
        decisionName: "use-tdd-approach",
        rationale: "TDD ensures correctness before implementation",
        decidedBy: "Alex",
        sessionId: "session-001",
      });
      expect(result).toBeDefined();
      expect(JSON.stringify(result)).toContain("use-tdd-approach");
    });

    test("fails fast on empty decision name", async () => {
      const { createJadeServer } = require("@jade/mcp/jade-server");
      const server = createJadeServer({ memoryFilePath });

      await expect(
        server.callTool("record_decision", {
          decisionName: "",
          rationale: "test",
          decidedBy: "Alex",
          sessionId: "s1",
        })
      ).rejects.toThrow();
    });
  });

  describe("record_decision empty guards (H3)", () => {
    test("empty decidedBy creates no Person entity", async () => {
      const { createJadeServer } = require("@jade/mcp/jade-server");
      const server = createJadeServer({ memoryFilePath });

      await server.callTool("record_decision", {
        decisionName: "test-decision",
        rationale: "testing",
        decidedBy: "",
        sessionId: "s1",
      });

      // Check underlying memory — read_graph not exposed on jade server,
      // but we can recall_context for "Person"
      const result = await server.callTool("recall_context", { query: "Person" });
      const resultStr = JSON.stringify(result);
      // No Person entity should have been created for empty decidedBy
      expect(resultStr).not.toContain('"entityType":"Person"');
    });

    test("whitespace sessionId creates no Session entity or participated_in relation", async () => {
      const { createJadeServer } = require("@jade/mcp/jade-server");
      const server = createJadeServer({ memoryFilePath });

      await server.callTool("record_decision", {
        decisionName: "test-decision-2",
        rationale: "testing",
        decidedBy: "Alex",
        sessionId: "   ",
      });

      const result = await server.callTool("recall_context", { query: "test-decision-2" });
      const resultStr = JSON.stringify(result);
      expect(resultStr).toContain("test-decision-2");
      expect(resultStr).not.toContain("participated_in");
    });

    test("empty both creates only decision entity", async () => {
      const { createJadeServer } = require("@jade/mcp/jade-server");
      const server = createJadeServer({ memoryFilePath });

      await server.callTool("record_decision", {
        decisionName: "solo-decision",
        rationale: "no author or session",
        decidedBy: "",
        sessionId: "",
      });

      const result = await server.callTool("recall_context", { query: "solo-decision" });
      const resultStr = JSON.stringify(result);
      expect(resultStr).toContain("solo-decision");
      expect(resultStr).not.toContain("made_decision");
      expect(resultStr).not.toContain("participated_in");
    });
  });

  describe("recall_context", () => {
    test("searches by topic", async () => {
      const { createJadeServer } = require("@jade/mcp/jade-server");
      const server = createJadeServer({ memoryFilePath });

      await server.callTool("record_decision", {
        decisionName: "use-redis-for-hot-memory",
        rationale: "Redis provides fast session-scoped state",
        decidedBy: "Alex",
        sessionId: "session-001",
      });

      const result = await server.callTool("recall_context", { query: "redis" });
      expect(JSON.stringify(result).toLowerCase()).toContain("redis");
    });
  });

  describe("update_hot_memory", () => {
    test("writes session summary", async () => {
      const { createJadeServer } = require("@jade/mcp/jade-server");
      const server = createJadeServer({ memoryFilePath });

      const result = await server.callTool("update_hot_memory", {
        sessionId: "session-001",
        summary: "Discussed TDD approach and Redis hot memory design",
        activeThreads: ["TDD implementation", "Redis integration"],
      });
      expect(result).toBeDefined();
    });
  });

  describe("log_insight", () => {
    test("creates a concept entity for an insight", async () => {
      const { createJadeServer } = require("@jade/mcp/jade-server");
      const server = createJadeServer({ memoryFilePath });

      const result = await server.callTool("log_insight", {
        insight: "FastMCP decorators simplify MCP server creation",
        category: "Concept",
        sessionId: "session-001",
      });
      expect(result).toBeDefined();
    });
  });
});
