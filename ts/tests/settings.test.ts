import { describe, expect, test, beforeEach, afterEach } from "bun:test";

describe("Settings — fail-fast configuration loading", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Set all required env vars for a clean baseline
    process.env.ANTHROPIC_API_KEY = "test-key-not-real";
    process.env.NEON_DATABASE_URL = "postgresql://test:test@localhost:5432/test";
    process.env.NEON_API_KEY = "test-neon-key";
    process.env.REDIS_URL = "redis://localhost:6379";
    process.env.CUBE_API_URL = "http://localhost:4000";
    process.env.CUBE_API_KEY = "test-cube-key";
    process.env.MLFLOW_TRACKING_URI = "http://localhost:5000";
    process.env.MEMORY_FILE_PATH = "./memory.jsonl";
  });

  afterEach(() => {
    // Restore original env
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, originalEnv);
  });

  describe("missing required keys throw SettingsError", () => {
    test("missing ANTHROPIC_API_KEY throws", () => {
      delete process.env.ANTHROPIC_API_KEY;
      const { loadSettings, SettingsError } = require("@jade/settings");
      expect(() => loadSettings()).toThrow();
    });

    test("missing NEON_DATABASE_URL throws", () => {
      delete process.env.NEON_DATABASE_URL;
      const { loadSettings } = require("@jade/settings");
      expect(() => loadSettings()).toThrow();
    });

    test("missing NEON_API_KEY throws", () => {
      delete process.env.NEON_API_KEY;
      const { loadSettings } = require("@jade/settings");
      expect(() => loadSettings()).toThrow();
    });

    test("missing REDIS_URL throws", () => {
      delete process.env.REDIS_URL;
      const { loadSettings } = require("@jade/settings");
      expect(() => loadSettings()).toThrow();
    });

    test("missing CUBE_API_URL throws", () => {
      delete process.env.CUBE_API_URL;
      const { loadSettings } = require("@jade/settings");
      expect(() => loadSettings()).toThrow();
    });

    test("missing CUBE_API_KEY throws", () => {
      delete process.env.CUBE_API_KEY;
      const { loadSettings } = require("@jade/settings");
      expect(() => loadSettings()).toThrow();
    });

    test("missing MLFLOW_TRACKING_URI throws", () => {
      delete process.env.MLFLOW_TRACKING_URI;
      const { loadSettings } = require("@jade/settings");
      expect(() => loadSettings()).toThrow();
    });
  });

  describe("loads correctly when all keys present", () => {
    test("returns Settings object with all sections", () => {
      const { loadSettings } = require("@jade/settings");
      const settings = loadSettings();
      expect(settings).toBeDefined();
      expect(settings.anthropic).toBeDefined();
      expect(settings.neon).toBeDefined();
      expect(settings.redis).toBeDefined();
      expect(settings.cube).toBeDefined();
      expect(settings.mlflow).toBeDefined();
      expect(settings.mcp).toBeDefined();
    });

    test("anthropic has correct api_key", () => {
      const { loadSettings } = require("@jade/settings");
      const settings = loadSettings();
      expect(settings.anthropic.apiKey).toBe("test-key-not-real");
    });

    test("anthropic has a default model", () => {
      const { loadSettings } = require("@jade/settings");
      const settings = loadSettings();
      expect(settings.anthropic.model).toContain("claude");
    });

    test("neon has database_url starting with postgresql://", () => {
      const { loadSettings } = require("@jade/settings");
      const settings = loadSettings();
      expect(settings.neon.databaseUrl).toStartWith("postgresql://");
    });

    test("redis has url starting with redis://", () => {
      const { loadSettings } = require("@jade/settings");
      const settings = loadSettings();
      expect(settings.redis.url).toStartWith("redis://");
    });

    test("mcp has memory_file_path ending in .jsonl", () => {
      const { loadSettings } = require("@jade/settings");
      const settings = loadSettings();
      expect(settings.mcp.memoryFilePath).toEndWith(".jsonl");
    });
  });

  describe("settings are frozen (immutable)", () => {
    test("cannot mutate top-level settings", () => {
      const { loadSettings } = require("@jade/settings");
      const settings = loadSettings();
      expect(() => {
        (settings as any).anthropic = null;
      }).toThrow();
    });

    test("cannot mutate nested settings", () => {
      const { loadSettings } = require("@jade/settings");
      const settings = loadSettings();
      expect(() => {
        (settings.anthropic as any).apiKey = "mutated";
      }).toThrow();
    });
  });
});
