/**
 * Fail-fast settings loader for Jade (TypeScript).
 *
 * All required environment variables are validated at load time.
 * Missing or empty values throw SettingsError immediately.
 */

export class SettingsError extends Error {
  public readonly key: string;

  constructor(key: string) {
    super(
      `Required environment variable '${key}' is not set or empty. ` +
        `Check your .env file or env.template for required keys.`
    );
    this.name = "SettingsError";
    this.key = key;
  }
}

function requireEnv(key: string): string {
  const value = (process.env[key] ?? "").trim();
  if (!value) {
    throw new SettingsError(key);
  }
  return value;
}

export interface AnthropicSettings {
  readonly apiKey: string;
  readonly model: string;
}

export interface NeonSettings {
  readonly databaseUrl: string;
  readonly apiKey: string;
}

export interface RedisSettings {
  readonly url: string;
}

export interface McpSettings {
  readonly memoryFilePath: string;
}

export interface CubeSettings {
  readonly apiUrl: string;
  readonly apiKey: string;
}

export interface MlflowSettings {
  readonly trackingUri: string;
}

export interface Settings {
  readonly anthropic: AnthropicSettings;
  readonly neon: NeonSettings;
  readonly redis: RedisSettings;
  readonly mcp: McpSettings;
  readonly cube: CubeSettings;
  readonly mlflow: MlflowSettings;
}

export function loadSettings(): Settings {
  const settings: Settings = Object.freeze({
    anthropic: Object.freeze({
      apiKey: requireEnv("ANTHROPIC_API_KEY"),
      model: "claude-sonnet-4-20250514",
    }),
    neon: Object.freeze({
      databaseUrl: requireEnv("NEON_DATABASE_URL"),
      apiKey: requireEnv("NEON_API_KEY"),
    }),
    redis: Object.freeze({
      url: requireEnv("REDIS_URL"),
    }),
    mcp: Object.freeze({
      memoryFilePath:
        (process.env.MEMORY_FILE_PATH ?? "").trim() || "./memory.jsonl",
    }),
    cube: Object.freeze({
      apiUrl: requireEnv("CUBE_API_URL"),
      apiKey: requireEnv("CUBE_API_KEY"),
    }),
    mlflow: Object.freeze({
      trackingUri: requireEnv("MLFLOW_TRACKING_URI"),
    }),
  });

  return settings;
}
