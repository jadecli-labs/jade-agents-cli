import { describe, expect, test } from "bun:test";

describe("MCP Entity/Relation/Observation schemas", () => {
  describe("Entity schema", () => {
    test("valid entity creates successfully", () => {
      const { createEntity } = require("@jade/mcp/entities");
      const entity = createEntity({
        name: "Alex",
        entityType: "Person",
        observations: ["Human partner in Jade system"],
      });
      expect(entity.name).toBe("Alex");
      expect(entity.entityType).toBe("Person");
      expect(entity.observations).toHaveLength(1);
    });

    test("entity requires non-empty name", () => {
      const { createEntity } = require("@jade/mcp/entities");
      expect(() =>
        createEntity({ name: "", entityType: "Person", observations: [] })
      ).toThrow();
    });

    test("entity requires non-empty entityType", () => {
      const { createEntity } = require("@jade/mcp/entities");
      expect(() =>
        createEntity({ name: "Alex", entityType: "", observations: [] })
      ).toThrow();
    });

    test("entity observations default to empty array", () => {
      const { createEntity } = require("@jade/mcp/entities");
      const entity = createEntity({ name: "Alex", entityType: "Person" });
      expect(entity.observations).toEqual([]);
    });
  });

  describe("Jade entity types", () => {
    test("JADE_ENTITY_TYPES contains Person, Decision, Concept, Tool, Session, Goal", () => {
      const { JADE_ENTITY_TYPES } = require("@jade/mcp/entities");
      expect(JADE_ENTITY_TYPES).toContain("Person");
      expect(JADE_ENTITY_TYPES).toContain("Decision");
      expect(JADE_ENTITY_TYPES).toContain("Concept");
      expect(JADE_ENTITY_TYPES).toContain("Tool");
      expect(JADE_ENTITY_TYPES).toContain("Session");
      expect(JADE_ENTITY_TYPES).toContain("Goal");
    });

    test("JADE_ENTITY_TYPES is frozen", () => {
      const { JADE_ENTITY_TYPES } = require("@jade/mcp/entities");
      expect(Object.isFrozen(JADE_ENTITY_TYPES)).toBe(true);
    });
  });

  describe("Relation schema", () => {
    test("valid relation creates successfully", () => {
      const { createRelation } = require("@jade/mcp/entities");
      const rel = createRelation({
        from: "Alex",
        to: "use-tdd",
        relationType: "made_decision",
      });
      expect(rel.from).toBe("Alex");
      expect(rel.to).toBe("use-tdd");
      expect(rel.relationType).toBe("made_decision");
    });

    test("relation requires non-empty from", () => {
      const { createRelation } = require("@jade/mcp/entities");
      expect(() =>
        createRelation({ from: "", to: "target", relationType: "uses" })
      ).toThrow();
    });

    test("relation requires non-empty to", () => {
      const { createRelation } = require("@jade/mcp/entities");
      expect(() =>
        createRelation({ from: "source", to: "", relationType: "uses" })
      ).toThrow();
    });

    test("relation requires non-empty relationType", () => {
      const { createRelation } = require("@jade/mcp/entities");
      expect(() =>
        createRelation({ from: "source", to: "target", relationType: "" })
      ).toThrow();
    });
  });

  describe("Jade relation types", () => {
    test("JADE_RELATION_TYPES contains made_decision, discussed_concept, uses_tool, has_goal", () => {
      const { JADE_RELATION_TYPES } = require("@jade/mcp/entities");
      expect(JADE_RELATION_TYPES).toContain("made_decision");
      expect(JADE_RELATION_TYPES).toContain("discussed_concept");
      expect(JADE_RELATION_TYPES).toContain("uses_tool");
      expect(JADE_RELATION_TYPES).toContain("has_goal");
    });

    test("JADE_RELATION_TYPES is frozen", () => {
      const { JADE_RELATION_TYPES } = require("@jade/mcp/entities");
      expect(Object.isFrozen(JADE_RELATION_TYPES)).toBe(true);
    });
  });

  describe("Observation validation", () => {
    test("non-empty string is valid", () => {
      const { validateObservation } = require("@jade/mcp/entities");
      expect(() => validateObservation("Alex prefers fail-fast")).not.toThrow();
    });

    test("empty string throws", () => {
      const { validateObservation } = require("@jade/mcp/entities");
      expect(() => validateObservation("")).toThrow();
    });

    test("whitespace-only string throws", () => {
      const { validateObservation } = require("@jade/mcp/entities");
      expect(() => validateObservation("   ")).toThrow();
    });
  });
});
