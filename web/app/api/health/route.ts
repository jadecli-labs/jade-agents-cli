import { NextResponse } from "next/server";

export function GET() {
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

  return NextResponse.json(checks);
}
