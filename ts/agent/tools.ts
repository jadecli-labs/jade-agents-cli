/**
 * Jade agent tool definitions for the Anthropic Messages API.
 *
 * Combines 9 memory tools + 4 jade-specific tools = 13 total.
 */

export interface JadeToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

const MEMORY_TOOLS: JadeToolDefinition[] = [
  {
    name: "create_entities",
    description: "Create new entities in the knowledge graph.",
    inputSchema: {
      type: "object",
      properties: {
        entities: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              entityType: { type: "string" },
              observations: { type: "array", items: { type: "string" } },
            },
            required: ["name"],
          },
        },
      },
      required: ["entities"],
    },
  },
  {
    name: "create_relations",
    description: "Create relations between entities.",
    inputSchema: {
      type: "object",
      properties: {
        relations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              from: { type: "string" },
              to: { type: "string" },
              relationType: { type: "string" },
            },
            required: ["from", "to", "relationType"],
          },
        },
      },
      required: ["relations"],
    },
  },
  {
    name: "add_observations",
    description: "Add observations to existing entities.",
    inputSchema: {
      type: "object",
      properties: {
        observations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              entityName: { type: "string" },
              contents: { type: "array", items: { type: "string" } },
            },
            required: ["entityName", "contents"],
          },
        },
      },
      required: ["observations"],
    },
  },
  {
    name: "delete_entities",
    description: "Delete entities and their associated relations.",
    inputSchema: {
      type: "object",
      properties: {
        entityNames: { type: "array", items: { type: "string" } },
      },
      required: ["entityNames"],
    },
  },
  {
    name: "delete_observations",
    description: "Delete specific observations from entities.",
    inputSchema: {
      type: "object",
      properties: {
        deletions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              entityName: { type: "string" },
              observations: { type: "array", items: { type: "string" } },
            },
            required: ["entityName", "observations"],
          },
        },
      },
      required: ["deletions"],
    },
  },
  {
    name: "delete_relations",
    description: "Delete specific relations.",
    inputSchema: {
      type: "object",
      properties: {
        relations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              from: { type: "string" },
              to: { type: "string" },
              relationType: { type: "string" },
            },
            required: ["from", "to", "relationType"],
          },
        },
      },
      required: ["relations"],
    },
  },
  {
    name: "read_graph",
    description: "Read the entire knowledge graph.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "search_nodes",
    description: "Search for entities matching a query string.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
      },
      required: ["query"],
    },
  },
  {
    name: "open_nodes",
    description: "Open specific nodes by name.",
    inputSchema: {
      type: "object",
      properties: {
        names: { type: "array", items: { type: "string" } },
      },
      required: ["names"],
    },
  },
];

const JADE_TOOLS: JadeToolDefinition[] = [
  {
    name: "record_decision",
    description:
      "Record a decision with rationale, creating entity + relations.",
    inputSchema: {
      type: "object",
      properties: {
        decisionName: { type: "string" },
        rationale: { type: "string" },
        decidedBy: { type: "string" },
        sessionId: { type: "string" },
      },
      required: ["decisionName"],
    },
  },
  {
    name: "recall_context",
    description: "Search the knowledge graph by session, date, or topic.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
      },
      required: ["query"],
    },
  },
  {
    name: "update_hot_memory",
    description: "Write a session summary to the knowledge graph.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string" },
        summary: { type: "string" },
        activeThreads: { type: "array", items: { type: "string" } },
      },
      required: ["sessionId", "summary"],
    },
  },
  {
    name: "log_insight",
    description: "Record an observation or learning as a concept.",
    inputSchema: {
      type: "object",
      properties: {
        insight: { type: "string" },
        category: { type: "string" },
        sessionId: { type: "string" },
      },
      required: ["insight"],
    },
  },
];

export function getJadeToolDefinitions(): JadeToolDefinition[] {
  return [...MEMORY_TOOLS, ...JADE_TOOLS];
}
