/**
 * MCP client manager — unified interface to memory + jade servers.
 *
 * Fail-fast: throws on invalid config or connection failures.
 */

import { createMemoryServer } from "./memory-server";
import { createJadeServer } from "./jade-server";

export interface JadeMCPClientConfig {
  readonly memoryFilePath: string;
}

interface ToolDef {
  name: string;
  description: string;
}

export async function createJadeMCPClient(config: JadeMCPClientConfig) {
  if (!config.memoryFilePath || !config.memoryFilePath.trim()) {
    throw new Error("memoryFilePath must be a non-empty string");
  }

  const memoryServer = createMemoryServer({
    memoryFilePath: config.memoryFilePath,
  });
  const jadeServer = createJadeServer({
    memoryFilePath: config.memoryFilePath,
  });

  const memoryTools = await memoryServer.listTools();
  const jadeTools = await jadeServer.listTools();
  const memoryToolNames = new Set(memoryTools.map((t) => t.name));
  const jadeToolNames = new Set(jadeTools.map((t) => t.name));

  return {
    async listTools(): Promise<ToolDef[]> {
      return [...memoryTools, ...jadeTools];
    },

    async callTool(name: string, args: Record<string, any>): Promise<any> {
      if (memoryToolNames.has(name)) {
        return memoryServer.callTool(name, args);
      }
      if (jadeToolNames.has(name)) {
        return jadeServer.callTool(name, args);
      }
      throw new Error(`Unknown tool: ${name}`);
    },
  };
}
