/**
 * Tests for hot→cold promotion.
 */

import { describe, expect, it, beforeEach } from "bun:test";
import { HotMemoryClient } from "../../memory/hot";
import { ColdMemoryClient } from "../../memory/cold";
import { EmbeddingPipeline } from "../../memory/embedding-pipeline";
import { PromotionService } from "../../memory/promotion";

describe("PromotionService", () => {
  let hot: HotMemoryClient;
  let cold: ColdMemoryClient;
  let embeddings: EmbeddingPipeline;
  let service: PromotionService;

  beforeEach(() => {
    hot = new HotMemoryClient({
      redisUrl: "redis://localhost:6379",
      useFake: true,
    });
    cold = new ColdMemoryClient({
      databaseUrl: "postgresql://localhost/test",
      apiKey: "test-key",
      useFake: true,
    });
    embeddings = new EmbeddingPipeline({
      apiKey: "test-key",
      useFake: true,
    });
    service = new PromotionService({ hot, cold, embeddings });
  });

  it("promotes session entities to cold storage", () => {
    hot.writeSession("sess-1", {
      entities: [
        {
          name: "use-tdd",
          entityType: "Decision",
          observations: ["TDD is good"],
        },
      ],
    });
    const result = service.promoteSession("sess-1");
    expect(result.promotedCount).toBe(1);
  });

  it("preserves entity fields", () => {
    hot.writeSession("sess-2", {
      entities: [
        {
          name: "redis-cache",
          entityType: "Tool",
          observations: ["Fast key-value store"],
        },
      ],
    });
    service.promoteSession("sess-2");
    const entity = cold.getEntity("redis-cache");
    expect(entity).toBeDefined();
    expect(entity!.entityType).toBe("Tool");
    expect(entity!.observations).toContain("Fast key-value store");
  });

  it("generates embeddings for promoted entities", () => {
    hot.writeSession("sess-3", {
      entities: [
        {
          name: "embed-test",
          entityType: "Concept",
          observations: ["test embedding"],
        },
      ],
    });
    service.promoteSession("sess-3");
    const entity = cold.getEntity("embed-test");
    expect(entity).toBeDefined();
    expect(entity!.embedding).toBeDefined();
    expect(entity!.embedding).toHaveLength(1536);
  });

  it("is idempotent (skips already-promoted)", () => {
    hot.writeSession("sess-4", {
      entities: [
        {
          name: "idempotent-test",
          entityType: "Concept",
          observations: ["test"],
        },
      ],
    });
    service.promoteSession("sess-4");
    // Re-write and promote again
    hot.writeSession("sess-4", {
      entities: [
        {
          name: "idempotent-test",
          entityType: "Concept",
          observations: ["test"],
        },
      ],
    });
    const result2 = service.promoteSession("sess-4");
    expect(result2.skippedCount).toBe(1);
  });

  it("handles nonexistent session", () => {
    const result = service.promoteSession("nonexistent");
    expect(result.promotedCount).toBe(0);
  });
});
