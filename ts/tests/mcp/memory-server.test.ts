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

  describe("corrupt JSONL recovery (C1)", () => {
    test("corrupt line is skipped, valid lines loaded", async () => {
      const { createMemoryServer } = require("@jade/mcp/memory-server");

      // Write JSONL with a corrupt line in the middle
      const valid1 = JSON.stringify({ type: "entity", name: "Good1", entityType: "Concept", observations: ["ok"] });
      const valid2 = JSON.stringify({ type: "entity", name: "Good2", entityType: "Concept", observations: ["also ok"] });
      await Bun.write(memoryFilePath, `${valid1}\nNOT_VALID_JSON\n${valid2}\n`);

      const server = createMemoryServer({ memoryFilePath });
      const result = await server.callTool("read_graph", {});
      const resultStr = JSON.stringify(result);
      expect(resultStr).toContain("Good1");
      expect(resultStr).toContain("Good2");
    });

    test("all corrupt lines result in empty graph", async () => {
      const { createMemoryServer } = require("@jade/mcp/memory-server");
      await Bun.write(memoryFilePath, "bad line 1\n{not json\n");

      const server = createMemoryServer({ memoryFilePath });
      const result = await server.callTool("read_graph", {});
      expect(result.entities).toHaveLength(0);
    });
  });

  describe("observation merge order (C3)", () => {
    test("merge preserves insertion order and deduplicates", async () => {
      const { createMemoryServer } = require("@jade/mcp/memory-server");
      const server = createMemoryServer({ memoryFilePath });

      await server.callTool("create_entities", {
        entities: [{ name: "OrderTest", entityType: "Concept", observations: ["alpha", "beta"] }],
      });
      await server.callTool("add_observations", {
        observations: [{ entityName: "OrderTest", contents: ["beta", "gamma"] }],
      });

      const result = await server.callTool("open_nodes", { names: ["OrderTest"] });
      const entity = result.entities[0];
      // After merge: ["alpha", "beta", "gamma"] — beta deduplicated, order preserved
      expect(entity.observations).toEqual(["alpha", "beta", "gamma"]);
    });

    test("duplicate observations removed on merge", async () => {
      const { createMemoryServer } = require("@jade/mcp/memory-server");
      const server = createMemoryServer({ memoryFilePath });

      await server.callTool("create_entities", {
        entities: [{ name: "DupTest", entityType: "Concept", observations: ["x", "y"] }],
      });
      await server.callTool("add_observations", {
        observations: [{ entityName: "DupTest", contents: ["x", "y", "z"] }],
      });

      const result = await server.callTool("open_nodes", { names: ["DupTest"] });
      const entity = result.entities[0];
      expect(entity.observations).toHaveLength(3);
      expect(entity.observations).toContain("x");
      expect(entity.observations).toContain("y");
      expect(entity.observations).toContain("z");
    });
  });

  describe("add_observations notFound (H6)", () => {
    test("returns notFound for non-existent entity", async () => {
      const { createMemoryServer } = require("@jade/mcp/memory-server");
      const server = createMemoryServer({ memoryFilePath });

      const result = await server.callTool("add_observations", {
        observations: [{ entityName: "NonExistent", contents: ["test"] }],
      });
      expect(result.notFound).toBeDefined();
      expect(result.notFound).toContain("NonExistent");
    });

    test("notFound absent when all entities exist", async () => {
      const { createMemoryServer } = require("@jade/mcp/memory-server");
      const server = createMemoryServer({ memoryFilePath });

      await server.callTool("create_entities", {
        entities: [{ name: "Exists", entityType: "Concept", observations: [] }],
      });
      const result = await server.callTool("add_observations", {
        observations: [{ entityName: "Exists", contents: ["new obs"] }],
      });
      expect(result.notFound).toBeUndefined();
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
