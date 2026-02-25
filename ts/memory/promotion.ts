/**
 * Hot→cold promotion logic.
 *
 * Moves session data from Redis to Neon with embeddings.
 * Idempotent: skips already-promoted entities.
 */

import { HotMemoryClient } from "./hot";
import { ColdMemoryClient } from "./cold";
import { EmbeddingPipeline } from "./embedding-pipeline";

interface PromotionResult {
  promotedCount: number;
  skippedCount: number;
}

export class PromotionService {
  private readonly hot: HotMemoryClient;
  private readonly cold: ColdMemoryClient;
  private readonly embeddings: EmbeddingPipeline;

  constructor(opts: {
    hot: HotMemoryClient;
    cold: ColdMemoryClient;
    embeddings: EmbeddingPipeline;
  }) {
    this.hot = opts.hot;
    this.cold = opts.cold;
    this.embeddings = opts.embeddings;
  }

  promoteSession(sessionId: string): PromotionResult {
    const sessionData = this.hot.readSession(sessionId);
    if (sessionData === null) {
      return { promotedCount: 0, skippedCount: 0 };
    }

    const entities: any[] = sessionData.entities ?? [];
    let promotedCount = 0;
    let skippedCount = 0;

    for (const entity of entities) {
      const name = entity.name ?? "";
      if (!name) continue;

      // Check if already promoted (idempotent)
      const existing = this.cold.getEntity(name);
      if (existing !== undefined) {
        skippedCount++;
        continue;
      }

      // Generate embedding from observations
      const observations: string[] = entity.observations ?? [];
      const text = observations.length > 0 ? observations.join(" ") : name;
      const embedding = this.embeddings.embed(text);

      // Insert into cold storage
      this.cold.insertEntity({
        name,
        entityType: entity.entityType ?? "Concept",
        observations,
        embedding,
      });
      promotedCount++;
    }

    return { promotedCount, skippedCount };
  }
}
