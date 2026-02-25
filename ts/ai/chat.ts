/**
 * AI SDK chat handler — generateText / streamText wrappers.
 *
 * Fail-fast: propagates all errors immediately.
 */

import { generateText, streamText, type LanguageModel } from "ai";

export interface JadeChatOptions {
  model: LanguageModel;
  messages: Array<{ role: string; content: string }>;
  system?: string;
  tools?: Record<string, any>;
}

/**
 * Generate text using the AI SDK (non-streaming).
 */
export async function jadeGenerateText(options: JadeChatOptions) {
  const result = await generateText({
    model: options.model,
    messages: options.messages as any,
    ...(options.system ? { system: options.system } : {}),
    ...(options.tools ? { tools: options.tools } : {}),
  });

  return {
    text: result.text,
    usage: result.usage,
    finishReason: result.finishReason,
    toolCalls: result.toolCalls,
  };
}

/**
 * Stream text using the AI SDK.
 */
export async function jadeStreamText(options: JadeChatOptions) {
  const result = streamText({
    model: options.model,
    messages: options.messages as any,
    ...(options.system ? { system: options.system } : {}),
    ...(options.tools ? { tools: options.tools } : {}),
  });

  return result;
}
