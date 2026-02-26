/**
 * Embedding pipeline for generating vector representations.
 *
 * Fail-fast: API errors propagate immediately.
 * Uses deterministic fake for testing.
 */

export interface EmbeddingConfig {
  readonly apiKey: string;
  readonly model?: string;
  readonly dimensions?: number;
  readonly useFake?: boolean;
}

function fakeEmbed(text: string, dimensions: number): number[] {
  // Deterministic fake: hash the text to produce consistent vectors
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0;
  }
  const values: number[] = [];
  for (let i = 0; i < dimensions; i++) {
    hash = (hash * 1103515245 + 12345) | 0;
    values.push(((hash >> 16) & 0x7fff) / 32768.0 - 0.5);
  }
  return values;
}

export class EmbeddingPipeline {
  public readonly dimensions: number;
  private readonly useFake: boolean;

  constructor(config: EmbeddingConfig) {
    if (!config.apiKey || !config.apiKey.trim()) {
      throw new Error("apiKey must be a non-empty string");
    }
    this.dimensions = config.dimensions ?? 1536;
    this.useFake = config.useFake ?? false;
  }

  embed(text: string): number[] {
    if (!text || !text.trim()) {
      throw new Error("text must be a non-empty string");
    }
    if (this.useFake) {
      return fakeEmbed(text, this.dimensions);
    }
    throw new Error(
      "Real embedding API not implemented. Use useFake: true for testing."
    );
  }

  embedBatch(texts: string[]): number[][] {
    return texts.map((t) => this.embed(t));
  }
}
