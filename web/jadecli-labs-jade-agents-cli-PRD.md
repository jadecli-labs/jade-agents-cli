# Jade Web App — What We're Building and Why

**Repo**: jadecli-labs/jade-agents-cli
**Branch**: feat/vercel-web-app (PR #7)

## The Problem

Jade is a CLI-based AI agent with a knowledge graph, session memory, 13 MCP tools, cost tracking, and observability — but no browser UI. Everything lives in terminal commands and TypeScript/Python modules. Meanwhile, Vercel is misconfigured: it auto-deploys two bare JSON endpoints from the root `api/` folder on every push, while the actual Next.js app sitting in `web/` never gets deployed. We're paying for builds that serve nothing useful.

## What We're Doing

Unifying everything into one Next.js 15 app deployed from `web/`. Delete the root `api/` folder. Build 10 interactive pages that give browser access to the agent system built in PR #1.

## The 10 Pages

1. **Landing** (`/`) — Hero, stats, links to everything else
2. **Dashboard** (`/dashboard`) — Are Neon, Upstash, Langfuse, and Anthropic connected? Green dot or red dot per service
3. **Graph** (`/graph`) — Browse the knowledge graph. Left panel lists entities, right panel shows observations and relations. Filter by type (Person, Decision, Concept, Tool, Session, Goal)
4. **Tools** (`/tools`) — Reference page for all 13 MCP tools. Name, description, parameters. Grouped by server (Memory: 9, Jade: 4). No API calls — reads from `getJadeToolDefinitions()` at build time
5. **Tasks** (`/tasks`) — Describe what you want to build, pick a model tier, get a structured plan with token estimates and cost. Then a review with verdict and findings
6. **Sessions** (`/sessions`) — Table of agent sessions. Shows TTL countdown from Redis, whether it's been promoted to cold storage, active threads, working memory
7. **Chat** (`/chat`) — Talk to Jade in the browser. Streaming responses. When Jade calls a tool, it shows as a collapsible card inline
8. **Traces** (`/traces`) — Langfuse trace timelines. Click a session, see a waterfall of tool calls and LLM generations with durations
9. **Search** (`/search`) — Type a natural language question, get ranked entities by cosine similarity from pgvector
10. **Costs** (`/costs`) — Anthropic pricing table (Opus/Sonnet/Haiku) plus per-session token cost breakdown

## How It Connects to Existing Code

No new backend logic. The pages import directly from the TypeScript modules already built and tested:

- `ts/db/` — Neon database client and Drizzle schema (entities, relations, sessions tables)
- `ts/ai/` — Anthropic streaming via AI SDK (`jadeStreamText`, `createJadeProvider`)
- `ts/agent/tools.ts` — All 13 tool definitions with JSON schemas
- `ts/task/` — Task planning types, token cost calculator, pricing constants
- `ts/mcp/entities.ts` — Entity and relation type enums
- `ts/memory/` — Upstash hot memory client, pgvector cold memory, embedding pipeline
- `ts/observability/` — Langfuse tracing client

A `@ts/*` path alias in `tsconfig.json` points Next.js at `../ts/` so imports just work.

## Build Order

The phases exist because of real dependencies, not ceremony:

**Phase 0 — Foundation**: NavBar component, 4 small UI components (StatusDot, EntityBadge, ToolCallCard, RelationLink), install AI SDK packages, set up the path alias. Everything else needs these.

**Phase 1 — Static pages**: Landing, Tools, Costs. These render from imported modules with zero API calls. They prove the path alias and component system work.

**Phase 2 — API migration**: Port `api/graph.ts` into `web/app/api/graph/route.ts` as a Next.js route handler. Delete the root `api/` folder. Fix `vercel.json` so Vercel deploys `web/` as Next.js instead of raw serverless functions.

**Phase 3 — Data pages**: Dashboard and Graph pages. They need the NavBar from Phase 0, the components from Phase 0, and the API routes from Phase 2.

**Phase 4 — New API routes**: Sessions, Search, Chat, Costs endpoints. These import from `ts/` modules and expose them as HTTP.

**Phase 5 — Interactive pages**: Sessions, Search, Tasks, Chat, Traces. They need both the API routes from Phase 4 and the components from earlier phases. Chat uses `useChat` from `@ai-sdk/react` for streaming.

## What's Not Included

Three wireframes are parked for future PRs because they need infrastructure that doesn't exist yet:
- `/analytics` — needs Cube.js
- `/actions` — needs Agent SDK wrapper
- `/workers` — needs knowledge worker configs

## Key Risks

- The `@ts/*` path alias importing from outside `web/` might need `transpilePackages` in Next.js config. If that fails, we fall back to relative imports.
- Pages that talk to Neon/Upstash/Langfuse will show empty states on preview deploys where those services aren't configured. That's fine — they degrade gracefully.
- The existing 288 tests must keep passing. This PR creates new files but doesn't modify any `ts/` source modules.

## Verification

Every phase gates on: `cd web && bun run build` (type check), `bun dev` (pages render), `make test` (288 tests pass). After Phase 2, Vercel preview builds must also succeed.
