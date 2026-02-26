/**
 * MCP Knowledge Graph Memory Server (TypeScript).
 *
 * Implements the 9-tool MCP memory protocol with JSONL persistence.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";

interface EntityRecord {
  name: string;
  entityType: string;
  observations: string[];
}

interface RelationRecord {
  from: string;
  to: string;
  relationType: string;
}

interface KnowledgeGraph {
  entities: EntityRecord[];
  relations: RelationRecord[];
}

export interface ToolDef {
  name: string;
  description: string;
}

function loadGraph(filePath: string): KnowledgeGraph {
  const graph: KnowledgeGraph = { entities: [], relations: [] };
  if (!existsSync(filePath)) return graph;

  try {
    const content = readFileSync(filePath, "utf-8");
    for (const line of content.split("\n")) {
      if (!line.trim()) continue;
      let record: any;
      try {
        record = JSON.parse(line);
      } catch {
        continue; // Skip corrupt lines, keep loading valid ones
      }
      if (record.type === "entity") {
        const existing = graph.entities.find((e) => e.name === record.name);
        if (existing) {
          existing.observations = [
            ...new Set([...existing.observations, ...(record.observations ?? [])]),
          ];
        } else {
          graph.entities.push({
            name: record.name,
            entityType: record.entityType ?? "Concept",
            observations: record.observations ?? [],
          });
        }
      } else if (record.type === "relation") {
        graph.relations.push({
          from: record.from,
          to: record.to,
          relationType: record.relationType,
        });
      }
    }
  } catch {
    // File unreadable — start with empty graph
  }
  return graph;
}

function saveGraph(graph: KnowledgeGraph, filePath: string): void {
  const lines: string[] = [];
  for (const entity of graph.entities) {
    lines.push(JSON.stringify({ ...entity, type: "entity" }));
  }
  for (const relation of graph.relations) {
    lines.push(JSON.stringify({ ...relation, type: "relation" }));
  }
  writeFileSync(filePath, lines.join("\n") + "\n");
}

export function createMemoryServer(opts: { memoryFilePath: string }) {
  const filePath = opts.memoryFilePath;

  const tools: ToolDef[] = [
    { name: "create_entities", description: "Create new entities" },
    { name: "create_relations", description: "Create relations between entities" },
    { name: "add_observations", description: "Add observations to entities" },
    { name: "delete_entities", description: "Delete entities" },
    { name: "delete_observations", description: "Delete observations" },
    { name: "delete_relations", description: "Delete relations" },
    { name: "read_graph", description: "Read the entire graph" },
    { name: "search_nodes", description: "Search for entities" },
    { name: "open_nodes", description: "Open specific nodes" },
  ];

  return {
    async listTools(): Promise<ToolDef[]> {
      return tools;
    },

    async callTool(name: string, args: Record<string, any>): Promise<any> {
      const graph = loadGraph(filePath);

      switch (name) {
        case "create_entities": {
          const created: string[] = [];
          for (const e of args.entities ?? []) {
            if (!e.name) throw new Error("Entity name is required");
            const existing = graph.entities.find((x) => x.name === e.name);
            if (existing) {
              existing.observations = [
                ...new Set([...existing.observations, ...(e.observations ?? [])]),
              ];
            } else {
              graph.entities.push({
                name: e.name,
                entityType: e.entityType ?? "Concept",
                observations: e.observations ?? [],
              });
            }
            created.push(e.name);
          }
          saveGraph(graph, filePath);
          return { created };
        }

        case "create_relations": {
          const created: string[] = [];
          for (const r of args.relations ?? []) {
            graph.relations.push({
              from: r.from,
              to: r.to,
              relationType: r.relationType,
            });
            created.push(`${r.from} -> ${r.to}`);
          }
          saveGraph(graph, filePath);
          return { created };
        }

        case "add_observations": {
          const added: any[] = [];
          for (const obs of args.observations ?? []) {
            const entity = graph.entities.find(
              (e) => e.name === obs.entityName
            );
            if (entity) {
              entity.observations = [
                ...new Set([...entity.observations, ...(obs.contents ?? [])]),
              ];
              added.push({
                entityName: obs.entityName,
                addedCount: (obs.contents ?? []).length,
              });
            }
          }
          saveGraph(graph, filePath);
          return { added };
        }

        case "delete_entities": {
          const names = new Set(args.entityNames ?? []);
          graph.entities = graph.entities.filter((e) => !names.has(e.name));
          graph.relations = graph.relations.filter(
            (r) => !names.has(r.from) && !names.has(r.to)
          );
          saveGraph(graph, filePath);
          return { deleted: [...names] };
        }

        case "delete_observations": {
          for (const d of args.deletions ?? []) {
            const entity = graph.entities.find(
              (e) => e.name === d.entityName
            );
            if (entity) {
              const toRemove = new Set(d.observations ?? []);
              entity.observations = entity.observations.filter(
                (o) => !toRemove.has(o)
              );
            }
          }
          saveGraph(graph, filePath);
          return { status: "ok" };
        }

        case "delete_relations": {
          const toRemove = new Set(
            (args.relations ?? []).map(
              (r: any) => `${r.from}|${r.to}|${r.relationType}`
            )
          );
          graph.relations = graph.relations.filter(
            (r) => !toRemove.has(`${r.from}|${r.to}|${r.relationType}`)
          );
          saveGraph(graph, filePath);
          return { status: "ok" };
        }

        case "read_graph": {
          return {
            entities: graph.entities,
            relations: graph.relations,
          };
        }

        case "search_nodes": {
          const query = (args.query ?? "").toLowerCase();
          const matches = graph.entities.filter(
            (e) =>
              e.name.toLowerCase().includes(query) ||
              e.entityType.toLowerCase().includes(query) ||
              e.observations.some((o) => o.toLowerCase().includes(query))
          );
          return { entities: matches, relations: [] };
        }

        case "open_nodes": {
          const nameSet = new Set(args.names ?? []);
          const matches = graph.entities.filter((e) => nameSet.has(e.name));
          const related = graph.relations.filter(
            (r) => nameSet.has(r.from) || nameSet.has(r.to)
          );
          return { entities: matches, relations: related };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    },
  };
}
