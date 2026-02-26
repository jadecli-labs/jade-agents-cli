/**
 * AI SDK Anthropic provider configuration.
 *
 * Fail-fast: throws on invalid API key.
 */

import { createAnthropic } from "@ai-sdk/anthropic";

export interface JadeProviderConfig {
  readonly apiKey: string;
  readonly baseURL?: string;
  readonly cacheControl?: boolean;
}

const DEFAULT_MODEL = "claude-sonnet-4-20250514";

export function createJadeProvider(config: JadeProviderConfig) {
  if (!config.apiKey || !config.apiKey.trim()) {
    throw new Error("apiKey must be a non-empty string");
  }

  const anthropic = createAnthropic({
    apiKey: config.apiKey,
    ...(config.baseURL ? { baseURL: config.baseURL } : {}),
  });

  return {
    /**
     * Get a model instance by ID.
     */
    model(modelId: string) {
      return anthropic(modelId);
    },

    /**
     * Get the default model instance (Claude Sonnet 4).
     */
    defaultModel() {
      return anthropic(DEFAULT_MODEL);
    },
  };
}
