/**
 * Upstash Redis hot memory client — serverless, edge-compatible.
 *
 * Uses @upstash/redis REST API for Cloudflare Workers / Vercel Edge compatibility.
 * Fail-fast: throws on missing credentials.
 */

import { Redis } from "@upstash/redis";

export interface UpstashHotMemoryConfig {
  readonly url: string;
  readonly token: string;
  readonly defaultTtlSeconds?: number;
}

export class UpstashHotMemoryClient {
  public readonly defaultTtlSeconds: number;
  private readonly redis: Redis;

  constructor(config: UpstashHotMemoryConfig) {
    if (!config.url || !config.url.trim()) {
      throw new Error("Upstash Redis URL is required");
    }
    if (!config.token || !config.token.trim()) {
      throw new Error("Upstash Redis token is required");
    }

    this.defaultTtlSeconds = config.defaultTtlSeconds ?? 3600;
    this.redis = new Redis({ url: config.url, token: config.token });
  }

  private sessionKey(sessionId: string): string {
    return `jade:session:${sessionId}`;
  }

  private workingMemoryKey(sessionId: string, namespace: string): string {
    return `jade:wm:${sessionId}:${namespace}`;
  }

  async writeSession(
    sessionId: string,
    data: Record<string, any>,
    ttlSeconds?: number
  ): Promise<void> {
    const key = this.sessionKey(sessionId);
    const ttl = ttlSeconds ?? this.defaultTtlSeconds;
    await this.redis.set(key, JSON.stringify(data), { ex: ttl });
  }

  async readSession(sessionId: string): Promise<Record<string, any> | null> {
    const key = this.sessionKey(sessionId);
    const value = await this.redis.get<string>(key);
    if (value === null) return null;
    return typeof value === "string" ? JSON.parse(value) : value;
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.redis.del(this.sessionKey(sessionId));
  }

  async getTtl(sessionId: string): Promise<number> {
    return await this.redis.ttl(this.sessionKey(sessionId));
  }

  async addWorkingMemory(
    sessionId: string,
    namespace: string,
    item: string
  ): Promise<void> {
    await this.redis.rpush(this.workingMemoryKey(sessionId, namespace), item);
  }

  async getWorkingMemory(
    sessionId: string,
    namespace: string
  ): Promise<string[]> {
    return await this.redis.lrange(
      this.workingMemoryKey(sessionId, namespace),
      0,
      -1
    );
  }

  async clearWorkingMemory(
    sessionId: string,
    namespace: string
  ): Promise<void> {
    await this.redis.del(this.workingMemoryKey(sessionId, namespace));
  }
}
