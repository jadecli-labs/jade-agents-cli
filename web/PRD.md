# PR #7 — Jade Vercel Web App Implementation Plan

## Context

PR #1 (151 files, Weeks 1-5 TDD full-stack) merged into main. PR #7 is open on `feat/vercel-web-app` with 13 page wireframes, a build script, and MCP server fixes. The repo has two disconnected Vercel deployments: root `api/` serverless functions (`framework: null`) and `web/` Next.js 15 + fumadocs (not deployed). Vercel GitHub App auto-deploys root on every push, burning minutes for 2 JSON endpoints. The goal is to unify into a single Next.js deployment and build the pages described in the wireframes.

## Problem Statement

The Vercel deployment is misconfigured — root deploys 2 API endpoints while the actual Next.js app in `web/` isn't deployed at all. There's no interactive frontend for the agent system built in PR #1. Users can't explore the knowledge graph, chat with Jade, view traces, or monitor service health through a browser. All the TypeScript modules (`ts/ai/`, `ts/mcp/`, `ts/task/`, `ts/memory/`, `ts/db/`) exist but have no web-facing UI.

## Success Metrics

- `web/` deploys as a single Vercel Next.js app
- Root `api/` directory deleted, endpoints migrated to Next.js route handlers
- 6 pages buildable immediately (no external service dependencies)
- `make test` still passes (288 tests)
- Vercel preview builds succeed on PR pushes

## Existing Code to Reuse

| File | Exports | Used By |
|------|---------|---------|
| `ts/db/client.ts` | `createDbClient()` | `/api/graph` route |
| `ts/db/schema.ts` | `entities`, `relations`, `sessions` tables | `/api/graph`, `/api/sessions` routes |
| `ts/agent/tools.ts` | `getJadeToolDefinitions()` — 13 tools with JSON schemas | `/tools` page |
| `ts/task/spec.ts` | `TaskPlan`, `TaskStep`, `TaskReview`, `ReviewFinding` types | `/tasks` page |
| `ts/task/cost.ts` | `PRICING`, `calculateCost()`, `formatCost()`, `formatUsageSummary()` | `/costs` page |
| `ts/ai/chat.ts` | `jadeStreamText()`, `jadeGenerateText()` | `/api/chat` route |
| `ts/ai/provider.ts` | `createJadeProvider()` | `/api/chat` route |
| `ts/mcp/entities.ts` | `JADE_ENTITY_TYPES`, `JADE_RELATION_TYPES` | `/graph` page filters |
| `ts/memory/upstash-hot.ts` | `UpstashHotMemoryClient` | `/api/sessions` route |
| `ts/observability/langfuse-tracing.ts` | `LangfuseTracing` | `/api/traces` route |
| `web/app/api/health/route.ts` | `GET /api/health` | Already exists in web/ |
| `web/lib/source.ts` | fumadocs source loader | `/docs/*` pages (done) |

## Repository Structure (after this PR)

```
web/
├── app/
│   ├── layout.tsx              # Root layout + NavBar (modify existing)
│   ├── page.tsx                # Landing page (modify existing)
│   ├── dashboard/page.tsx      # NEW — service health
│   ├── graph/page.tsx          # NEW — knowledge graph explorer
│   ├── tools/page.tsx          # NEW — MCP tool reference
│   ├── tasks/page.tsx          # NEW — task planner + review
│   ├── sessions/page.tsx       # NEW — session browser
│   ├── chat/page.tsx           # NEW — streaming agent chat
│   ├── traces/page.tsx         # NEW — Langfuse trace viewer
│   ├── search/page.tsx         # NEW — semantic search
│   ├── costs/page.tsx          # NEW — pricing + spend
│   ├── docs/                   # EXISTING — fumadocs (unchanged)
│   └── api/
│       ├── health/route.ts     # EXISTING — keep as-is
│       ├── graph/route.ts      # NEW — migrated from root api/graph.ts
│       ├── chat/route.ts       # NEW — streaming chat via AI SDK
│       ├── sessions/route.ts   # NEW — session list from Neon + Upstash
│       ├── search/route.ts     # NEW — semantic search via embeddings
│       └── costs/route.ts      # NEW — aggregate token costs
├── components/
│   ├── nav-bar.tsx             # NEW — shared nav
│   ├── status-dot.tsx          # NEW — green/red indicator
│   ├── entity-badge.tsx        # NEW — colored entity type badge
│   ├── tool-call-card.tsx      # NEW — collapsible MCP tool call
│   └── relation-link.tsx       # NEW — clickable relation arrow
├── wireframes/                 # EXISTING — ASCII wireframes + build.sh
├── content/docs/               # EXISTING — MDX docs (unchanged)
├── lib/source.ts               # EXISTING
└── package.json                # MODIFY — add ai, @ai-sdk/anthropic, @ai-sdk/react
```

