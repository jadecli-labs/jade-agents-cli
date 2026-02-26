# Jade Web App — Wireframes

PR #7: feat(web): Jade Vercel web app

## Nav

```
+------------------------------------------------------------------+
| JADE    Dashboard  Graph  Tools  Tasks  Sessions  Chat  Traces   |
|                                                  Search  Costs   |
+------------------------------------------------------------------+
```

Fumadocs keeps its own nav for `/docs/*`. Everything else uses this bar.

---

## 1. Landing  `/`

```
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
```

---

## 2. Dashboard  `/dashboard`

```
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
```

---

## 3. Graph  `/graph`

```
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
```

Click entity left -> detail right. Type badges filter. Relations are clickable.

---

## 4. Tools  `/tools`

```
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
```

Static page. Data from `getJadeToolDefinitions()`. Grouped by server.

---

## 5. Tasks  `/tasks`

```
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
```

Input a task description -> get a plan with steps, token estimates, cost.
Review panel shows verdict + findings with severity.

---

## 6. Sessions  `/sessions`

```
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
```

Click row -> expand detail. Shows TTL countdown, promotion status, active threads,
working memory namespaces.

---

## 7. Chat  `/chat`

```
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
```

Streaming via Vercel AI SDK `useChat`. Tool calls inline as collapsible cards.

---

## 8. Traces  `/traces`

```
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
```

Click row -> expand trace timeline. Links to entities in `/graph`.

---

## 9. Search  `/search`

```
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
```

Natural language query -> embedding -> cosine similarity against cold memory.
Results show entity name, type badge, similarity score, first observation.

---

## 10. Costs  `/costs`

```
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
```

Static pricing table from `PRICING` in `ts/task/cost.ts`.
Session costs computed via `calculateCost()` + `formatUsageSummary()`.

---

## Page Summary

| Route | Purpose | Data Source |
|-------|---------|-------------|
| `/` | Landing | Static |
| `/dashboard` | Service health | `GET /api/health` |
| `/graph` | Knowledge graph | `GET /api/graph` |
| `/tools` | MCP tool reference | `getJadeToolDefinitions()` |
| `/tasks` | Task planning + review | `POST /api/plan`, `POST /api/review` |
| `/sessions` | Session browser | `GET /api/sessions` |
| `/chat` | Agent conversation | `POST /api/chat` (streaming) |
| `/traces` | Trace viewer | Langfuse API |
| `/search` | Semantic search | `POST /api/search` |
| `/costs` | Pricing + spend | `PRICING` + `calculateCost()` |
| `/docs/*` | Documentation | MDX via fumadocs |
