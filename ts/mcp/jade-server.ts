/**
 * Jade-specific MCP tools — higher-level operations on the knowledge graph.
 *
 * Tools: record_decision, recall_context, update_hot_memory, log_insight
 */

import { createMemoryServer, type ToolDef } from "./memory-server";

export function createJadeServer(opts: { memoryFilePath: string }) {
  const memoryServer = createMemoryServer(opts);

  const jadeTools: ToolDef[] = [
    {
      name: "record_decision",
      description: "Record a decision with rationale, creating entity + relations",
    },
    {
      name: "recall_context",
      description: "Search the knowledge graph by session, date, or topic",
    },
    {
      name: "update_hot_memory",
      description: "Write a session summary to the knowledge graph",
    },
    {
      name: "log_insight",
      description: "Record an observation or learning as a concept",
    },
  ];

  return {
    async listTools(): Promise<ToolDef[]> {
      return jadeTools;
    },

    async callTool(name: string, args: Record<string, any>): Promise<any> {
      switch (name) {
        case "record_decision": {
          const decisionName = args.decisionName ?? "";
          if (!decisionName.trim()) {
            throw new Error("decisionName must be a non-empty string");
          }
          const rationale = args.rationale ?? "";
          const decidedBy = args.decidedBy ?? "";
          const sessionId = args.sessionId ?? "";

          // Create decision entity + conditionally person/session
          const entitiesToCreate: any[] = [
            {
              name: decisionName,
              entityType: "Decision",
              observations: [rationale],
            },
          ];
          if (decidedBy.trim()) {
            entitiesToCreate.push({ name: decidedBy, entityType: "Person", observations: [] });
          }
          if (sessionId.trim()) {
            entitiesToCreate.push({ name: sessionId, entityType: "Session", observations: [] });
          }

          await memoryServer.callTool("create_entities", {
            entities: entitiesToCreate,
          });

          const relationsToCreate: any[] = [];
          if (decidedBy.trim()) {
            relationsToCreate.push({
              from: decidedBy,
              to: decisionName,
              relationType: "made_decision",
            });
          }
          if (sessionId.trim()) {
            relationsToCreate.push({
              from: decisionName,
              to: sessionId,
              relationType: "participated_in",
            });
          }
          if (relationsToCreate.length > 0) {
            await memoryServer.callTool("create_relations", {
              relations: relationsToCreate,
            });
          }

          return {
            status: "recorded",
            decision: decisionName,
            decidedBy,
            session: sessionId,
          };
        }

        case "recall_context": {
          return memoryServer.callTool("search_nodes", {
            query: args.query ?? "",
          });
        }

        case "update_hot_memory": {
          const sessionId = args.sessionId ?? "";
          const summary = args.summary ?? "";
          const activeThreads: string[] = args.activeThreads ?? [];

          const observations = [
            summary,
            ...activeThreads.map((t: string) => `Active thread: ${t}`),
          ];

          await memoryServer.callTool("create_entities", {
            entities: [
              {
                name: sessionId,
                entityType: "Session",
                observations,
              },
            ],
          });

          return {
            status: "updated",
            session: sessionId,
            summaryLength: summary.length,
            activeThreads,
          };
        }

        case "log_insight": {
          const insight = args.insight ?? "";
          const category = args.category ?? "Concept";
          const sessionId = args.sessionId ?? "";

          const words = insight.split(/\s+/).slice(0, 5);
          const name = words
            .map((w: string) => w.toLowerCase().replace(/[.,!?]/g, ""))
            .join("-");

          await memoryServer.callTool("create_entities", {
            entities: [
              {
                name,
                entityType: category,
                observations: [insight],
              },
            ],
          });

          if (sessionId) {
            await memoryServer.callTool("create_relations", {
              relations: [
                {
                  from: name,
                  to: sessionId,
                  relationType: "participated_in",
                },
              ],
            });
          }

          return { status: "logged", name, category, insight };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    },
  };
}
