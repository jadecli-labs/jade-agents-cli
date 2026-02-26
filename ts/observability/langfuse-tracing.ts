/**
 * Langfuse tracing for LLM observability.
 *
 * Replaces MLflow with purpose-built LLM tracing.
 * Free tier: 50K observations/month.
 *
 * Fail-fast: throws on missing credentials.
 */

import { Langfuse } from "langfuse";

export interface LangfuseTracingConfig {
  readonly publicKey: string;
  readonly secretKey: string;
  readonly baseUrl?: string;
}

export class LangfuseTracing {
  private readonly langfuse: Langfuse;

  constructor(config: LangfuseTracingConfig) {
    if (!config.publicKey || !config.publicKey.trim()) {
      throw new Error("Langfuse publicKey is required");
    }
    if (!config.secretKey || !config.secretKey.trim()) {
      throw new Error("Langfuse secretKey is required");
    }

    this.langfuse = new Langfuse({
      publicKey: config.publicKey,
      secretKey: config.secretKey,
      baseUrl: config.baseUrl ?? "https://cloud.langfuse.com",
    });
  }

  /**
   * Create a trace for a user interaction.
   */
  createTrace(opts: {
    name: string;
    userId?: string;
    sessionId?: string;
    metadata?: Record<string, any>;
  }) {
    return this.langfuse.trace({
      name: opts.name,
      userId: opts.userId,
      sessionId: opts.sessionId,
      metadata: opts.metadata,
    });
  }

  /**
   * Record a tool call as a span within a trace.
   */
  recordToolCall(
    trace: ReturnType<Langfuse["trace"]>,
    opts: {
      toolName: string;
      input: Record<string, any>;
      output: Record<string, any>;
      durationMs: number;
    }
  ) {
    return trace.span({
      name: `tool:${opts.toolName}`,
      input: opts.input,
      output: opts.output,
      metadata: { durationMs: opts.durationMs },
    });
  }

  /**
   * Record token usage as a generation within a trace.
   */
  recordGeneration(
    trace: ReturnType<Langfuse["trace"]>,
    opts: {
      model: string;
      input: string;
      output: string;
      promptTokens: number;
      completionTokens: number;
    }
  ) {
    return trace.generation({
      name: "chat",
      model: opts.model,
      input: opts.input,
      output: opts.output,
      usage: {
        input: opts.promptTokens,
        output: opts.completionTokens,
      },
    });
  }

  /**
   * Flush pending events (call before process exit).
   */
  async flush(): Promise<void> {
    await this.langfuse.flushAsync();
  }

  /**
   * Shutdown the client.
   */
  async shutdown(): Promise<void> {
    await this.langfuse.shutdownAsync();
  }
}
