import { describe, expect, test, beforeEach } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("MCP Memory Server (TypeScript)", () => {
  let memoryFilePath: string;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "jade-test-"));
    memoryFilePath = join(tempDir, "memory.jsonl");
  });

  describe("tool discovery", () => {
    test("server exposes exactly 9 tools", async () => {
      const { createMemoryServer } = require("@jade/mcp/memory-server");
      const server = createMemoryServer({ memoryFilePath });
      const tools = await server.listTools();
      expect(tools).toHaveLength(9);
    });

    test("server exposes create_entities tool", async () => {
      const { createMemoryServer } = require("@jade/mcp/memory-server");
      const server = createMemoryServer({ memoryFilePath });
      const tools = await server.listTools();
      const names = tools.map((t: any) => t.name);
      expect(names).toContain("create_entities");
    });

    test("server exposes search_nodes tool", async () => {
      const { createMemoryServer } = require("@jade/mcp/memory-server");
      const server = createMemoryServer({ memoryFilePath });
      const tools = await server.listTools();
      const names = tools.map((t: any) => t.name);
      expect(names).toContain("search_nodes");
    });

    test("server exposes read_graph tool", async () => {
      const { createMemoryServer } = require("@jade/mcp/memory-server");
      const server = createMemoryServer({ memoryFilePath });
      const tools = await server.listTools();
      const names = tools.map((t: any) => t.name);
      expect(names).toContain("read_graph");
    });

    test("all 9 tool names present", async () => {
      const { createMemoryServer } = require("@jade/mcp/memory-server");
      const server = createMemoryServer({ memoryFilePath });
      const tools = await server.listTools();
      const names = tools.map((t: any) => t.name);
      const expected = [
        "create_entities",
        "create_relations",
        "add_observations",
        "delete_entities",
        "delete_observations",
        "delete_relations",
        "read_graph",
        "search_nodes",
        "open_nodes",
      ];
      for (const name of expected) {
        expect(names).toContain(name);
      }
    });
  });

  describe("CRUD operations", () => {
    test("create and search entities", async () => {
      const { createMemoryServer } = require("@jade/mcp/memory-server");
      const server = createMemoryServer({ memoryFilePath });

      await server.callTool("create_entities", {
        entities: [
          { name: "Alex", entityType: "Person", observations: ["Human partner"] },
        ],
      });

      const result = await server.callTool("search_nodes", { query: "Alex" });
      expect(JSON.stringify(result)).toContain("Alex");
    });

    test("create relations between entities", async () => {
      const { createMemoryServer } = require("@jade/mcp/memory-server");
      const server = createMemoryServer({ memoryFilePath });

      await server.callTool("create_entities", {
        entities: [
          { name: "Alex", entityType: "Person", observations: [] },
          { name: "use-tdd", entityType: "Decision", observations: ["TDD approach"] },
        ],
      });

      const result = await server.callTool("create_relations", {
        relations: [{ from: "Alex", to: "use-tdd", relationType: "made_decision" }],
      });
      expect(result).toBeDefined();
    });

    test("add observations to existing entity", async () => {
      const { createMemoryServer } = require("@jade/mcp/memory-server");
      const server = createMemoryServer({ memoryFilePath });

      await server.callTool("create_entities", {
        entities: [
          { name: "Alex", entityType: "Person", observations: ["Human partner"] },
        ],
      });

      const result = await server.callTool("add_observations", {
        observations: [{ entityName: "Alex", contents: ["Uses uv for Python"] }],
      });
      expect(result).toBeDefined();
    });

    test("delete entity removes it from search", async () => {
      const { createMemoryServer } = require("@jade/mcp/memory-server");
      const server = createMemoryServer({ memoryFilePath });

      await server.callTool("create_entities", {
        entities: [
          { name: "ToDelete", entityType: "Concept", observations: ["Will be deleted"] },
        ],
      });

      await server.callTool("delete_entities", { entityNames: ["ToDelete"] });
      const result = await server.callTool("search_nodes", { query: "ToDelete" });
      const resultStr = JSON.stringify(result);
      // After deletion, should not find the entity
      expect(resultStr).not.toContain('"ToDelete"');
    });

    test("read_graph returns full graph", async () => {
      const { createMemoryServer } = require("@jade/mcp/memory-server");
      const server = createMemoryServer({ memoryFilePath });

      await server.callTool("create_entities", {
        entities: [
          { name: "GraphNode", entityType: "Concept", observations: ["In the graph"] },
        ],
      });

      const result = await server.callTool("read_graph", {});
      expect(JSON.stringify(result)).toContain("GraphNode");
    });

    test("open_nodes returns specific entities", async () => {
      const { createMemoryServer } = require("@jade/mcp/memory-server");
      const server = createMemoryServer({ memoryFilePath });

      await server.callTool("create_entities", {
        entities: [
          { name: "SpecificNode", entityType: "Tool", observations: ["A tool"] },
        ],
      });

      const result = await server.callTool("open_nodes", { names: ["SpecificNode"] });
      expect(JSON.stringify(result)).toContain("SpecificNode");
    });
  });

  describe("persistence", () => {
    test("data persists to JSONL file", async () => {
      const { createMemoryServer } = require("@jade/mcp/memory-server");
      const server = createMemoryServer({ memoryFilePath });

      await server.callTool("create_entities", {
        entities: [
          { name: "Persisted", entityType: "Concept", observations: ["Persists"] },
        ],
      });

      const file = Bun.file(memoryFilePath);
      const exists = await file.exists();
      expect(exists).toBe(true);
      const size = file.size;
      expect(size).toBeGreaterThan(0);
    });

    test("data survives server restart", async () => {
      const { createMemoryServer } = require("@jade/mcp/memory-server");

      // Write with first instance
      const server1 = createMemoryServer({ memoryFilePath });
      await server1.callTool("create_entities", {
        entities: [
          { name: "Survivor", entityType: "Concept", observations: ["Must survive"] },
        ],
      });

      // Read with fresh instance
      const server2 = createMemoryServer({ memoryFilePath });
      const result = await server2.callTool("search_nodes", { query: "Survivor" });
      expect(JSON.stringify(result)).toContain("Survivor");
    });
  });
});
