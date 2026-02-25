/**
 * Neon PostgreSQL + pgvector schema (Drizzle ORM).
 *
 * Tables:
 * - entities: Knowledge graph entities with pgvector embeddings
 * - relations: Directed relations between entities
 * - sessions: Session metadata and summaries
 */

import {
  pgTable,
  text,
  timestamp,
  jsonb,
  index,
  primaryKey,
  varchar,
  integer,
  customType,
} from "drizzle-orm/pg-core";

// pgvector custom type for embeddings
const vector = customType<{
  data: number[];
  dpiData: string;
  config: { dimensions: number };
}>({
  dataType(config) {
    return `vector(${config?.dimensions ?? 1536})`;
  },
  toDriver(value: number[]): string {
    return `[${value.join(",")}]`;
  },
  fromDriver(value: unknown): number[] {
    const str = String(value);
    return str
      .slice(1, -1)
      .split(",")
      .map(Number);
  },
});

export const entities = pgTable(
  "entities",
  {
    name: varchar("name", { length: 512 }).primaryKey(),
    entityType: varchar("entity_type", { length: 128 }).notNull(),
    observations: jsonb("observations").$type<string[]>().notNull().default([]),
    embedding: vector("embedding", { dimensions: 1536 }),
    sessionId: varchar("session_id", { length: 256 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("entities_type_idx").on(table.entityType),
    index("entities_session_idx").on(table.sessionId),
  ]
);

export const relations = pgTable(
  "relations",
  {
    fromEntity: varchar("from_entity", { length: 512 })
      .notNull()
      .references(() => entities.name, { onDelete: "cascade" }),
    toEntity: varchar("to_entity", { length: 512 })
      .notNull()
      .references(() => entities.name, { onDelete: "cascade" }),
    relationType: varchar("relation_type", { length: 128 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.fromEntity, table.toEntity, table.relationType] }),
    index("relations_from_idx").on(table.fromEntity),
    index("relations_to_idx").on(table.toEntity),
  ]
);

export const sessions = pgTable(
  "sessions",
  {
    id: varchar("id", { length: 256 }).primaryKey(),
    summary: text("summary"),
    activeThreads: jsonb("active_threads").$type<string[]>().default([]),
    promotedAt: timestamp("promoted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("sessions_promoted_idx").on(table.promotedAt),
  ]
);
