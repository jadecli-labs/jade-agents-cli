/**
 * Redis hot memory client for session-scoped working memory.
 *
 * Fail-fast: connection failures throw immediately.
 * Supports in-memory fake for testing.
 */

export interface HotMemoryConfig {
  readonly redisUrl: string;
  readonly defaultTtlSeconds?: number;
  readonly useFake?: boolean;
}

/**
 * In-memory fake Redis for testing.
 */
class FakeRedis {
  private data = new Map<string, string>();
  private ttls = new Map<string, number>();
  private lists = new Map<string, string[]>();

  set(key: string, value: string, ttl?: number): void {
    this.data.set(key, value);
    if (ttl !== undefined) {
      this.ttls.set(key, ttl);
    }
  }

  get(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  del(key: string): void {
    this.data.delete(key);
    this.ttls.delete(key);
    this.lists.delete(key);
  }

  ttl(key: string): number {
    return this.ttls.get(key) ?? -1;
  }

  rpush(key: string, value: string): void {
    const list = this.lists.get(key) ?? [];
    list.push(value);
    this.lists.set(key, list);
  }

  lrange(key: string, start: number, end: number): string[] {
    const list = this.lists.get(key) ?? [];
    if (end === -1) return list.slice(start);
    return list.slice(start, end + 1);
  }
}

export class HotMemoryClient {
  public readonly defaultTtlSeconds: number;
  private readonly redis: FakeRedis;

  constructor(config: HotMemoryConfig) {
    if (!config.redisUrl || !config.redisUrl.trim()) {
      throw new Error("redisUrl must be a non-empty string");
    }

    this.defaultTtlSeconds = config.defaultTtlSeconds ?? 3600;

    if (config.useFake) {
      this.redis = new FakeRedis();
    } else {
      // In production, would connect to real Redis
      // For now, fail fast if not using fake
      throw new Error(
        "Real Redis connection not implemented. Use useFake: true for testing."
      );
    }
  }

  private sessionKey(sessionId: string): string {
    return `jade:session:${sessionId}`;
  }

  private workingMemoryKey(sessionId: string, namespace: string): string {
    return `jade:wm:${sessionId}:${namespace}`;
  }

  writeSession(
    sessionId: string,
    data: Record<string, any>,
    ttlSeconds?: number
  ): void {
    const key = this.sessionKey(sessionId);
    const ttl = ttlSeconds ?? this.defaultTtlSeconds;
    this.redis.set(key, JSON.stringify(data), ttl);
  }

  readSession(sessionId: string): Record<string, any> | null {
    const key = this.sessionKey(sessionId);
    const value = this.redis.get(key);
    if (value === null) return null;
    return JSON.parse(value);
  }

  deleteSession(sessionId: string): void {
    const key = this.sessionKey(sessionId);
    this.redis.del(key);
  }

  getTtl(sessionId: string): number {
    const key = this.sessionKey(sessionId);
    return this.redis.ttl(key);
  }

  addWorkingMemory(
    sessionId: string,
    namespace: string,
    item: string
  ): void {
    const key = this.workingMemoryKey(sessionId, namespace);
    this.redis.rpush(key, item);
  }

  getWorkingMemory(sessionId: string, namespace: string): string[] {
    const key = this.workingMemoryKey(sessionId, namespace);
    return this.redis.lrange(key, 0, -1);
  }

  clearWorkingMemory(sessionId: string, namespace: string): void {
    const key = this.workingMemoryKey(sessionId, namespace);
    this.redis.del(key);
  }
}
