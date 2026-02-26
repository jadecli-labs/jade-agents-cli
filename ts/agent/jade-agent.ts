/**
 * Jade Agent — TypeScript agent with MCP tool integration.
 *
 * Wraps memory + jade-specific MCP servers with tool routing.
 * Fail-fast: invalid config throws immediately.
 */

import { createMemoryServer } from "../mcp/memory-server";
import { createJadeServer } from "../mcp/jade-server";
import { getJadeToolDefinitions } from "./tools";

export interface JadeAgentConfig {
  readonly apiKey: string;
  readonly model: string;
  readonly memoryFilePath: string;
}

interface ToolDef {
  name: string;
  description: string;
}

export class JadeAgent {
  public readonly model: string;
  private readonly memoryServer: ReturnType<typeof createMemoryServer>;
  private readonly jadeServer: ReturnType<typeof createJadeServer>;
  private readonly memoryToolNames: Set<string>;
  private readonly jadeToolNames: Set<string>;

  constructor(config: JadeAgentConfig) {
    if (!config.apiKey || !config.apiKey.trim()) {
      throw new Error("apiKey must be a non-empty string");
    }
    if (!config.model || !config.model.trim()) {
      throw new Error("model must be a non-empty string");
    }
    if (!config.memoryFilePath || !config.memoryFilePath.trim()) {
      throw new Error("memoryFilePath must be a non-empty string");
    }

    this.model = config.model;
    this.memoryServer = createMemoryServer({
      memoryFilePath: config.memoryFilePath,
    });
    this.jadeServer = createJadeServer({
      memoryFilePath: config.memoryFilePath,
    });

    // Build tool name sets for routing
    this.memoryToolNames = new Set([
      "create_entities",
      "create_relations",
      "add_observations",
      "delete_entities",
      "delete_observations",
      "delete_relations",
      "read_graph",
      "search_nodes",
      "open_nodes",
    ]);

    this.jadeToolNames = new Set([
      "record_decision",
      "recall_context",
      "update_hot_memory",
      "log_insight",
    ]);
  }

  getTools(): ToolDef[] {
    return getJadeToolDefinitions();
  }

  async handleToolCall(
    name: string,
    args: Record<string, any>
  ): Promise<any> {
    if (this.memoryToolNames.has(name)) {
      return this.memoryServer.callTool(name, args);
    }
    if (this.jadeToolNames.has(name)) {
      return this.jadeServer.callTool(name, args);
    }
    throw new Error(`Unknown tool: ${name}`);
  }
}
