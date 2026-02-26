# jadecli-labs / jade-agents-cli

Bilateral learning partnership AI agent. Dual Python + TypeScript codebase with a knowledge graph, MCP tools, session memory, task planning, cost tracking, observability, and edge workers. 288 tests across both languages. No browser UI yet — that's what the open PR is for.

**Repo**: https://github.com/jadecli-labs/jade-agents-cli

---

## Repository at a Glance

### L1 — Top-level layout

```
.
├── api/           # Vercel serverless endpoints (being migrated to web/)
├── artifacts/     # Architecture docs and design decisions
├── journal/       # Bilateral learning session journals
├── meta/          # How-we-journal guide
├── prompts/       # Session prompt logs
├── scripts/       # Sync utilities
├── src/           # Python source (jade package)
├── templates/     # Decision entry markdown template
├── tests/         # Python test suite (140 tests)
├── ts/            # TypeScript source (mirrors src/jade/)
├── web/           # Next.js 15 app (fumadocs + future pages)
├── worker/        # Cloudflare Workers edge MCP server
├── CLAUDE.md      # AI assistant instructions
├── Makefile       # make test, make lint, make install
├── vercel.json    # Vercel deployment config (needs fix)
├── wrangler.toml  # Cloudflare Workers config
├── Dockerfile     # Container build
└── docker-compose.yml
```

### L2 — Module structure

```
src/jade/                    # Python implementation
├── agent/                   # JadeAgent wrapping Anthropic client
├── mcp/                     # Memory server (9 tools) + Jade server (4 tools)
├── memory/                  # Hot (Redis), Cold (pgvector), Promotion
├── observability/           # Langfuse + MLflow tracing
├── semantic/                # Cube.js analytics client
├── task/                    # Planner, reviewer, cost calculator, spec types
└── settings.py              # Fail-fast config validation

ts/                          # TypeScript mirror
├── agent/                   # JadeAgent + 13 MCP tool definitions
├── ai/                      # AI SDK chat + Anthropic provider
├── db/                      # Neon + Drizzle ORM (entities, relations, sessions)
├── mcp/                     # MCP client, entity types, server implementations
├── memory/                  # Hot, Cold, Upstash, Embedding pipeline, Promotion
├── observability/           # Langfuse tracing
├── semantic/                # Cube.js client
├── task/                    # Spec types, cost calculator, reviewer, prompts
└── tests/                   # 148 TypeScript tests (bun test)

web/                         # Next.js 15 app
├── app/                     # Pages + API routes
├── content/docs/            # MDX documentation (fumadocs)
├── wireframes/              # 13 ASCII page wireframes + build script
└── lib/                     # fumadocs source loader
```

### L3 — Source modules with files

```
src/jade/
├── agent/
│   └── jade_agent.py          # Agent wrapping Anthropic with MCP tool routing
├── mcp/
│   ├── entities.py            # Entity/Relation types, JADE_ENTITY_TYPES, validation
│   ├── jade_server.py         # 4 high-level tools (record_decision, recall_context, ...)
│   └── memory_server.py       # 9 CRUD tools (create_entities, search_nodes, ...)
├── memory/
│   ├── cold.py                # pgvector-backed cold storage with semantic search
│   ├── embeddings.py          # Vector embedding generation (fake for testing)
│   ├── hot.py                 # Redis/FakeRedis session memory with TTL
│   └── promotion.py           # Hot→Cold promotion pipeline
├── observability/
│   ├── langfuse_tracing.py    # Langfuse production tracing
│   └── tracing.py             # MLflow legacy/testing tracing
├── semantic/
│   └── cube_client.py         # Cube.js analytics queries
└── task/
    ├── cost.py                # Anthropic pricing + token cost calculator
    ├── planner.py             # AI task planner (generates TaskPlan)
    ├── prompt.py              # System/user prompt templates
    └── spec.py                # TaskPlan, TaskStep, TaskReview types

ts/
├── agent/
│   ├── jade-agent.ts          # Agent wrapping Anthropic with tool routing
│   └── tools.ts               # 13 MCP tool definitions with JSON schemas
├── ai/
│   ├── chat.ts                # jadeStreamText() + jadeGenerateText() wrappers
│   └── provider.ts            # createJadeProvider() Anthropic factory
├── db/
│   ├── client.ts              # Neon serverless + Drizzle client factory
│   └── schema.ts              # entities, relations, sessions tables + pgvector type
├── mcp/
│   ├── client.ts              # MCP client connection manager
│   ├── entities.ts            # JADE_ENTITY_TYPES, JADE_RELATION_TYPES, factories
│   ├── jade-server.ts         # 4 Jade-specific tool implementations
│   └── memory-server.ts       # 9 memory CRUD tool implementations
├── memory/
│   ├── cold.ts                # pgvector cold storage with cosine similarity search
│   ├── embedding-pipeline.ts  # Vector embedding (deterministic fake for testing)
│   ├── hot.ts                 # In-memory hot session store
│   ├── promotion.ts           # Hot→Cold promotion with embedding
│   └── upstash-hot.ts         # Upstash Redis REST client (edge-compatible)
├── observability/
│   ├── langfuse-tracing.ts    # Langfuse trace/span/generation recording
│   └── tracing.ts             # Base tracing interface
├── semantic/
│   └── cube-client.ts         # Cube.js analytics client
└── task/
    ├── cost.ts                # PRICING, calculateCost(), formatCost()
    ├── prompt.ts              # Prompt templates for planner
    ├── reviewer.ts            # AI code review with findings + verdicts
    └── spec.ts                # TaskPlan, TaskStep, TaskReview, TokenUsage types
```

