/**
 * Knowledge graph API — GET /api/graph
 *
 * Returns the full knowledge graph from Neon.
 * Query params: ?type=Decision&limit=50
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createDbClient } from "../ts/db/client";
import { entities, relations } from "../ts/db/schema";
import { eq } from "drizzle-orm";

function setCorsHeaders(res: VercelResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Auth check: if API_AUTH_TOKEN is set, require Bearer token
  const expectedToken = process.env.API_AUTH_TOKEN;
  if (expectedToken) {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${expectedToken}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  try {
    const db = createDbClient();
    const entityType = req.query.type as string | undefined;

    let entityResults;
    if (entityType) {
      entityResults = await db
        .select()
        .from(entities)
        .where(eq(entities.entityType, entityType))
        .limit(50);
    } else {
      entityResults = await db.select().from(entities).limit(100);
    }

    const relationResults = await db.select().from(relations).limit(200);

    res.status(200).json({
      entities: entityResults,
      relations: relationResults,
      count: {
        entities: entityResults.length,
        relations: relationResults.length,
      },
    });
  } catch {
    res.status(500).json({
      error: "Internal server error",
      hint: "Ensure NEON_DATABASE_URL is set and migrations have been run.",
    });
  }
}
