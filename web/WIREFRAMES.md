# Jade Web App — Wireframes

Wireframes for PR #7: feat(web): Jade Vercel web app

## Navigation (shared across all pages)

```
+------------------------------------------------------------------+
| JADE                  Docs  Dashboard  Graph  Chat  Traces       |
+------------------------------------------------------------------+
```

Fumadocs nav stays for `/docs/*`. All other pages use a minimal shared nav bar.

---

## 1. Landing Page  `/`

Update existing page. Add nav links to new sections. Keep stats.

```
+------------------------------------------------------------------+
| JADE                  Docs  Dashboard  Graph  Chat  Traces       |
+------------------------------------------------------------------+
|                                                                  |
|                     Jade Agents CLI                              |
|                                                                  |
|          Bilateral learning partnership AI agent system.          |
|     Dual Python + TypeScript with MCP tools and knowledge        |
|                    graph memory.                                  |
|                                                                  |
|            [ Documentation ]    [ Chat with Jade ]               |
|                                                                  |
|   +------------+  +------------+  +----------+  +-----------+    |
|   |    288     |  |    9+4     |  |    2     |  |   live    |    |
|   |   Tests    |  | MCP Tools  |  | Languages|  |  Services |    |
|   +------------+  +------------+  +----------+  +-----------+    |
|                                                                  |
|   +---------------------------+  +---------------------------+   |
|   |  Knowledge Graph          |  |  Service Health           |   |
|   |  Explore entities,        |  |  Neon, Upstash, Langfuse, |   |
|   |  decisions, and relations |  |  Anthropic connectivity   |   |
|   |  [ Open Graph Explorer ]  |  |  [ Open Dashboard ]       |   |
|   +---------------------------+  +---------------------------+   |
|                                                                  |
+------------------------------------------------------------------+
```

---

## 2. Service Dashboard  `/dashboard`

Live health status. Calls `/api/health` on load + auto-refresh.

```
+------------------------------------------------------------------+
| JADE                  Docs  Dashboard  Graph  Chat  Traces       |
+------------------------------------------------------------------+
|                                                                  |
|  Service Health                          Last checked: 12s ago   |
|                                          [ Refresh ]             |
|                                                                  |
|  +----------------------------+  +----------------------------+  |
|  |  Neon PostgreSQL        [*]|  |  Upstash Redis          [*]|  |
|  |  Status: configured        |  |  Status: configured        |  |
|  |  Cold memory, pgvector     |  |  Hot session memory        |  |
|  +----------------------------+  +----------------------------+  |
|                                                                  |
|  +----------------------------+  +----------------------------+  |
|  |  Anthropic API          [*]|  |  Langfuse              [*]|  |
|  |  Status: configured        |  |  Status: not_configured    |  |
|  |  Claude model access       |  |  Observability tracing     |  |
|  +----------------------------+  +----------------------------+  |
|                                                                  |
|  [*] = green dot (configured) or red dot (not_configured)        |
|                                                                  |
|  +------------------------------------------------------------+  |
|  |  API Endpoints                                              |  |
|  |                                                             |  |
|  |  GET /api/health .................. 200 OK      23ms        |  |
|  |  GET /api/graph ................... 200 OK     142ms        |  |
|  +------------------------------------------------------------+  |
|                                                                  |
+------------------------------------------------------------------+
```

---

## 3. Knowledge Graph Explorer  `/graph`

Two-panel layout: entity list (filterable) + detail panel.

```
+------------------------------------------------------------------+
| JADE                  Docs  Dashboard  Graph  Chat  Traces       |
+------------------------------------------------------------------+
|                                                                  |
|  Knowledge Graph                              47 entities found  |
|                                                                  |
|  Filter: [ Search entities...          ]                         |
|  Type:   [All] [Person] [Decision] [Concept] [Tool] [Session]   |
|                                                                  |
|  +------------------------+-+------------------------------------+|
|  | ENTITIES               | |  DETAIL                           ||
|  |                        | |                                    ||
|  | * Alex            [Per]| |  Alex                              ||
|  |   Jade            [Too]| |  Type: Person                      ||
|  |   Use pgvector    [Dec]| |                                    ||
|  |   MCP Protocol    [Con]| |  Observations:                     ||
|  |   session-001     [Ses]| |  - Project lead for Jade            ||
|  |   Prompt Caching  [Dec]| |  - Prefers fail-fast patterns       ||
|  |   Redis TTL       [Con]| |  - Uses TDD workflow                ||
|  |   Claude SDK      [Too]| |                                    ||
|  |   ...                  | |  Relations:                         ||
|  |                        | |  Alex --made_decision--> Use pgvec  ||
|  |                        | |  Alex --uses_tool--> Jade            ||
|  |                        | |  Alex --uses_tool--> Claude SDK      ||
|  |                        | |  Alex --participated_in--> session   ||
|  |                        | |                                    ||
|  +------------------------+-+------------------------------------+|
|                                                                  |
+------------------------------------------------------------------+
```

**Interaction:**
- Click entity in left panel -> shows detail on right
- Type filter narrows entity list by name/observation text
- Type badges filter by entity type
- Relations are clickable (navigate to related entity)

