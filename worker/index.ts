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
  API_AUTH_TOKEN?: string;
  ENVIRONMENT: string;
}

interface MCPRequest {
  method: string;
  params?: Record<string, any>;
}

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

function jsonResponse(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: CORS_HEADERS });
}

function checkAuth(request: Request, env: Env): Response | null {
  if (!env.API_AUTH_TOKEN) return null; // No token configured = open
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${env.API_AUTH_TOKEN}`) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }
  return null;
}

export default {
  async fetch(
    request: Request,
    env: Env,
  ): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 200, headers: CORS_HEADERS });
    }

    // Health check (no auth required)
    if (url.pathname === "/health") {
      return jsonResponse({
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

    // MCP tool listing (auth required)
    if (url.pathname === "/tools" && request.method === "GET") {
      const authError = checkAuth(request, env);
      if (authError) return authError;

      return jsonResponse({
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

    // MCP tool execution (auth required)
    if (url.pathname === "/call" && request.method === "POST") {
      const authError = checkAuth(request, env);
      if (authError) return authError;

      try {
        const body = (await request.json()) as MCPRequest;

        if (!body.method) {
          return jsonResponse(
            { error: "Missing 'method' in request body" },
            400
          );
        }

        return jsonResponse({
          status: "received",
          method: body.method,
          message:
            "MCP tool routing active. Connect a full MCP server for execution.",
        });
      } catch {
        return jsonResponse({ error: "Internal server error" }, 500);
      }
    }

    // Root
    if (url.pathname === "/") {
      return jsonResponse({
        name: "Jade MCP Server",
        version: "0.1.0",
        endpoints: ["/health", "/tools", "/call"],
      });
    }

    return jsonResponse({ error: "Not found" }, 404);
  },
};
