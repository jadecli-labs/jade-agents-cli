/**
 * Neon database client (Drizzle ORM + @neondatabase/serverless).
 *
 * Fail-fast: throws if NEON_DATABASE_URL is not set.
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export function createDbClient(databaseUrl?: string) {
  const url = databaseUrl ?? process.env.NEON_DATABASE_URL;
  if (!url || !url.trim()) {
    throw new Error(
      "NEON_DATABASE_URL is required. Set it in .env or pass it directly."
    );
  }

  const sql = neon(url);
  return drizzle(sql, { schema });
}

export type DbClient = ReturnType<typeof createDbClient>;