### L4 — Tests mirror source 1:1

```
tests/                         # Python (pytest, 140 tests)
├── agent/
│   └── test_jade_agent.py
├── mcp/
│   ├── test_entities.py
│   ├── test_jade_server.py
│   └── test_memory_server.py
├── memory/
│   ├── test_cold.py
│   ├── test_embeddings.py
│   ├── test_hot.py
│   └── test_promotion.py
├── observability/
│   └── test_tracing.py
├── semantic/
│   └── test_cube_client.py
└── task/
    ├── test_cost.py
    ├── test_planner.py
    ├── test_prompt.py
    └── test_spec.py

ts/tests/                      # TypeScript (bun test, 148 tests)
├── agent/
│   ├── jade-agent.test.ts
│   └── tools.test.ts
├── ai/
│   ├── chat.test.ts
│   └── provider.test.ts
├── mcp/
│   ├── client.test.ts
│   ├── entities.test.ts
│   ├── jade-server.test.ts
│   └── memory-server.test.ts
├── memory/
│   ├── cold.test.ts
│   ├── embedding-pipeline.test.ts
│   ├── hot.test.ts
│   └── promotion.test.ts
├── observability/
│   └── tracing.test.ts
├── semantic/
│   └── cube-client.test.ts
└── task/
    ├── cost.test.ts
    ├── prompt.test.ts
    ├── reviewer.test.ts
    └── spec.test.ts
```

### L5 — Web app and infrastructure

```
web/
├── app/
│   ├── api/
│   │   └── health/
│   │       └── route.ts       # GET /api/health — service connectivity check
│   ├── docs/
│   │   ├── [[...slug]]/
│   │   │   └── page.tsx       # Dynamic docs pages (fumadocs)
│   │   └── layout.tsx         # Docs layout with sidebar
│   ├── globals.css            # Tailwind v4 styles
│   ├── layout.tsx             # Root layout (fumadocs provider)
│   └── page.tsx               # Landing page
├── content/docs/
│   ├── index.mdx              # Docs home
│   ├── jade.mdx               # Jade agent overview
│   ├── review.mdx             # Code review walkthrough
│   └── task-spec.mdx          # Task specification docs
├── wireframes/
│   ├── 00-nav.txt through 13-workers.txt  # 13 page wireframes
│   ├── 99-summary.txt         # Route table with data sources
│   └── build.sh               # Regenerate WIREFRAMES.md
├── lib/
│   └── source.ts              # fumadocs source loader
├── package.json               # Next.js 15, React 19, fumadocs, Tailwind v4
└── tsconfig.json              # Bundler module resolution

worker/
└── index.ts                   # Cloudflare Workers edge MCP server

api/                           # Legacy Vercel serverless (to be deleted)
├── graph.ts                   # GET /api/graph — knowledge graph from Neon
└── health.ts                  # GET /api/health — duplicate of web/app/api/health
```

---

## Features as Web App Pages

Each feature below is something the system already does, described as a page a user would interact with in a browser.

### Knowledge Graph Explorer (`/graph`)
Browse every entity Jade has ever recorded — people, decisions, concepts, tools, sessions, goals. Filter by type. Click an entity to see its observations and how it connects to other entities through relations. This is the accumulated memory of all agent sessions, stored in Neon pgvector. The data is already there in the `entities` and `relations` tables — it just needs a UI.

### Service Health Dashboard (`/dashboard`)
Four cards showing whether Neon, Upstash, Langfuse, and Anthropic are connected. Green dot or red dot. Plus response times for the API endpoints. The health check endpoint already exists (`web/app/api/health/route.ts`) — this page just calls it and renders the results.

