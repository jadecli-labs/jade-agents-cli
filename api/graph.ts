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

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
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
  } catch (error: any) {
    res.status(500).json({
      error: error.message,
      hint: "Ensure NEON_DATABASE_URL is set and migrations have been run.",
    });
  }
}
