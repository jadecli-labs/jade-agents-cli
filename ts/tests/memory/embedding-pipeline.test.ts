/**
 * Tests for embedding pipeline.
 *
 * Uses fake embedder for testing.
 */

import { describe, expect, it } from "bun:test";
import {
  EmbeddingPipeline,
  type EmbeddingConfig,
} from "../../memory/embedding-pipeline";

describe("EmbeddingConfig validation", () => {
  it("throws on empty apiKey", () => {
    expect(
      () => new EmbeddingPipeline({ apiKey: "", useFake: true })
    ).toThrow();
  });

  it("creates pipeline with valid config", () => {
    const pipeline = new EmbeddingPipeline({
      apiKey: "test-key",
      useFake: true,
    });
    expect(pipeline).toBeDefined();
  });

  it("has default dimensions", () => {
    const pipeline = new EmbeddingPipeline({
      apiKey: "test-key",
      useFake: true,
    });
    expect(pipeline.dimensions).toBe(1536);
  });
});

describe("Embedding generation", () => {
  const pipeline = new EmbeddingPipeline({
    apiKey: "test-key",
    useFake: true,
  });

  it("returns vector for text", () => {
    const result = pipeline.embed("TDD ensures quality");
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1536);
  });

  it("returns floats", () => {
    const result = pipeline.embed("test text");
    expect(result.every((x) => typeof x === "number")).toBe(true);
  });

  it("throws on empty text", () => {
    expect(() => pipeline.embed("")).toThrow();
  });

  it("batch embed returns multiple vectors", () => {
    const results = pipeline.embedBatch(["text 1", "text 2", "text 3"]);
    expect(results).toHaveLength(3);
    expect(results.every((v) => v.length === 1536)).toBe(true);
  });

  it("dimensions match config", () => {
    const result = pipeline.embed("test");
    expect(result).toHaveLength(pipeline.dimensions);
  });
});
