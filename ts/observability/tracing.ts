/**
 * Tracing service for observability.
 *
 * Fail-fast: invalid tracking URI throws immediately.
 */

export interface TracingConfig {
  readonly trackingUri: string;
  readonly experimentName?: string;
  readonly useFake?: boolean;
}

interface ToolCallSpan {
  type: "tool_call";
  toolName: string;
  input: Record<string, any>;
  output: Record<string, any>;
  durationMs: number;
  [key: string]: any;
}

interface TokenUsageSpan {
  type: "token_usage";
  promptTokens: number;
  completionTokens: number;
  model: string;
  [key: string]: any;
}

type Span = ToolCallSpan | TokenUsageSpan;

export class TracingService {
  private spans: Span[] = [];

  constructor(config: TracingConfig) {
    if (!config.trackingUri || !config.trackingUri.trim()) {
      throw new Error("trackingUri must be a non-empty string");
    }
    if (!config.useFake) {
      throw new Error(
        "Real tracing not implemented. Use useFake: true for testing."
      );
    }
  }

  recordToolCall(opts: {
    toolName: string;
    input: Record<string, any>;
    output: Record<string, any>;
    durationMs: number;
  }): void {
    this.spans.push({
      type: "tool_call",
      toolName: opts.toolName,
      input: opts.input,
      output: opts.output,
      durationMs: opts.durationMs,
    });
  }

  recordTokenUsage(opts: {
    promptTokens: number;
    completionTokens: number;
    model: string;
  }): void {
    this.spans.push({
      type: "token_usage",
      promptTokens: opts.promptTokens,
      completionTokens: opts.completionTokens,
      model: opts.model,
    });
  }

  getRecordedSpans(): Span[] {
    return [...this.spans];
  }

  clearSpans(): void {
    this.spans = [];
  }
}
