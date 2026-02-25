/**
 * Health check endpoint — GET /api/health
 *
 * Returns service status for all connected cloud services.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(
  _req: VercelRequest,
  res: VercelResponse
) {
  const checks: Record<string, string> = {
    status: "ok",
    timestamp: new Date().toISOString(),
    services: "checking",
  };

  // Check Neon
  try {
    if (process.env.NEON_DATABASE_URL) {
      checks.neon = "configured";
    } else {
      checks.neon = "not_configured";
    }
  } catch {
    checks.neon = "error";
  }

  // Check Upstash
  checks.upstash =
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
      ? "configured"
      : "not_configured";

  // Check Langfuse
  checks.langfuse =
    process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY
      ? "configured"
      : "not_configured";

  // Check Anthropic
  checks.anthropic = process.env.ANTHROPIC_API_KEY
    ? "configured"
    : "not_configured";

  checks.services = "checked";

  res.status(200).json(checks);
}