## Dependency Chain

### Foundation (Phase 0) — no dependencies
- **NavBar component**: shared across all pages
- **StatusDot component**: used by dashboard
- **EntityBadge component**: used by graph, search
- **Vercel config**: point deployment to `web/`, delete root `api/`

### Static Pages (Phase 1) — depends on Phase 0
- **Landing page update**: depends on NavBar
- **Tools page**: depends on NavBar, imports `getJadeToolDefinitions()` from `ts/agent/tools.ts`
- **Costs page**: depends on NavBar, imports `PRICING` from `ts/task/cost.ts`

### API Migration (Phase 2) — depends on Phase 0
- **Graph route**: migrate `api/graph.ts` → `web/app/api/graph/route.ts`, imports `ts/db/`
- **Delete root api/**: after migration verified
- **Update vercel.json**: remove `framework: null`, point to `web/`

### Data Pages (Phase 3) — depends on Phase 1 + Phase 2
- **Dashboard page**: depends on NavBar, StatusDot, calls `GET /api/health`
- **Graph page**: depends on NavBar, EntityBadge, RelationLink, calls `GET /api/graph`

### New API Routes (Phase 4) — depends on Phase 2
- **Sessions route**: imports `ts/db/schema.ts` sessions table + `ts/memory/upstash-hot.ts`
- **Search route**: imports `ts/memory/embedding-pipeline.ts` + `ts/memory/cold.ts`
- **Chat route**: imports `ts/ai/chat.ts` `jadeStreamText` + `ts/ai/provider.ts`
- **Costs route**: imports `ts/task/cost.ts` + session token data

### Interactive Pages (Phase 5) — depends on Phase 3 + Phase 4
- **Sessions page**: depends on NavBar, calls `GET /api/sessions`
- **Search page**: depends on NavBar, EntityBadge, calls `POST /api/search`
- **Tasks page**: depends on NavBar, calls `POST /api/plan` + `POST /api/review`
- **Chat page**: depends on NavBar, ToolCallCard, uses `useChat` from `@ai-sdk/react`
- **Traces page**: depends on NavBar, calls Langfuse API

## Development Phases

### Phase 0: Foundation — Shared Components + Deployment Config
**Goal**: NavBar, shared components, and Vercel deployment pointing to `web/`

**Tasks**:
- [ ] Create `web/components/nav-bar.tsx` — links to all routes, active state
- [ ] Create `web/components/status-dot.tsx` — green/red circle
- [ ] Create `web/components/entity-badge.tsx` — colored by entity type
- [ ] Create `web/components/tool-call-card.tsx` — collapsible tool invocation
- [ ] Create `web/components/relation-link.tsx` — clickable relation
- [ ] Update `web/app/layout.tsx` — add NavBar to non-docs pages
- [ ] Add `ai`, `@ai-sdk/anthropic`, `@ai-sdk/react` to `web/package.json`
- [ ] Update `web/tsconfig.json` path aliases to import from `../ts/`

**Exit**: `cd web && bun run build` passes, components render

### Phase 1: Static Pages (no API calls needed)
**Goal**: 3 pages that render from imported TS modules, no network requests

**Tasks**:
- [ ] Update `web/app/page.tsx` — add NavBar, update CTAs per wireframe `01-landing.txt`
- [ ] Create `web/app/tools/page.tsx` — import `getJadeToolDefinitions()`, render per `04-tools.txt`
- [ ] Create `web/app/costs/page.tsx` — import `PRICING`, render per `10-costs.txt`

**Exit**: All 3 pages render at `/`, `/tools`, `/costs` in `bun dev`

### Phase 2: API Migration
**Goal**: Move root API endpoints into Next.js route handlers, kill root `api/`

**Tasks**:
- [ ] Create `web/app/api/graph/route.ts` — port from `api/graph.ts`, use Next.js `NextRequest`/`NextResponse`
- [ ] Verify `web/app/api/health/route.ts` already exists and works
- [ ] Update or remove root `vercel.json` (Next.js handles routing)
- [ ] Delete `api/health.ts` and `api/graph.ts`
- [ ] Update CLAUDE.md to reflect new API locations

**Exit**: `GET /api/health` and `GET /api/graph` work from `web/` dev server

### Phase 3: Data Pages (read from existing APIs)
**Goal**: Dashboard and graph pages that call the migrated API routes

**Tasks**:
- [ ] Create `web/app/dashboard/page.tsx` — fetch `/api/health`, render per `02-dashboard.txt`
- [ ] Create `web/app/graph/page.tsx` — fetch `/api/graph`, render per `03-graph.txt`
  - Entity list panel (left) with type filter using `JADE_ENTITY_TYPES`
  - Detail panel (right) with observations + relations
  - Search filter narrows by name/observation text

**Exit**: `/dashboard` shows live service status, `/graph` shows entities from Neon

### Phase 4: New API Routes
**Goal**: Backend routes for sessions, search, chat, costs

**Tasks**:
- [ ] Create `web/app/api/sessions/route.ts` — query `sessions` table from `ts/db/schema.ts`
- [ ] Create `web/app/api/search/route.ts` — embed query via `EmbeddingPipeline`, search via `ColdMemoryClient.semanticSearch()`
- [ ] Create `web/app/api/chat/route.ts` — `jadeStreamText()` with MCP tools, return streaming response
- [ ] Create `web/app/api/costs/route.ts` — aggregate token usage, apply `calculateCost()`

**Exit**: All 4 routes return correct JSON/stream responses

### Phase 5: Interactive Pages
**Goal**: Pages that use the new Phase 4 API routes

**Tasks**:
- [ ] Create `web/app/sessions/page.tsx` — session table + expandable detail per `06-sessions.txt`
- [ ] Create `web/app/search/page.tsx` — search input + ranked results per `09-search.txt`
- [ ] Create `web/app/tasks/page.tsx` — planner input + plan card + review panel per `05-tasks.txt`
- [ ] Create `web/app/chat/page.tsx` — `useChat` hook + tool call cards per `07-chat.txt`
- [ ] Create `web/app/traces/page.tsx` — session table + trace timeline per `08-traces.txt`

**Exit**: All 10 core pages render and function

## Files to Modify

| Action | File | Notes |
|--------|------|-------|
| Modify | `web/app/layout.tsx` | Add NavBar for non-docs routes |
| Modify | `web/app/page.tsx` | Update landing per wireframe |
| Modify | `web/package.json` | Add AI SDK deps |
| Modify | `web/tsconfig.json` | Path alias for `../ts/` imports |
| Delete | `api/health.ts` | Migrated to `web/app/api/health/route.ts` |
| Delete | `api/graph.ts` | Migrated to `web/app/api/graph/route.ts` |
| Modify | `vercel.json` | Remove or simplify for Next.js |
| Modify | `CLAUDE.md` | Update API section |
| Create | 5 components in `web/components/` | NavBar, StatusDot, EntityBadge, ToolCallCard, RelationLink |
| Create | 4 API routes in `web/app/api/` | graph, sessions, search, chat, costs |
| Create | 10 pages in `web/app/` | dashboard, graph, tools, tasks, sessions, chat, traces, search, costs |

## Verification

After each phase:
1. `cd web && bun run build` — no type errors
2. `cd web && bun dev` — pages render at expected routes
3. `make test` from root — all 288 tests still pass (no TS source changes)
4. Vercel preview deploys successfully

End-to-end after Phase 5:
- `/api/health` returns service status JSON
- `/api/graph` returns entities + relations from Neon
- `/dashboard` shows 4 service cards with green/red dots
- `/graph` shows entity list, click to see detail
- `/tools` shows 13 MCP tools grouped by server
- `/chat` streams responses with inline tool call cards
- `/costs` shows pricing table + session cost breakdown

## Out of Scope (future PRs)

These 3 wireframes (`11-analytics.txt`, `12-agent-actions.txt`, `13-workers.txt`) are blocked by work not in this PR:
- `/analytics` — needs Cube.js setup
- `/actions` — needs Agent SDK wrapper
- `/workers` — needs knowledge worker configs
