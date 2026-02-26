/**
 * Health check endpoint — GET /api/health
 *
 * Returns service connectivity status (configured/not_configured).
 * Does not expose env var values or internal details.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(
  _req: VercelRequest,
  res: VercelResponse
) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  const checks: Record<string, string> = {
    status: "ok",
    timestamp: new Date().toISOString(),
  };

  checks.neon = process.env.NEON_DATABASE_URL ? "configured" : "not_configured";
  checks.upstash =
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
      ? "configured"
      : "not_configured";
  checks.langfuse =
    process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY
      ? "configured"
      : "not_configured";
  checks.anthropic = process.env.ANTHROPIC_API_KEY
    ? "configured"
    : "not_configured";

  res.status(200).json(checks);
}