---

## 4. Agent Chat  `/chat`

Streaming chat with Jade via Vercel AI SDK `useChat`. Tool calls shown inline.

```
+------------------------------------------------------------------+
| JADE                  Docs  Dashboard  Graph  Chat  Traces       |
+------------------------------------------------------------------+
|                                                                  |
|  Chat with Jade                                                  |
|                                                                  |
|  +------------------------------------------------------------+  |
|  |                                                            |  |
|  |  JADE  Hi! I'm Jade, your learning partner. I have        |  |
|  |        access to the knowledge graph and can record        |  |
|  |        decisions, recall context, and log insights.        |  |
|  |                                                            |  |
|  |  YOU   What decisions have we made about memory?           |  |
|  |                                                            |  |
|  |  JADE  Let me search the knowledge graph.                  |  |
|  |                                                            |  |
|  |        +------------------------------------------------+  |  |
|  |        | Tool: recall_context                           |  |  |
|  |        | Input: { "topic": "memory" }                   |  |  |
|  |        | Result: 3 entities found                       |  |  |
|  |        +------------------------------------------------+  |  |
|  |                                                            |  |
|  |        Based on the knowledge graph, here are the          |  |
|  |        memory-related decisions:                           |  |
|  |                                                            |  |
|  |        1. **Use pgvector** — Chose Neon pgvector for       |  |
|  |           cold storage over Pinecone (cost, SQL access)    |  |
|  |        2. **Redis TTL** — Session data expires after       |  |
|  |           24h to prevent stale context                     |  |
|  |                                                            |  |
|  +------------------------------------------------------------+  |
|                                                                  |
|  +------------------------------------------------------------+  |
|  | Ask Jade anything...                              [ Send ] |  |
|  +------------------------------------------------------------+  |
|                                                                  |
+------------------------------------------------------------------+
```

**Interaction:**
- Messages stream in real-time (Vercel AI SDK `useChat`)
- Tool calls appear as collapsible cards between message chunks
- Tool cards show: tool name, input params, result summary
- Chat history persists during session (client-side state)

---

## 5. Traces  `/traces`

Read-only Langfuse trace viewer. Session list + trace detail.

```
+------------------------------------------------------------------+
| JADE                  Docs  Dashboard  Graph  Chat  Traces       |
+------------------------------------------------------------------+
|                                                                  |
|  Agent Traces                                                    |
|                                                                  |
|  +------------------------------------------------------------+  |
|  | Session             | Started      | Tokens  | Latency     |  |
|  |------------------------------------------------------------|  |
|  | session-003         | 2 hours ago  |  4,230  |  3.2s       |  |
|  | session-002         | yesterday    | 12,841  |  8.7s       |  |
|  | session-001         | 2 days ago   |  8,102  |  5.1s       |  |
|  +------------------------------------------------------------+  |
|                                                                  |
|  +------------------------------------------------------------+  |
|  |  session-003  (2 hours ago)                                |  |
|  |                                                            |  |
|  |  Trace Timeline:                                           |  |
|  |                                                            |  |
|  |  [0.0s] jade-session --------------------------------      |  |
|  |    [0.1s] tool-call: search_nodes --------  (420ms)        |  |
|  |    [0.6s] tool-call: record_decision -----  (380ms)        |  |
|  |    [1.2s] tool-call: update_hot_memory ---  (210ms)        |  |
|  |    [1.5s] llm-generation -----------------  (1.7s)         |  |
|  |                                                            |  |
|  |  Token Usage:                                              |  |
|  |  Input: 2,840  |  Output: 1,390  |  Total: 4,230          |  |
|  |                                                            |  |
|  |  Entities Created:  2 (Decision, Concept)                  |  |
|  |  Relations Created: 3                                      |  |
|  +------------------------------------------------------------+  |
|                                                                  |
+------------------------------------------------------------------+
```

**Interaction:**
- Click session row to expand trace detail below
- Trace timeline shows spans as horizontal bars (proportional to duration)
- Token usage breakdown per session
- Links to entities created during the session (navigates to `/graph`)

---

## Page Summary

| Route | Purpose | Data Source | Priority |
|-------|---------|-------------|----------|
| `/` | Landing + navigation hub | Static | Phase 1 |
| `/dashboard` | Service health monitoring | `GET /api/health` | Phase 2 |
| `/graph` | Knowledge graph exploration | `GET /api/graph` | Phase 3 |
| `/chat` | Agent conversation | `POST /api/chat` (streaming) | Phase 4 |
| `/traces` | Observability viewer | Langfuse API (read-only) | Phase 5 |
| `/docs/*` | Documentation (existing) | MDX via fumadocs | Done |

## Shared Components

- `NavBar` — top nav with active page indicator
- `StatusDot` — green/red circle for configured/not_configured
- `ToolCallCard` — collapsible card showing MCP tool invocation
- `EntityBadge` — colored badge for entity types (Person=blue, Decision=amber, etc.)
- `RelationLink` — clickable relation that navigates to target entity
