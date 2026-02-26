# Jade Web App — Wireframes

Auto-generated from web/wireframes/*.txt — do not edit directly.
Edit individual files, then run: bash web/wireframes/build.sh

---

NAV — shared across all pages (except /docs which uses fumadocs nav)

+------------------------------------------------------------------+
| JADE    Dashboard  Graph  Tools  Tasks  Sessions  Chat  Traces   |
|                                                  Search  Costs   |
+------------------------------------------------------------------+

Active page is highlighted. Links to all 10 routes.

---

LANDING  /

+------------------------------------------------------------------+
| JADE    Dashboard  Graph  Tools  Tasks  Sessions  Chat  Traces   |
+------------------------------------------------------------------+
|                                                                  |
|                      Jade Agents CLI                             |
|                                                                  |
|        Bilateral learning partnership AI agent system.           |
|                                                                  |
|           [ Documentation ]    [ Chat with Jade ]                |
|                                                                  |
|   +----------+  +----------+  +----------+  +----------+        |
|   |   288    |  |   9+4    |  |    2     |  |   live   |        |
|   |  Tests   |  |MCP Tools |  |Languages |  | Services |        |
|   +----------+  +----------+  +----------+  +----------+        |
|                                                                  |
|   +---------------------------+  +--------------------------+    |
|   | Knowledge Graph           |  | Service Health           |    |
|   | Explore entities,         |  | Neon, Upstash, Langfuse, |    |
|   | decisions, relations      |  | Anthropic status         |    |
|   | [ Open Graph ]            |  | [ Open Dashboard ]       |    |
|   +---------------------------+  +--------------------------+    |
|                                                                  |
+------------------------------------------------------------------+

Hero + stats + two feature cards linking to /graph and /dashboard.

---

DASHBOARD  /dashboard

+------------------------------------------------------------------+
| JADE    Dashboard  Graph  Tools  Tasks  Sessions  Chat  Traces   |
+------------------------------------------------------------------+
|                                                                  |
|  Service Health                       Last checked: 12s ago      |
|                                       [ Refresh ]                |
|                                                                  |
|  +--------------------------+  +--------------------------+      |
|  | Neon PostgreSQL      [*] |  | Upstash Redis        [*] |      |
|  | configured               |  | configured               |      |
|  | Cold memory, pgvector    |  | Hot session memory       |      |
|  +--------------------------+  +--------------------------+      |
|                                                                  |
|  +--------------------------+  +--------------------------+      |
|  | Anthropic API        [*] |  | Langfuse             [x] |      |
|  | configured               |  | not_configured           |      |
|  | Claude model access      |  | Observability tracing    |      |
|  +--------------------------+  +--------------------------+      |
|                                                                  |
|  [*] green   [x] red                                            |
|                                                                  |
|  API Endpoints                                                   |
|  GET /api/health .............. 200  23ms                        |
|  GET /api/graph ............... 200 142ms                        |
|                                                                  |
+------------------------------------------------------------------+

Calls GET /api/health on load. Auto-refreshes. 4 service cards + endpoint latency.

---

GRAPH  /graph

+------------------------------------------------------------------+
| JADE    Dashboard  Graph  Tools  Tasks  Sessions  Chat  Traces   |
+------------------------------------------------------------------+
|                                                                  |
|  Knowledge Graph                           47 entities           |
|                                                                  |
|  [ Search entities...       ]                                    |
|  [All] [Person] [Decision] [Concept] [Tool] [Session] [Goal]    |
|                                                                  |
|  +---------------------+  +----------------------------------+  |
|  | ENTITIES             |  | DETAIL                          |  |
|  |                      |  |                                  |  |
|  | > Alex          Per  |  | Alex                            |  |
|  |   Jade          Too  |  | Type: Person                    |  |
|  |   Use pgvector  Dec  |  |                                  |  |
|  |   MCP Protocol  Con  |  | Observations:                   |  |
|  |   session-001   Ses  |  | - Project lead for Jade         |  |
|  |   Prompt Cache  Dec  |  | - Prefers fail-fast patterns    |  |
|  |   Redis TTL     Con  |  | - Uses TDD workflow             |  |
|  |   Claude SDK    Too  |  |                                  |  |
|  |   ...                |  | Relations:                       |  |
|  |                      |  | -> made_decision -> Use pgvector |  |
|  |                      |  | -> uses_tool -> Jade             |  |
|  |                      |  | -> uses_tool -> Claude SDK       |  |
|  |                      |  | -> participated_in -> session-001|  |
|  +---------------------+  +----------------------------------+  |
|                                                                  |
+------------------------------------------------------------------+

Two-panel. Click entity left -> detail right.
Type badges filter list. Relations are clickable links to other entities.
Data from GET /api/graph.

---

TOOLS  /tools

+------------------------------------------------------------------+
| JADE    Dashboard  Graph  Tools  Tasks  Sessions  Chat  Traces   |
+------------------------------------------------------------------+
|                                                                  |
|  MCP Tools                                         13 available  |
|                                                                  |
|  MEMORY SERVER (9)                                               |
|  +------------------------------------------------------------+ |
|  | create_entities                                             | |
|  | Create new entities in the knowledge graph.                 | |
|  | Params: entities (required) — list of {name, entityType,    | |
|  |         observations}                                       | |
|  +------------------------------------------------------------+ |
|  | create_relations                                            | |
|  | Create relations between entities.                          | |
|  | Params: relations (required) — list of {from, to,           | |
|  |         relationType}                                       | |
|  +------------------------------------------------------------+ |
|  | search_nodes                                                | |
|  | Search for entities matching a query string.                | |
|  | Params: query (required) — string                           | |
|  +------------------------------------------------------------+ |
|  | read_graph  |  open_nodes  |  add_observations              | |
|  | delete_entities  |  delete_observations  |  delete_relations | |
|  +------------------------------------------------------------+ |
|                                                                  |
|  JADE SERVER (4)                                                 |
|  +------------------------------------------------------------+ |
|  | record_decision                                             | |
|  | Create decision entity + person + session + relations.      | |
|  | Params: decisionName (required), rationale, decidedBy,      | |
|  |         sessionId                                           | |
|  +------------------------------------------------------------+ |
|  | recall_context  |  update_hot_memory  |  log_insight        | |
|  +------------------------------------------------------------+ |
|                                                                  |
+------------------------------------------------------------------+

Static page. Data from getJadeToolDefinitions(). Grouped by server.
Each tool shows name, description, required params from inputSchema.

---

TASKS  /tasks

+------------------------------------------------------------------+
| JADE    Dashboard  Graph  Tools  Tasks  Sessions  Chat  Traces   |
+------------------------------------------------------------------+
|                                                                  |
|  Task Planner                                                    |
|                                                                  |
|  [ Describe what you want to build...                          ] |
|  Model: [Opus] [Sonnet] [Haiku]                   [ Plan ]      |
|                                                                  |
|  +------------------------------------------------------------+ |
|  | PLAN: Add semantic search to graph page        feat | HIGH  | |
|  |                                                             | |
|  | Steps:                                                      | |
|  | 1. Create /api/search route          ~2,400 tokens          | |
|  | 2. Add search input to /graph        ~1,800 tokens          | |
|  | 3. Wire embedding pipeline           ~3,200 tokens          | |
|  |                                                             | |
|  | Estimated: 7,400 tokens  ~$0.037 (sonnet)                   | |
|  | Commit: feat(graph): add semantic search                    | |
|  +------------------------------------------------------------+ |
|                                                                  |
|  REVIEW                                          verdict: APPROVE|
|  +------------------------------------------------------------+ |
|  | Findings:                                                   | |
|  | [suggestion] Step 2: consider debouncing the search input   | |
|  | [nit] Step 3: use batch embed for multiple queries          | |
|  +------------------------------------------------------------+ |
|                                                                  |
+------------------------------------------------------------------+

Input task description -> get plan with steps, token estimates, cost.
Review panel shows verdict (approve/revise/reject) + findings with severity.
Data from POST /api/plan and POST /api/review.
Types from ts/task/spec.ts (TaskPlan, TaskStep, TaskReview).
Cost from ts/task/cost.ts (estimateCost, formatCost).

---

SESSIONS  /sessions

+------------------------------------------------------------------+
| JADE    Dashboard  Graph  Tools  Tasks  Sessions  Chat  Traces   |
+------------------------------------------------------------------+
|                                                                  |
|  Sessions                                                        |
|                                                                  |
|  +------------------------------------------------------------+ |
|  | ID              | Summary              | TTL    | Promoted  | |
|  |-----------------|----------------------|--------|-----------|  |
|  | session-003     | Memory arch discuss  | 42m    |    no     | |
|  | session-002     | TDD workflow setup   | expired|   yes     | |
|  | session-001     | Initial scaffolding  | expired|   yes     | |
|  +------------------------------------------------------------+ |
|                                                                  |
|  +------------------------------------------------------------+ |
|  | session-003                                                 | |
|  |                                                             | |
|  | Summary: Discussed memory architecture decisions            | |
|  | TTL: 42 minutes remaining                                   | |
|  | Promoted: no                          [ Promote to Cold ]   | |
|  |                                                             | |
|  | Active Threads:                                             | |
|  | - pgvector index strategy                                   | |
|  | - Redis TTL policy for working memory                       | |
|  |                                                             | |
|  | Working Memory:                                             | |
|  | decisions: 2 items                                          | |
|  | concepts: 3 items                                           | |
|  +------------------------------------------------------------+ |
|                                                                  |
+------------------------------------------------------------------+

Click row -> expand detail below.
Shows TTL countdown, promotion status, active threads, working memory namespaces.
Data from GET /api/sessions (Neon sessions table + Upstash TTL).
Promote button calls POST /api/promote/[id].

---

CHAT  /chat

+------------------------------------------------------------------+
| JADE    Dashboard  Graph  Tools  Tasks  Sessions  Chat  Traces   |
+------------------------------------------------------------------+
|                                                                  |
|  Chat with Jade                                                  |
|                                                                  |
|  +------------------------------------------------------------+ |
|  |                                                             | |
|  |  JADE  Hi! I'm Jade, your learning partner. I have         | |
|  |        access to the knowledge graph and can record         | |
|  |        decisions, recall context, and log insights.         | |
|  |                                                             | |
|  |  YOU   What decisions have we made about memory?            | |
|  |                                                             | |
|  |  JADE  Let me search the knowledge graph.                   | |
|  |                                                             | |
|  |        +--------------------------------------------------+ | |
|  |        | recall_context                                    | | |
|  |        | { "topic": "memory" }                             | | |
|  |        | 3 entities found                                  | | |
|  |        +--------------------------------------------------+ | |
|  |                                                             | |
|  |        Here are the memory-related decisions:               | |
|  |                                                             | |
|  |        1. Use pgvector — Neon pgvector for cold storage     | |
|  |        2. Redis TTL — Session data expires after 24h        | |
|  |                                                             | |
|  +------------------------------------------------------------+ |
|                                                                  |
|  +------------------------------------------------------------+ |
|  | Ask Jade anything...                             [ Send ]   | |
|  +------------------------------------------------------------+ |
|                                                                  |
+------------------------------------------------------------------+

Streaming via Vercel AI SDK useChat. Tool calls inline as collapsible cards.
Cards show: tool name, input params, result summary.
Data from POST /api/chat (streamText with MCP tools).

---

TRACES  /traces

+------------------------------------------------------------------+
| JADE    Dashboard  Graph  Tools  Tasks  Sessions  Chat  Traces   |
+------------------------------------------------------------------+
|                                                                  |
|  Agent Traces                                                    |
|                                                                  |
|  +------------------------------------------------------------+ |
|  | Session         | Started      | Tokens  | Latency          | |
|  |-----------------|--------------|---------|------------------|  |
|  | session-003     | 2 hours ago  |  4,230  |  3.2s            | |
|  | session-002     | yesterday    | 12,841  |  8.7s            | |
|  | session-001     | 2 days ago   |  8,102  |  5.1s            | |
|  +------------------------------------------------------------+ |
|                                                                  |
|  +------------------------------------------------------------+ |
|  | session-003                                                 | |
|  |                                                             | |
|  | [0.0s] jade-session ---------------------------             | |
|  |   [0.1s] search_nodes --------  420ms                      | |
|  |   [0.6s] record_decision -----  380ms                      | |
|  |   [1.2s] update_hot_memory ---  210ms                      | |
|  |   [1.5s] llm-generation ------  1.7s                       | |
|  |                                                             | |
|  | Input: 2,840  Output: 1,390  Total: 4,230                  | |
|  | Entities: 2  Relations: 3                                   | |
|  +------------------------------------------------------------+ |
|                                                                  |
+------------------------------------------------------------------+

Click row -> expand trace timeline below.
Spans as horizontal bars proportional to duration.
Token breakdown per session. Links to entities in /graph.
Data from Langfuse API (read-only).

---

SEARCH  /search

+------------------------------------------------------------------+
| JADE    Dashboard  Graph  Tools  Tasks  Sessions  Chat  Traces   |
+------------------------------------------------------------------+
|                                                                  |
|  Semantic Search                                                 |
|                                                                  |
|  [ How did we decide on the memory architecture?             ]   |
|                                                       [ Search ] |
|                                                                  |
|  3 results                                                       |
|                                                                  |
|  +------------------------------------------------------------+ |
|  | Use pgvector                                    Decision    | |
|  | Score: 0.92                                                 | |
|  | Chose Neon pgvector for cold storage over Pinecone          | |
|  +------------------------------------------------------------+ |
|  | Redis TTL                                       Decision    | |
|  | Score: 0.87                                                 | |
|  | Session data expires after 24h to prevent stale context     | |
|  +------------------------------------------------------------+ |
|  | Hot-Cold Promotion                              Concept     | |
|  | Score: 0.81                                                 | |
|  | Embed entities from Redis, store in Neon pgvector           | |
|  +------------------------------------------------------------+ |
|                                                                  |
+------------------------------------------------------------------+

Natural language query -> embed -> cosine similarity against cold memory.
Results: entity name, type badge, similarity score, first observation.
Click result -> navigate to entity in /graph.
Data from POST /api/search (EmbeddingPipeline + ColdMemoryClient.semanticSearch).

---

COSTS  /costs

+------------------------------------------------------------------+
| JADE    Dashboard  Graph  Tools  Tasks  Sessions  Chat  Traces   |
+------------------------------------------------------------------+
|                                                                  |
|  API Costs                                                       |
|                                                                  |
|  MODEL PRICING (per 1M tokens)                                   |
|  +------------------------------------------------------------+ |
|  | Model   | Input  | Output | Cache Write | Cache Read        | |
|  |---------|--------|--------|-------------|------------------- | |
|  | Opus    | $15    | $75    | $18.75      | $1.50              | |
|  | Sonnet  | $3     | $15    | $3.75       | $0.30              | |
|  | Haiku   | $1     | $5     | $1.25       | $0.10              | |
|  +------------------------------------------------------------+ |
|                                                                  |
|  SESSION COSTS                                                   |
|  +------------------------------------------------------------+ |
|  | Session         | Model  | Tokens  | Cost                   | |
|  |-----------------|--------|---------|----------------------- | |
|  | session-003     | sonnet |  4,230  | $0.042                 | |
|  | session-002     | opus   | 12,841  | $0.89                  | |
|  | session-001     | sonnet |  8,102  | $0.081                 | |
|  |-----------------|--------|---------|----------------------- | |
|  | Total           |        | 25,173  | $1.01                  | |
|  +------------------------------------------------------------+ |
|                                                                  |
+------------------------------------------------------------------+

Top: static pricing table from PRICING in ts/task/cost.ts.
Bottom: per-session costs via calculateCost() + formatUsageSummary().
Data from GET /api/costs (aggregates token usage across sessions).

---

ANALYTICS  /analytics

Unlocked by: Cube.js setup (ts/semantic/cube-client.ts)

+------------------------------------------------------------------+
| JADE    Dashboard  Graph  Tools  Tasks  Sessions  Chat  Traces   |
|                                        Search  Costs  Analytics  |
+------------------------------------------------------------------+
|                                                                  |
|  Analytics                                                       |
|                                                                  |
|  SESSIONS OVER TIME                                              |
|  +------------------------------------------------------------+ |
|  |                                                             | |
|  |  8 |         *                                              | |
|  |  6 |    *         *                                         | |
|  |  4 |                   *    *                                | |
|  |  2 | *                           *                          | |
|  |  0 +---+----+----+----+----+----+---                        | |
|  |    Feb19 Feb20 Feb21 Feb22 Feb23 Feb24 Feb25                | |
|  |                                                             | |
|  +------------------------------------------------------------+ |
|                                                                  |
|  TOOL USAGE                                                      |
|  +------------------------------------------------------------+ |
|  | search_nodes      ████████████████████  42                  | |
|  | record_decision   ████████████  28                          | |
|  | recall_context    ████████  19                              | |
|  | create_entities   ██████  14                                | |
|  | update_hot_memory ████  9                                   | |
|  | log_insight       ███  7                                    | |
|  +------------------------------------------------------------+ |
|                                                                  |
|  TOKENS BY MODEL                                                 |
|  +------------------------------------------------------------+ |
|  | Sonnet  ██████████████████████████████  72%   18,400 tokens | |
|  | Opus    ████████  21%                         5,200 tokens  | |
|  | Haiku   ███  7%                               1,800 tokens  | |
|  +------------------------------------------------------------+ |
|                                                                  |
+------------------------------------------------------------------+

Three charts: sessions over time (line), tool usage (horizontal bar),
tokens by model (horizontal bar with %).
Data from Cube.js semantic layer via CubeClient.query().

---

AGENT ACTIONS  /actions

Unlocked by: Agent SDK wrapper (Claude Agent SDK integration)

+------------------------------------------------------------------+
| JADE    Dashboard  Graph  Tools  Tasks  Sessions  Chat  Traces   |
|                                   Search  Costs  Analytics  Actions|
+------------------------------------------------------------------+
|                                                                  |
|  Live Agent Actions                                              |
|                                                                  |
|  +------------------------------------------------------------+ |
|  | Time     | Action              | Tokens | Cost    | Session | |
|  |----------|---------------------|--------|---------|---------|  |
|  | 10:42:03 | record_decision     |  1,240 | $0.012  | ses-003 | |
|  | 10:41:58 | search_nodes        |    820 | $0.008  | ses-003 | |
|  | 10:41:51 | llm-generate        |  2,100 | $0.021  | ses-003 | |
|  | 10:40:12 | recall_context      |    640 | $0.006  | ses-003 | |
|  | 10:39:45 | create_entities     |    980 | $0.010  | ses-003 | |
|  +------------------------------------------------------------+ |
|                                                                  |
|  ROTS (Return on Token Spend)                                    |
|  +------------------------------------------------------------+ |
|  |                                                             | |
|  | Entities created per $1:     142                            | |
|  | Decisions recorded per $1:    38                            | |
|  | Sessions completed per $1:    12                            | |
|  |                                                             | |
|  | Total spend today:       $1.24                              | |
|  | Total spend this week:   $8.71                              | |
|  |                                                             | |
|  +------------------------------------------------------------+ |
|                                                                  |
|  ACTIVE SESSIONS                                                 |
|  +------------------------------------------------------------+ |
|  | ses-003  | Memory arch  | 42m TTL | 12 actions | $0.057    | |
|  +------------------------------------------------------------+ |
|                                                                  |
+------------------------------------------------------------------+

Live action feed (most recent first). ROTS metrics panel.
Active sessions with running cost totals.
Data from Agent SDK action recorder + token/cost metadata.

---

WORKERS  /workers

Unlocked by: Knowledge workers (11 worker configs + plugin system)

+------------------------------------------------------------------+
| JADE    Dashboard  Graph  Tools  Tasks  Sessions  Chat  Traces   |
|                              Search  Costs  Analytics  Workers   |
+------------------------------------------------------------------+
|                                                                  |
|  Knowledge Workers                                  11 available |
|                                                                  |
|  [ Search workers...       ]                                     |
|                                                                  |
|  +---------------------+  +----------------------------------+  |
|  | WORKERS              |  | DETAIL                          |  |
|  |                      |  |                                  |  |
|  | > Productivity       |  | Productivity                    |  |
|  |   Sales              |  |                                  |  |
|  |   Customer Support   |  | Memory, dashboard sync,         |  |
|  |   Product Mgmt       |  | workplace shorthand             |  |
|  |   Marketing          |  |                                  |  |
|  |   Legal              |  | Connectors:                     |  |
|  |   Finance            |  | Slack, Notion, Asana, Linear,   |  |
|  |   Data               |  | Jira, Monday, ClickUp,          |  |
|  |   Enterprise Search  |  | Microsoft 365                   |  |
|  |   Bio Research       |  |                                  |  |
|  |   Plugin Mgmt        |  | Dev Team (6 agents):            |  |
|  |                      |  | VP Product, VP Engineering,     |  |
|  |                      |  | Frontend, Middleware, Backend,  |  |
|  |                      |  | QA                              |  |
|  |                      |  |                                  |  |
|  |                      |  | Status: not deployed            |  |
|  |                      |  | [ Deploy ]                      |  |
|  +---------------------+  +----------------------------------+  |
|                                                                  |
+------------------------------------------------------------------+

Two-panel like /graph. Click worker left -> detail right.
Shows: description, connectors list, 6-agent dev team, deploy status.
Data from worker config YAML files + plugin registry.

---

PAGE SUMMARY

| Route        | Purpose                | Data Source                       | Blocked By         |
|--------------|------------------------|-----------------------------------|---------------------|
| /            | Landing                | Static                            | —                   |
| /dashboard   | Service health         | GET /api/health                   | —                   |
| /graph       | Knowledge graph        | GET /api/graph                    | Drizzle migrations  |
| /tools       | MCP tool reference     | getJadeToolDefinitions()          | —                   |
| /tasks       | Task planning + review | POST /api/plan, POST /api/review  | —                   |
| /sessions    | Session browser        | GET /api/sessions                 | Upstash route       |
| /chat        | Agent conversation     | POST /api/chat (streaming)        | AI SDK route        |
| /traces      | Trace viewer           | Langfuse API                      | Langfuse route      |
| /search      | Semantic search        | POST /api/search                  | Embedding pipeline  |
| /costs       | Pricing + spend        | PRICING + calculateCost()         | —                   |
| /analytics   | Charts + metrics       | CubeClient.query()                | Cube.js setup       |
| /actions     | Live agent feed + ROTS | Agent SDK recorder                | Agent SDK wrapper   |
| /workers     | Worker catalog         | Worker YAML configs               | Worker configs      |
| /docs/*      | Documentation          | MDX via fumadocs                  | —                   |

---
Generated from 15 wireframe files.
