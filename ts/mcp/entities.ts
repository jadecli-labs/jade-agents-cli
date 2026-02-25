/**
 * Entity, Relation, and Observation schemas for Jade's knowledge graph.
 * Fail-fast validation — invalid data throws immediately.
 */

export const JADE_ENTITY_TYPES = Object.freeze([
  "Person",
  "Decision",
  "Concept",
  "Tool",
  "Session",
  "Goal",
] as const);

export const JADE_RELATION_TYPES = Object.freeze([
  "made_decision",
  "discussed_concept",
  "uses_tool",
  "has_goal",
  "participated_in",
  "related_to",
] as const);

export type JadeEntityType = (typeof JADE_ENTITY_TYPES)[number];
export type JadeRelationType = (typeof JADE_RELATION_TYPES)[number];

export interface Entity {
  readonly name: string;
  readonly entityType: string;
  readonly observations: readonly string[];
}

export interface Relation {
  readonly from: string;
  readonly to: string;
  readonly relationType: string;
}

export function createEntity(input: {
  name: string;
  entityType: string;
  observations?: string[];
}): Entity {
  if (!input.name || !input.name.trim()) {
    throw new Error("Entity name must be a non-empty string");
  }
  if (!input.entityType || !input.entityType.trim()) {
    throw new Error("Entity entityType must be a non-empty string");
  }
  return Object.freeze({
    name: input.name,
    entityType: input.entityType,
    observations: Object.freeze(input.observations ?? []),
  });
}

export function createRelation(input: {
  from: string;
  to: string;
  relationType: string;
}): Relation {
  if (!input.from || !input.from.trim()) {
    throw new Error("Relation 'from' must be a non-empty string");
  }
  if (!input.to || !input.to.trim()) {
    throw new Error("Relation 'to' must be a non-empty string");
  }
  if (!input.relationType || !input.relationType.trim()) {
    throw new Error("Relation 'relationType' must be a non-empty string");
  }
  return Object.freeze({
    from: input.from,
    to: input.to,
    relationType: input.relationType,
  });
}

export function validateObservation(observation: string): boolean {
  if (!observation || !observation.trim()) {
    throw new Error("Observation must be a non-empty string");
  }
  return true;
}
