/**
 * Tests for Redis hot memory client (TypeScript).
 *
 * Uses in-memory fake Redis for deterministic testing.
 */

import { describe, expect, it, beforeEach } from "bun:test";
import {
  HotMemoryClient,
  type HotMemoryConfig,
} from "../../memory/hot";

describe("HotMemoryConfig validation", () => {
  it("throws on empty redisUrl", () => {
    expect(
      () => new HotMemoryClient({ redisUrl: "", defaultTtlSeconds: 3600 })
    ).toThrow();
  });

  it("creates client with valid config", () => {
    const client = new HotMemoryClient({
      redisUrl: "redis://localhost:6379",
      useFake: true,
    });
    expect(client).toBeDefined();
  });

  it("uses default TTL when not specified", () => {
    const client = new HotMemoryClient({
      redisUrl: "redis://localhost:6379",
      useFake: true,
    });
    expect(client.defaultTtlSeconds).toBeGreaterThan(0);
  });
});

describe("Session state write/read", () => {
  let client: HotMemoryClient;

  beforeEach(() => {
    client = new HotMemoryClient({
      redisUrl: "redis://localhost:6379",
      useFake: true,
    });
  });

  it("writes and reads session state", () => {
    client.writeSession("sess-1", { topic: "TDD", status: "active" });
    const result = client.readSession("sess-1");
    expect(result).toBeDefined();
    expect(result!.topic).toBe("TDD");
  });

  it("returns null for nonexistent session", () => {
    const result = client.readSession("nonexistent");
    expect(result).toBeNull();
  });

  it("overwrites session data", () => {
    client.writeSession("sess-1", { v: 1 });
    client.writeSession("sess-1", { v: 2 });
    const result = client.readSession("sess-1");
    expect(result!.v).toBe(2);
  });

  it("deletes session", () => {
    client.writeSession("sess-1", { data: "test" });
    client.deleteSession("sess-1");
    expect(client.readSession("sess-1")).toBeNull();
  });
});

describe("TTL behavior", () => {
  it("session has TTL set", () => {
    const client = new HotMemoryClient({
      redisUrl: "redis://localhost:6379",
      defaultTtlSeconds: 3600,
      useFake: true,
    });
    client.writeSession("sess-ttl", { data: "expires" });
    const ttl = client.getTtl("sess-ttl");
    expect(ttl).toBeGreaterThan(0);
  });

  it("custom TTL on write", () => {
    const client = new HotMemoryClient({
      redisUrl: "redis://localhost:6379",
      useFake: true,
    });
    client.writeSession("sess-custom", { data: "test" }, 7200);
    const ttl = client.getTtl("sess-custom");
    expect(ttl).toBeGreaterThan(0);
  });
});

describe("Working memory CRUD", () => {
  let client: HotMemoryClient;

  beforeEach(() => {
    client = new HotMemoryClient({
      redisUrl: "redis://localhost:6379",
      useFake: true,
    });
  });

  it("adds working memory item", () => {
    client.addWorkingMemory("sess-1", "context", "Working on Redis integration");
    const items = client.getWorkingMemory("sess-1", "context");
    expect(items).toHaveLength(1);
    expect(items[0]).toBe("Working on Redis integration");
  });

  it("adds multiple items", () => {
    client.addWorkingMemory("sess-1", "threads", "TDD implementation");
    client.addWorkingMemory("sess-1", "threads", "Redis integration");
    const items = client.getWorkingMemory("sess-1", "threads");
    expect(items).toHaveLength(2);
  });

  it("clears working memory", () => {
    client.addWorkingMemory("sess-1", "context", "item1");
    client.addWorkingMemory("sess-1", "context", "item2");
    client.clearWorkingMemory("sess-1", "context");
    const items = client.getWorkingMemory("sess-1", "context");
    expect(items).toHaveLength(0);
  });

  it("isolates sessions", () => {
    client.addWorkingMemory("sess-1", "data", "session1");
    client.addWorkingMemory("sess-2", "data", "session2");
    expect(client.getWorkingMemory("sess-1", "data")).toEqual(["session1"]);
    expect(client.getWorkingMemory("sess-2", "data")).toEqual(["session2"]);
  });
});
