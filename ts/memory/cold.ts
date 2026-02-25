/**
 * Neon cold memory client with pgvector for semantic search.
 *
 * Fail-fast: connection failures throw immediately.
 * Uses in-memory fake for testing.
 */

export interface ColdMemoryConfig {
  readonly databaseUrl: string;
  readonly apiKey: string;
  readonly embeddingDimensions?: number;
  readonly useFake?: boolean;
}

interface StoredEntity {
  name: string;
  entityType: string;
  observations: string[];
  embedding: number[];
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);
  if (normA === 0 || normB === 0) return 0;
  return dot / (normA * normB);
}

export class ColdMemoryClient {
  public readonly embeddingDimensions: number;
  private entities: StoredEntity[] = [];

  constructor(config: ColdMemoryConfig) {
    if (!config.databaseUrl || !config.databaseUrl.trim()) {
      throw new Error("databaseUrl must be a non-empty string");
    }
    if (!config.apiKey || !config.apiKey.trim()) {
      throw new Error("apiKey must be a non-empty string");
    }

    this.embeddingDimensions = config.embeddingDimensions ?? 1536;

    if (!config.useFake) {
      throw new Error(
        "Real Neon connection not implemented. Use useFake: true for testing."
      );
    }
  }

  insertEntity(input: {
    name: string;
    entityType: string;
    observations: string[];
    embedding: number[];
  }): void {
    if (!input.name || !input.name.trim()) {
      throw new Error("name must be a non-empty string");
    }
    if (input.embedding.length !== this.embeddingDimensions) {
      throw new Error(
        `embedding must have ${this.embeddingDimensions} dimensions, got ${input.embedding.length}`
      );
    }
    this.entities.push({ ...input });
  }

  getEntity(
    name: string
  ): StoredEntity | undefined {
    return this.entities.find((e) => e.name === name);
  }

  semanticSearch(
    queryEmbedding: number[],
    limit: number
  ): StoredEntity[] {
    const scored = this.entities.map((e) => ({
      entity: e,
      score: cosineSimilarity(queryEmbedding, e.embedding),
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map((s) => s.entity);
  }

  queryByType(entityType: string): StoredEntity[] {
    return this.entities.filter((e) => e.entityType === entityType);
  }
}
