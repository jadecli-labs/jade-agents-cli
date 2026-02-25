/**
 * Tests for Neon cold memory (pgvector) client.
 *
 * Uses in-memory fake for testing without a database.
 */

import { describe, expect, it, beforeEach } from "bun:test";
import { ColdMemoryClient, type ColdMemoryConfig } from "../../memory/cold";

describe("ColdMemoryConfig validation", () => {
  it("throws on empty databaseUrl", () => {
    expect(
      () => new ColdMemoryClient({ databaseUrl: "", apiKey: "test", useFake: true })
    ).toThrow();
  });

  it("throws on empty apiKey", () => {
    expect(
      () =>
        new ColdMemoryClient({
          databaseUrl: "postgresql://localhost/test",
          apiKey: "",
          useFake: true,
        })
    ).toThrow();
  });

  it("creates client with valid config", () => {
    const client = new ColdMemoryClient({
      databaseUrl: "postgresql://localhost/test",
      apiKey: "test-key",
      useFake: true,
    });
    expect(client).toBeDefined();
  });

  it("has default embedding dimensions", () => {
    const client = new ColdMemoryClient({
      databaseUrl: "postgresql://localhost/test",
      apiKey: "test-key",
      useFake: true,
    });
    expect(client.embeddingDimensions).toBe(1536);
  });
});

describe("Cold memory insert", () => {
  let client: ColdMemoryClient;

  beforeEach(() => {
    client = new ColdMemoryClient({
      databaseUrl: "postgresql://localhost/test",
      apiKey: "test-key",
      useFake: true,
    });
  });

  it("inserts entity", () => {
    client.insertEntity({
      name: "use-tdd",
      entityType: "Decision",
      observations: ["TDD ensures quality"],
      embedding: new Array(1536).fill(0.1),
    });
    const result = client.getEntity("use-tdd");
    expect(result).toBeDefined();
    expect(result!.name).toBe("use-tdd");
  });

  it("throws on empty name", () => {
    expect(() =>
      client.insertEntity({
        name: "",
        entityType: "Decision",
        observations: [],
        embedding: new Array(1536).fill(0.1),
      })
    ).toThrow();
  });

  it("validates embedding dimensions", () => {
    expect(() =>
      client.insertEntity({
        name: "test",
        entityType: "Decision",
        observations: [],
        embedding: new Array(100).fill(0.1),
      })
    ).toThrow();
  });
});

describe("Cold memory semantic search", () => {
  let client: ColdMemoryClient;

  beforeEach(() => {
    client = new ColdMemoryClient({
      databaseUrl: "postgresql://localhost/test",
      apiKey: "test-key",
      useFake: true,
    });
    client.insertEntity({
      name: "use-tdd",
      entityType: "Decision",
      observations: ["TDD ensures quality"],
      embedding: [1.0, ...new Array(1535).fill(0.0)],
    });
    client.insertEntity({
      name: "redis-hot",
      entityType: "Decision",
      observations: ["Redis for session state"],
      embedding: [0.0, 1.0, ...new Array(1534).fill(0.0)],
    });
  });

  it("returns results", () => {
    const results = client.semanticSearch(
      [1.0, ...new Array(1535).fill(0.0)],
      5
    );
    expect(results.length).toBeGreaterThan(0);
  });

  it("ranks by similarity", () => {
    const results = client.semanticSearch(
      [1.0, ...new Array(1535).fill(0.0)],
      5
    );
    expect(results[0].name).toBe("use-tdd");
  });

  it("respects limit", () => {
    const results = client.semanticSearch(
      [0.5, 0.5, ...new Array(1534).fill(0.0)],
      1
    );
    expect(results).toHaveLength(1);
  });
});

describe("Cold memory query by type", () => {
  let client: ColdMemoryClient;

  beforeEach(() => {
    client = new ColdMemoryClient({
      databaseUrl: "postgresql://localhost/test",
      apiKey: "test-key",
      useFake: true,
    });
    client.insertEntity({
      name: "decision-1",
      entityType: "Decision",
      observations: ["test"],
      embedding: new Array(1536).fill(0.1),
    });
    client.insertEntity({
      name: "concept-1",
      entityType: "Concept",
      observations: ["test"],
      embedding: new Array(1536).fill(0.2),
    });
  });

  it("filters by entity type", () => {
    const results = client.queryByType("Decision");
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("decision-1");
  });

  it("returns empty for unknown type", () => {
    const results = client.queryByType("UnknownType");
    expect(results).toHaveLength(0);
  });
});
