/**
 * Cloudflare Worker — Jade MCP Server
 *
 * Exposes MCP memory + jade tools as HTTP JSON-RPC endpoints at the edge.
 * Runs on Cloudflare's global network (100K free requests/day).
 */

export interface Env {
  NEON_DATABASE_URL: string;
  UPSTASH_REDIS_REST_URL: string;
  UPSTASH_REDIS_REST_TOKEN: string;
  ANTHROPIC_API_KEY: string;
  ENVIRONMENT: string;
}

interface MCPRequest {
  method: string;
  params?: Record<string, any>;
}

export default {
  async fetch(
    request: Request,
    env: Env,
  ): Promise<Response> {
    const url = new URL(request.url);

    // Health check
    if (url.pathname === "/health") {
      return Response.json({
        status: "ok",
        worker: "jade-mcp",
        environment: env.ENVIRONMENT,
        timestamp: new Date().toISOString(),
        services: {
          neon: env.NEON_DATABASE_URL ? "configured" : "missing",
          upstash: env.UPSTASH_REDIS_REST_URL ? "configured" : "missing",
          anthropic: env.ANTHROPIC_API_KEY ? "configured" : "missing",
        },
      });
    }

    // MCP tool listing
    if (url.pathname === "/tools" && request.method === "GET") {
      return Response.json({
        tools: [
          "create_entities",
          "create_relations",
          "add_observations",
          "delete_entities",
          "delete_observations",
          "delete_relations",
          "read_graph",
          "search_nodes",
          "open_nodes",
          "record_decision",
          "recall_context",
          "update_hot_memory",
          "log_insight",
        ],
      });
    }

    // MCP tool execution
    if (url.pathname === "/call" && request.method === "POST") {
      try {
        const body = (await request.json()) as MCPRequest;

        if (!body.method) {
          return Response.json(
            { error: "Missing 'method' in request body" },
            { status: 400 }
          );
        }

        // Route to appropriate handler
        // In production, this would delegate to the actual MCP server implementations
        return Response.json({
          status: "received",
          method: body.method,
          message:
            "MCP tool routing active. Connect a full MCP server for execution.",
        });
      } catch (error: any) {
        return Response.json(
          { error: error.message },
          { status: 500 }
        );
      }
    }

    // Root
    if (url.pathname === "/") {
      return Response.json({
        name: "Jade MCP Server",
        version: "0.1.0",
        endpoints: ["/health", "/tools", "/call"],
      });
    }

    return Response.json({ error: "Not found" }, { status: 404 });
  },
};