### MCP Tool Reference (`/tools`)
A catalog of all 13 MCP tools grouped by server. Memory Server has 9 (create_entities, create_relations, add_observations, delete_entities, delete_observations, delete_relations, read_graph, search_nodes, open_nodes). Jade Server has 4 (record_decision, recall_context, update_hot_memory, log_insight). Each shows its description and input parameters. No API call needed — the tool definitions live in `ts/agent/tools.ts` and can be imported at build time.

### Agent Chat (`/chat`)
Talk to Jade through the browser. Streaming responses word-by-word using the Vercel AI SDK. When Jade calls a tool (like searching the knowledge graph or recording a decision), the tool call shows as a collapsible card inline in the conversation — tool name, JSON input, result summary. Backed by `ts/ai/chat.ts` which wraps the Anthropic streaming API.

### Session Browser (`/sessions`)
Every time you run Jade from the CLI, it creates a session with working memory in Redis and a summary in Neon. This page shows the table — session ID, summary, how many minutes of TTL remain before Redis expires it, whether it's been promoted to cold storage. Click to expand and see active threads and working memory namespaces.

### Task Planner (`/tasks`)
Describe what you want to build in plain text, pick a model tier (Opus, Sonnet, or Haiku), and get back a structured plan: title, type (feat/fix/refactor), priority, individual steps with token estimates, total estimated cost, and a suggested commit message. Then a review panel with a verdict (approve/revise/reject) and findings tagged by severity. All the types and cost logic exist in `ts/task/spec.ts` and `ts/task/cost.ts`.

### Trace Viewer (`/traces`)
Langfuse records every tool call and LLM generation as spans in a trace. This page shows a table of sessions, and when you expand one, a waterfall timeline: horizontal bars proportional to duration for each search_nodes, record_decision, or LLM generation call. Token breakdown per session. Links back to entities in the graph.

### Semantic Search (`/search`)
Type a natural language question like "How did we decide on the memory architecture?" and get back ranked entities from pgvector by cosine similarity. Each result shows the entity name, type, similarity score, and first observation. Click to jump to that entity in the graph explorer. Backed by `ts/memory/embedding-pipeline.ts` and `ts/memory/cold.ts`.

### API Cost Tracker (`/costs`)
Static pricing table for Anthropic models (Opus: $15/$75 per 1M input/output, Sonnet: $3/$15, Haiku: $1/$5) plus per-session cost breakdown. Shows how many tokens each session consumed and what it cost. Uses `PRICING` and `calculateCost()` from `ts/task/cost.ts`.

### Documentation (`/docs`)
Already built and working. MDX pages rendered by fumadocs covering the Jade agent overview, code review walkthrough, and task specification format. This is the only page that currently deploys.

---

## Open Pull Requests

### PR #7 — feat(web): Jade Vercel web app — unified deployment + interactive features
https://github.com/jadecli-labs/jade-agents-cli/pull/7

**Branch**: `feat/vercel-web-app`

**What it has now**: 13 ASCII wireframes for every page above, a wireframe build script, MCP server `__main__` bug fixes, and the PRD.

**What it would unlock if merged (after implementation)**:

- **Unified Vercel deployment** — One Next.js app instead of a disconnected serverless deployment that builds the entire codebase to serve 2 JSON endpoints. Deletes root `api/` folder, moves endpoints into Next.js route handlers. Stops burning Vercel build minutes on every push.

- **10 interactive pages** — Landing, Dashboard, Graph, Tools, Tasks, Sessions, Chat, Traces, Search, Costs. Gives browser access to the entire agent system. No more CLI-only workflow for inspecting the knowledge graph, checking service health, or reviewing session costs.

- **Streaming chat in the browser** — `useChat` from `@ai-sdk/react` connected to `jadeStreamText()`. Users can talk to Jade without installing the CLI, with tool calls rendered inline as collapsible cards.

- **Semantic search UI** — Natural language queries against pgvector embeddings. Currently only accessible through the `search_nodes` MCP tool in the CLI.

- **Session visibility** — See which sessions are still hot in Redis (with TTL countdown), which have been promoted to cold storage, and what working memory each contains. Currently invisible unless you query Upstash and Neon directly.

- **Cost transparency** — Per-session token costs visible at a glance instead of computing them manually from Anthropic usage logs.

- **Trace timelines** — Langfuse span waterfalls viewable in the browser instead of logging into the Langfuse dashboard separately.

**3 pages deferred to future PRs** (blocked on prerequisites):
- `/analytics` — needs Cube.js infrastructure
- `/actions` — needs Agent SDK wrapper
- `/workers` — needs knowledge worker YAML configs

---

## How to Run

```bash
make install        # uv sync + bun install
make test           # 140 Python + 148 TypeScript tests
make lint           # ruff check + tsc --noEmit
cd web && bun dev   # Next.js dev server (currently docs only)
```
