/**
 * Tests for Cube.js semantic layer client.
 */

import { describe, expect, it } from "bun:test";
import { CubeClient, type CubeConfig } from "../../semantic/cube-client";

describe("CubeConfig validation", () => {
  it("throws on empty apiUrl", () => {
    expect(
      () => new CubeClient({ apiUrl: "", apiKey: "test", useFake: true })
    ).toThrow();
  });

  it("throws on empty apiKey", () => {
    expect(
      () =>
        new CubeClient({
          apiUrl: "http://localhost:4000",
          apiKey: "",
          useFake: true,
        })
    ).toThrow();
  });

  it("creates client with valid config", () => {
    const client = new CubeClient({
      apiUrl: "http://localhost:4000",
      apiKey: "test-key",
      useFake: true,
    });
    expect(client).toBeDefined();
  });

  it("has apiUrl", () => {
    const client = new CubeClient({
      apiUrl: "http://localhost:4000",
      apiKey: "test-key",
      useFake: true,
    });
    expect(client.apiUrl).toBe("http://localhost:4000");
  });
});

describe("Cube query", () => {
  const client = new CubeClient({
    apiUrl: "http://localhost:4000",
    apiKey: "test-key",
    useFake: true,
  });

  it("returns result with data", () => {
    const result = client.query({
      measures: ["Sessions.count"],
      dimensions: ["Sessions.entityType"],
    });
    expect(result).toHaveProperty("data");
    expect(Array.isArray(result.data)).toBe(true);
  });

  it("validates query has measures or dimensions", () => {
    expect(() => client.query({})).toThrow();
  });

  it("supports filters", () => {
    const result = client.query({
      measures: ["Sessions.count"],
      filters: [
        {
          member: "Sessions.entityType",
          operator: "equals",
          values: ["Decision"],
        },
      ],
    });
    expect(result).toHaveProperty("data");
  });

  it("supports timeDimensions", () => {
    const result = client.query({
      measures: ["Sessions.count"],
      timeDimensions: [
        { dimension: "Sessions.createdAt", granularity: "day" },
      ],
    });
    expect(result).toHaveProperty("data");
  });
});
