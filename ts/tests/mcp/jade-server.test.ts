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
