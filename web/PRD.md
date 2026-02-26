# PR #7 — Jade Vercel Web App

## Problem Statement

The Jade Agents CLI system (PR #1: 151 files, dual Python + TypeScript) has a fully built backend — knowledge graph, MCP tools, session memory, observability, task planning — but zero interactive frontend. The Vercel deployment is misconfigured: root `api/` deploys 2 JSON endpoints via `@vercel/node` with `"framework": null`, while the actual Next.js 15 app in `web/` (fumadocs docs site) isn't deployed at all. Every push triggers a Vercel build that compiles the entire TypeScript codebase just to serve `GET /api/health` and `GET /api/graph`. Users cannot explore the knowledge graph, chat with Jade, view traces, browse sessions, or monitor service health through a browser.

## Target Users

**Primary: The developer-operator (Alex)**
- Runs Jade agent sessions from the CLI
- Needs a dashboard to verify cloud services are connected
- Wants to browse the knowledge graph that accumulates across sessions
- Needs to see token costs and trace timelines to optimize usage

**Secondary: Collaborators and reviewers**
- Read-only access to the knowledge graph and session history
- Use the tools page as MCP tool documentation
- Use the chat page to interact with Jade without CLI setup

## Success Metrics

- `web/` deploys as a single Vercel Next.js 15 app (one deployment, not two)
- Root `api/` directory deleted — endpoints migrated to Next.js route handlers
- 6 pages render without any external service dependencies (landing, tools, costs, dashboard shell, docs, tasks shell)
- 4 pages render with live data from Neon/Upstash/Langfuse/Anthropic
- `make test` passes (288 tests unchanged — no TS source module modifications)
- Vercel preview builds succeed on PR pushes

---

## Capability Tree

### Capability: Service Monitoring
Displays connectivity status for all cloud dependencies (Neon, Upstash, Langfuse, Anthropic) and API endpoint latency.

#### Feature: Health Check
- **Description**: Return configured/not_configured status for each cloud service
- **Inputs**: Environment variables (`NEON_DATABASE_URL`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `ANTHROPIC_API_KEY`)
- **Outputs**: JSON `{ status, timestamp, neon, upstash, langfuse, anthropic }`
- **Behavior**: Check env var presence, do not ping services. Already implemented in `web/app/api/health/route.ts`

#### Feature: Dashboard Page
- **Description**: Render 4 service cards with green/red status dots + API endpoint latency
- **Inputs**: `GET /api/health` response
- **Outputs**: Dashboard UI with auto-refresh
- **Behavior**: Fetch on mount, poll every 30s, display per-service card with StatusDot. Show endpoint response times for `/api/health` and `/api/graph`

### Capability: Knowledge Graph Exploration
Browse, filter, and search entities and relations stored in Neon pgvector.

#### Feature: Graph API Route
- **Description**: Query entities and relations from Neon, with optional type filter
- **Inputs**: Query params `?type=Decision&limit=50`
- **Outputs**: JSON `{ entities[], relations[], count: { entities, relations } }`
- **Behavior**: Drizzle select from `entities` and `relations` tables. Migrate from root `api/graph.ts` (Vercel serverless) to Next.js route handler. Drop `@vercel/node` types, use `NextRequest`/`NextResponse`

#### Feature: Graph Explorer Page
- **Description**: Two-panel entity browser — entity list (left) + detail view (right)
- **Inputs**: `GET /api/graph` response, `JADE_ENTITY_TYPES` for filter tabs
- **Outputs**: Interactive UI with type filter tabs, search, clickable entities
- **Behavior**: Left panel lists entities with EntityBadge type tags. Click entity shows observations + outbound/inbound relations in right panel. Relations are clickable RelationLink components that navigate to target entity. Search input filters by name and observation text

### Capability: MCP Tool Reference
Static documentation page for all 13 MCP tool definitions.

#### Feature: Tools Page
- **Description**: Render all tool definitions grouped by server (Memory: 9, Jade: 4)
- **Inputs**: `getJadeToolDefinitions()` from `ts/agent/tools.ts`
- **Outputs**: Static page with tool cards showing name, description, parameters
- **Behavior**: Server component. Import tool definitions at build time. Group by server prefix. Render `inputSchema.properties` as parameter table per tool

### Capability: Session Management
Browse agent sessions with hot memory TTL and cold promotion status.

#### Feature: Sessions API Route
- **Description**: List sessions from Neon `sessions` table with Upstash TTL metadata
- **Inputs**: Neon `sessions` table, Upstash `getTtl()` per session
- **Outputs**: JSON array of `{ id, summary, activeThreads, promotedAt, ttlSeconds }`
- **Behavior**: Query sessions ordered by `createdAt` desc. For each, call `UpstashHotMemoryClient.getTtl()` to get remaining TTL. Return merged data

#### Feature: Sessions Page
- **Description**: Session table with expandable detail rows
- **Inputs**: `GET /api/sessions` response
- **Outputs**: Table with columns: ID, Summary, TTL countdown, Promoted status. Click to expand: active threads, working memory namespaces
- **Behavior**: Client component with expand/collapse state. TTL shows countdown or "expired"

### Capability: Agent Chat
Streaming conversational interface with inline MCP tool call visualization.

#### Feature: Chat API Route
- **Description**: Stream agent responses via AI SDK with MCP tool access
- **Inputs**: `POST { messages[] }` — conversation history
- **Outputs**: Streaming text response with tool call events
- **Behavior**: Call `jadeStreamText()` from `ts/ai/chat.ts` with `createJadeProvider()` from `ts/ai/provider.ts`. Include Jade's 13 MCP tools. Return AI SDK compatible stream

#### Feature: Chat Page
- **Description**: Chat UI with message bubbles and collapsible tool call cards
- **Inputs**: `useChat` hook from `@ai-sdk/react` connected to `POST /api/chat`
- **Outputs**: Message thread with user/assistant messages + ToolCallCard components
- **Behavior**: Stream responses token-by-token. Tool calls render as collapsible cards showing tool name, input params (JSON), and result summary

### Capability: Observability
View Langfuse trace timelines for agent sessions.

#### Feature: Traces Page
- **Description**: Session list with expandable trace timeline
- **Inputs**: Langfuse API (read-only via `LangfuseTracing` client)
- **Outputs**: Table: Session, Started, Tokens, Latency. Expanded: waterfall timeline of spans (tool calls) and generations (LLM calls)
- **Behavior**: Fetch traces via Langfuse REST API. Render spans as proportional horizontal bars. Show token breakdown per session

### Capability: Semantic Search
Natural language search across the knowledge graph using vector embeddings.

#### Feature: Search API Route
- **Description**: Embed query text and find similar entities via cosine similarity
- **Inputs**: `POST { query: string, limit?: number }`
- **Outputs**: JSON array of `{ name, entityType, observations[], score }`
- **Behavior**: Use `EmbeddingPipeline.embed(query)` to get query vector. Call `ColdMemoryClient.semanticSearch(vector, limit)`. Return entities sorted by similarity score

#### Feature: Search Page
- **Description**: Search input with ranked result cards
- **Inputs**: `POST /api/search` response
- **Outputs**: Result cards with entity name, EntityBadge, similarity score, first observation
- **Behavior**: Debounced input. Click result navigates to entity in `/graph`

### Capability: Cost Analysis
Display Anthropic API pricing and per-session token cost breakdowns.

#### Feature: Costs API Route
- **Description**: Aggregate token usage across sessions and calculate costs
- **Inputs**: Session token data from Neon, `PRICING` and `calculateCost()` from `ts/task/cost.ts`
- **Outputs**: JSON `{ pricing: Record<ModelTier, ModelPricing>, sessions: { id, model, tokens, cost }[], total }`
- **Behavior**: Query session token usage. Apply `calculateCost()` per session. Sum totals

#### Feature: Costs Page
- **Description**: Pricing reference table + per-session cost breakdown
- **Inputs**: Static `PRICING` constant for top table, `GET /api/costs` for session table
- **Outputs**: Two tables: model pricing (Opus/Sonnet/Haiku rates), session costs (per-session breakdown + total)
- **Behavior**: Top table is server-rendered from `PRICING`. Bottom table fetches from API

### Capability: Task Planning
Interactive task planner with AI-generated plans and code review.

#### Feature: Tasks Page
- **Description**: Input task description, receive structured plan with token estimates and review
- **Inputs**: User description string, model tier selection
- **Outputs**: TaskPlan card (steps, token estimates, cost) + TaskReview panel (verdict, findings with severity)
- **Behavior**: Submit description to `POST /api/plan`. Display plan using `TaskPlan` types from `ts/task/spec.ts`. Show estimated cost via `estimateCost()` + `formatCost()`. Submit plan to `POST /api/review` for verdict + findings

### Capability: Navigation + Layout
Shared navigation and layout components for all non-docs pages.

#### Feature: NavBar
- **Description**: Top navigation bar with links to all 10 routes, active state highlighting
- **Inputs**: Current pathname
- **Outputs**: Horizontal nav bar: JADE brand + Dashboard, Graph, Tools, Tasks, Sessions, Chat, Traces, Search, Costs
- **Behavior**: Highlight current route. Exclude from `/docs/*` pages (fumadocs has its own nav)

#### Feature: Landing Page
- **Description**: Hero section with stats, feature cards, and CTAs
- **Inputs**: Static content
- **Outputs**: Title, description, [Documentation] + [Chat with Jade] buttons, stats grid (288 tests, 9+4 MCP tools, 2 languages, live services), feature cards linking to `/graph` and `/dashboard`
- **Behavior**: Server component. Update existing `web/app/page.tsx`

---

## Repository Structure

```
web/
├── app/
│   ├── layout.tsx              # Modify — add NavBar for non-docs routes
│   ├── page.tsx                # Modify — update landing per wireframe
│   ├── dashboard/page.tsx      # New — service health cards + endpoint latency
│   ├── graph/page.tsx          # New — two-panel entity explorer
│   ├── tools/page.tsx          # New — MCP tool reference (static)
│   ├── tasks/page.tsx          # New — task planner + review
│   ├── sessions/page.tsx       # New — session table + expandable detail
│   ├── chat/page.tsx           # New — streaming chat with tool cards
│   ├── traces/page.tsx         # New — Langfuse trace timeline
│   ├── search/page.tsx         # New — semantic search + results
│   ├── costs/page.tsx          # New — pricing table + session costs
│   ├── docs/                   # Existing — fumadocs (unchanged)
│   └── api/
│       ├── health/route.ts     # Existing — keep as-is
│       ├── graph/route.ts      # New — migrated from root api/graph.ts
│       ├── chat/route.ts       # New — streaming chat via AI SDK
│       ├── sessions/route.ts   # New — session list from Neon + Upstash
│       ├── search/route.ts     # New — semantic search via embeddings
│       └── costs/route.ts      # New — aggregate token costs
├── components/
│   ├── nav-bar.tsx             # New — shared top navigation
│   ├── status-dot.tsx          # New — green/red circle indicator
│   ├── entity-badge.tsx        # New — colored entity type badge
│   ├── tool-call-card.tsx      # New — collapsible tool invocation
│   └── relation-link.tsx       # New — clickable relation arrow
├── wireframes/                 # Existing — ASCII wireframes + build.sh
├── content/docs/               # Existing — MDX documentation
├── lib/source.ts               # Existing — fumadocs source loader
└── package.json                # Modify — add ai, @ai-sdk/anthropic, @ai-sdk/react
```

## Module Definitions

### Module: `web/components/`
- **Maps to capability**: Navigation + Layout, and shared UI primitives
- **Responsibility**: Reusable UI components used across multiple pages
- **Exports**:
  - `NavBar` — top navigation with active state (uses `usePathname`)
  - `StatusDot` — `{ status: "configured" | "not_configured" }` → green/red circle
  - `EntityBadge` — `{ entityType: string }` → colored pill (Person=blue, Decision=purple, Concept=green, Tool=orange, Session=gray, Goal=yellow)
  - `ToolCallCard` — `{ toolName, input, output }` → collapsible card with JSON display
  - `RelationLink` — `{ from, to, relationType }` → clickable arrow navigating to `/graph?entity=<name>`

### Module: `web/app/api/`
- **Maps to capability**: All backend data capabilities (monitoring, graph, sessions, search, chat, costs)
- **Responsibility**: Next.js route handlers replacing root `api/` serverless functions
- **Exports** (HTTP routes):
  - `GET /api/health` — service status JSON (existing)
  - `GET /api/graph` — entities + relations from Neon (migrated)
  - `GET /api/sessions` — session list with TTL from Neon + Upstash
  - `POST /api/search` — embed query + cosine similarity search
  - `POST /api/chat` — streaming agent response with MCP tools
  - `GET /api/costs` — aggregated token costs per session

### Module: `web/app/` (pages)
- **Maps to capability**: All page-level capabilities
- **Responsibility**: Next.js page components consuming API routes and TS module imports
- **Imports from existing codebase** (via `@ts/` path alias → `../ts/`):
  - `ts/agent/tools.ts` → tools page
  - `ts/task/cost.ts` → costs page
  - `ts/task/spec.ts` → tasks page types
  - `ts/mcp/entities.ts` → graph page filters
  - `ts/db/client.ts` + `ts/db/schema.ts` → graph and sessions API routes
  - `ts/ai/chat.ts` + `ts/ai/provider.ts` → chat API route
  - `ts/memory/upstash-hot.ts` → sessions API route
  - `ts/memory/cold.ts` + `ts/memory/embedding-pipeline.ts` → search API route
  - `ts/observability/langfuse-tracing.ts` → traces page

---

## Dependency Chain

### Foundation Layer (Phase 0)
No dependencies — these are built first.

- **NavBar component**: Shared top navigation used by every page
- **StatusDot component**: Green/red indicator used by dashboard
- **EntityBadge component**: Colored type pill used by graph + search
- **ToolCallCard component**: Collapsible tool display used by chat
- **RelationLink component**: Clickable relation used by graph
- **Package dependencies**: `ai`, `@ai-sdk/anthropic`, `@ai-sdk/react` added to `web/package.json`
- **Path aliases**: `web/tsconfig.json` updated with `@ts/*` → `../ts/*` for importing existing modules

### Static Pages (Phase 1) — depends on Phase 0
- **Landing page**: Depends on [NavBar]
- **Tools page**: Depends on [NavBar], imports `getJadeToolDefinitions()` from `ts/agent/tools.ts`
- **Costs page**: Depends on [NavBar], imports `PRICING` from `ts/task/cost.ts`

### API Migration (Phase 2) — depends on Phase 0
- **Graph API route**: Depends on [path aliases], imports `ts/db/client.ts` + `ts/db/schema.ts`
- **Root api/ deletion**: Depends on [Graph API route] — delete after migration verified
- **Vercel config**: Depends on [Root api/ deletion] — simplify `vercel.json` for Next.js

### Data Pages (Phase 3) — depends on Phase 1 + Phase 2
- **Dashboard page**: Depends on [NavBar, StatusDot, Health API route]
- **Graph page**: Depends on [NavBar, EntityBadge, RelationLink, Graph API route]

### New API Routes (Phase 4) — depends on Phase 2
- **Sessions route**: Depends on [path aliases], imports `ts/db/schema.ts` + `ts/memory/upstash-hot.ts`
- **Search route**: Depends on [path aliases], imports `ts/memory/embedding-pipeline.ts` + `ts/memory/cold.ts`
- **Chat route**: Depends on [path aliases, package deps], imports `ts/ai/chat.ts` + `ts/ai/provider.ts`
- **Costs route**: Depends on [path aliases], imports `ts/task/cost.ts` + session token data

### Interactive Pages (Phase 5) — depends on Phase 3 + Phase 4
- **Sessions page**: Depends on [NavBar, Sessions route]
- **Search page**: Depends on [NavBar, EntityBadge, Search route]
- **Tasks page**: Depends on [NavBar] — uses `ts/task/spec.ts` types + `ts/task/cost.ts` for display
- **Chat page**: Depends on [NavBar, ToolCallCard, Chat route, package deps (`@ai-sdk/react`)]
- **Traces page**: Depends on [NavBar] — calls Langfuse API via `ts/observability/langfuse-tracing.ts`

---

## Development Phases

### Phase 0: Foundation — Shared Components + Deployment Config
**Goal**: NavBar, shared UI components, dependency installation, and path alias configuration

**Entry Criteria**: Clean `feat/vercel-web-app` branch with wireframes committed

**Tasks**:
- [ ] Create `web/components/nav-bar.tsx` (depends on: none)
  - Acceptance criteria: Links to all 10 routes, highlights active route via `usePathname()`, excluded from `/docs/*`
  - Test strategy: Visual verification in `bun dev`

- [ ] Create `web/components/status-dot.tsx` (depends on: none)
  - Acceptance criteria: Renders green circle for "configured", red for "not_configured"
  - Test strategy: Pass both states, verify CSS classes

- [ ] Create `web/components/entity-badge.tsx` (depends on: none)
  - Acceptance criteria: 6 colors mapping to `JADE_ENTITY_TYPES` (Person=blue, Decision=purple, Concept=green, Tool=orange, Session=gray, Goal=yellow)
  - Test strategy: Render all 6 types, verify color output

- [ ] Create `web/components/tool-call-card.tsx` (depends on: none)
  - Acceptance criteria: Collapsible card showing tool name, JSON input params, output summary
  - Test strategy: Render with sample data, verify expand/collapse toggle

- [ ] Create `web/components/relation-link.tsx` (depends on: none)
  - Acceptance criteria: Renders `from → relationType → to` with link to `/graph?entity=<name>`
  - Test strategy: Verify rendered link href

- [ ] Add `ai`, `@ai-sdk/anthropic`, `@ai-sdk/react` to `web/package.json` (depends on: none)
  - Acceptance criteria: `bun install` succeeds, packages resolve
  - Test strategy: `bun install && bun run build`

- [ ] Update `web/tsconfig.json` — add `"@ts/*": ["../ts/*"]` path alias (depends on: none)
  - Acceptance criteria: `import { PRICING } from "@ts/task/cost"` resolves
  - Test strategy: `bun run build` with a test import

- [ ] Update `web/app/layout.tsx` — add NavBar to non-docs pages (depends on: NavBar)
  - Acceptance criteria: NavBar renders on `/`, `/dashboard`, etc. but not on `/docs/*`
  - Test strategy: Navigate to `/` and `/docs` in `bun dev`

**Exit Criteria**: `cd web && bun run build` passes. All 5 components render. Path aliases resolve.

**Delivers**: Foundation for all subsequent pages. NavBar visible on landing page.

---

### Phase 1: Static Pages (no API calls needed)
**Goal**: 3 pages that render entirely from imported TS modules — no network requests at runtime

**Entry Criteria**: Phase 0 complete (NavBar, path aliases, dependencies installed)

**Tasks**:
- [ ] Update `web/app/page.tsx` — landing page per `01-landing.txt` wireframe (depends on: [NavBar])
  - Acceptance criteria: Hero + stats grid + [Documentation] and [Chat with Jade] CTAs + feature cards linking to `/graph` and `/dashboard`
  - Test strategy: Visual verification at `/` in `bun dev`

- [ ] Create `web/app/tools/page.tsx` per `04-tools.txt` wireframe (depends on: [NavBar, path aliases])
  - Acceptance criteria: 13 tools grouped into Memory Server (9) and Jade Server (4). Each tool shows name, description, parameters from `inputSchema`. Data from `getJadeToolDefinitions()`
  - Test strategy: Verify 13 tool cards render at `/tools`

- [ ] Create `web/app/costs/page.tsx` per `10-costs.txt` wireframe (depends on: [NavBar, path aliases])
  - Acceptance criteria: Top table shows Opus/Sonnet/Haiku pricing (Input, Output, Cache Write, Cache Read per 1M tokens). Data from `PRICING` constant. Bottom section placeholder for session costs (populated in Phase 5)
  - Test strategy: Verify pricing table matches `PRICING` values at `/costs`

**Exit Criteria**: All 3 pages render at `/`, `/tools`, `/costs` in `bun dev`. `bun run build` passes.

**Delivers**: Landing page with navigation, tool reference documentation, pricing reference.

---

### Phase 2: API Migration
**Goal**: Move root `api/` serverless endpoints into Next.js route handlers and unify Vercel deployment

**Entry Criteria**: Phase 0 complete (path aliases configured)

**Tasks**:
- [ ] Create `web/app/api/graph/route.ts` — port from `api/graph.ts` (depends on: [path aliases])
  - Acceptance criteria: Same query logic (`?type=Decision&limit=50`), same JSON response shape. Use `NextRequest`/`NextResponse` instead of `VercelRequest`/`VercelResponse`. Import `createDbClient` and schema from `@ts/db/`
  - Test strategy: `curl localhost:3000/api/graph` returns entities + relations JSON

- [ ] Verify `web/app/api/health/route.ts` works (depends on: none)
  - Acceptance criteria: `GET /api/health` returns `{ status, timestamp, neon, upstash, langfuse, anthropic }`
  - Test strategy: `curl localhost:3000/api/health`

- [ ] Update `vercel.json` — remove `"framework": null` and serverless config (depends on: [Graph API route])
  - Acceptance criteria: Vercel treats `web/` as Next.js project. No `functions` block. Root directory set to `web/`
  - Test strategy: Vercel preview build succeeds

- [ ] Delete `api/health.ts` and `api/graph.ts` (depends on: [Graph API route, vercel.json update])
  - Acceptance criteria: Root `api/` directory removed. No orphan serverless functions
  - Test strategy: `ls api/` fails (directory gone)

- [ ] Update `CLAUDE.md` — reflect new API locations (depends on: [delete root api/])
  - Acceptance criteria: Architecture section references `web/app/api/` instead of root `api/`
  - Test strategy: Read CLAUDE.md, verify paths

**Exit Criteria**: `GET /api/health` and `GET /api/graph` work from `cd web && bun dev`. Root `api/` deleted. `make test` passes (288 tests — no TS source changes).

**Delivers**: Unified Vercel deployment. One Next.js app instead of disconnected serverless + Next.js.

---

### Phase 3: Data Pages (read from existing APIs)
**Goal**: Dashboard and graph pages that consume the migrated API routes

**Entry Criteria**: Phase 1 (NavBar, components) + Phase 2 (API routes working) complete

**Tasks**:
- [ ] Create `web/app/dashboard/page.tsx` per `02-dashboard.txt` wireframe (depends on: [NavBar, StatusDot, Health API])
  - Acceptance criteria: 4 service cards (Neon, Upstash, Anthropic, Langfuse) with StatusDot green/red. "Last checked" timestamp with [Refresh] button. API endpoint latency section showing response times for `/api/health` and `/api/graph`
  - Test strategy: Verify at `/dashboard` — cards render, refresh works, latency displayed

- [ ] Create `web/app/graph/page.tsx` per `03-graph.txt` wireframe (depends on: [NavBar, EntityBadge, RelationLink, Graph API])
  - Acceptance criteria: Two-panel layout. Left: entity list with type filter tabs (All, Person, Decision, Concept, Tool, Session, Goal). Right: selected entity detail with observations list + relation links. Search input filters by name/observation text. Entity count displayed
  - Test strategy: Verify at `/graph` — filter tabs narrow list, click entity shows detail, relations are clickable

**Exit Criteria**: `/dashboard` shows live service status with green/red dots. `/graph` shows entity list from Neon with working filters and detail view.

**Delivers**: Operational visibility into cloud services and knowledge graph content.

---

### Phase 4: New API Routes
**Goal**: Backend routes for sessions, search, chat, and costs

**Entry Criteria**: Phase 2 complete (API migration done, path aliases work)

**Tasks**:
- [ ] Create `web/app/api/sessions/route.ts` (depends on: [path aliases])
  - Acceptance criteria: Query `sessions` table via Drizzle, ordered by `createdAt` desc. For each session, call `UpstashHotMemoryClient.getTtl()`. Return `{ sessions: [{ id, summary, activeThreads, promotedAt, ttlSeconds }] }`
  - Test strategy: `curl localhost:3000/api/sessions` returns session array

- [ ] Create `web/app/api/search/route.ts` (depends on: [path aliases])
  - Acceptance criteria: Accept `POST { query, limit? }`. Embed query via `EmbeddingPipeline.embed()`. Search via `ColdMemoryClient.semanticSearch()`. Return `{ results: [{ name, entityType, observations, score }] }`
  - Test strategy: `curl -X POST localhost:3000/api/search -d '{"query":"memory"}'`

- [ ] Create `web/app/api/chat/route.ts` (depends on: [path aliases, ai package])
  - Acceptance criteria: Accept `POST { messages[] }`. Call `jadeStreamText()` with provider from `createJadeProvider()`. Include 13 MCP tool definitions. Return AI SDK streaming response
  - Test strategy: `curl -X POST localhost:3000/api/chat -d '{"messages":[{"role":"user","content":"hello"}]}'` streams response

- [ ] Create `web/app/api/costs/route.ts` (depends on: [path aliases])
  - Acceptance criteria: Query session token usage. Apply `calculateCost()` per session. Return `{ pricing, sessions: [{ id, model, tokens, cost }], total }`
  - Test strategy: `curl localhost:3000/api/costs` returns pricing + session costs

**Exit Criteria**: All 4 routes return correct JSON/stream responses via `curl`.

**Delivers**: Backend data layer for all remaining interactive pages.

---

### Phase 5: Interactive Pages
**Goal**: 5 pages that consume Phase 4 API routes + complete the 10-page app

**Entry Criteria**: Phase 3 (data pages) + Phase 4 (API routes) complete

**Tasks**:
- [ ] Create `web/app/sessions/page.tsx` per `06-sessions.txt` wireframe (depends on: [NavBar, Sessions route])
  - Acceptance criteria: Table with ID, Summary, TTL countdown, Promoted status. Click row expands: active threads list, working memory namespaces. TTL shows minutes remaining or "expired"
  - Test strategy: Verify at `/sessions` — table renders, row expand works

- [ ] Create `web/app/search/page.tsx` per `09-search.txt` wireframe (depends on: [NavBar, EntityBadge, Search route])
  - Acceptance criteria: Search input with [Search] button. Results show entity name + EntityBadge + similarity score + first observation. Click result navigates to `/graph?entity=<name>`
  - Test strategy: Verify at `/search` — submit query, results render with scores

- [ ] Create `web/app/tasks/page.tsx` per `05-tasks.txt` wireframe (depends on: [NavBar, path aliases])
  - Acceptance criteria: Text input for task description + model tier selector (Opus/Sonnet/Haiku). Plan card shows: title, type badge, priority, steps with token estimates, total cost via `formatCost()`, commit message. Review panel shows: verdict (approve/revise/reject), findings with severity badges (critical/suggestion/nit)
  - Test strategy: Verify at `/tasks` — submit description, plan renders, review shows findings

- [ ] Create `web/app/chat/page.tsx` per `07-chat.txt` wireframe (depends on: [NavBar, ToolCallCard, Chat route, @ai-sdk/react])
  - Acceptance criteria: Message input with [Send] button. Streaming responses render token-by-token. Tool calls display as ToolCallCard components (collapsible, showing tool name + JSON input + result). Uses `useChat` hook from `@ai-sdk/react`
  - Test strategy: Verify at `/chat` — send message, stream renders, tool cards display

- [ ] Create `web/app/traces/page.tsx` per `08-traces.txt` wireframe (depends on: [NavBar])
  - Acceptance criteria: Session table: Session ID, Started, Tokens, Latency. Click row expands: waterfall timeline with horizontal bars proportional to span duration. Token breakdown (Input, Output, Total). Links to entities in `/graph`
  - Test strategy: Verify at `/traces` — table renders, expand shows timeline

**Exit Criteria**: All 10 core pages render and function. `bun run build` passes. `make test` passes (288 tests).

**Delivers**: Complete interactive web frontend for the Jade agent system.

---

## Test Strategy

### Test Pyramid

```
        /\
       /E2E\       ← 5% — Vercel preview builds succeed, pages load
      /------\
     /  Manual \   ← 15% — Visual verification per wireframe spec
    /------------\
   / Build + Lint  \ ← 80% — bun run build (type checking), make test (288 existing)
  /------------------\
```

### Coverage Requirements
- **Build passes**: `cd web && bun run build` — zero type errors (this is the primary gate)
- **Existing tests pass**: `make test` — all 288 tests (140 Python + 148 TypeScript) unchanged
- **No TS source modifications**: This PR creates pages and routes that *import* from `ts/` but does not modify those modules, so existing test coverage remains valid

### Critical Test Scenarios

#### API Routes
**Happy path**:
- `GET /api/health` returns 200 with all 4 service keys
- `GET /api/graph` returns entities + relations arrays
- `POST /api/chat` streams text response
- `GET /api/sessions` returns session array with TTL values
- `POST /api/search` returns scored results
- `GET /api/costs` returns pricing + session costs

**Edge cases**:
- `/api/graph?type=NonexistentType` returns empty array (not error)
- `/api/search` with empty query returns empty results
- `/api/sessions` when Upstash is unavailable returns sessions without TTL

**Error cases**:
- Missing `NEON_DATABASE_URL` → graph/sessions/costs routes return 500 with error message
- Missing `ANTHROPIC_API_KEY` → chat route returns 500 with error message
- Invalid JSON body → routes return 400

#### Pages
**Happy path**:
- All 10 pages render without JavaScript errors
- NavBar shows on all pages except `/docs/*`
- Type filter tabs on `/graph` narrow the entity list
- Chat messages stream in real-time on `/chat`

**Degraded state**:
- Pages render placeholder/empty states when APIs return no data
- Dashboard shows red StatusDots when services are not configured

### Verification Per Phase
After each phase:
1. `cd web && bun run build` — no type errors
2. `cd web && bun dev` — pages render at expected routes
3. `make test` from root — all 288 tests pass
4. Vercel preview deploys successfully (after Phase 2)

---

## Architecture

### System Components

```
Browser ──→ Next.js Pages (React Server + Client Components)
                │
                ├──→ Next.js Route Handlers (web/app/api/)
                │        │
                │        ├──→ ts/db/ (Neon + Drizzle)
                │        ├──→ ts/ai/ (Anthropic AI SDK)
                │        ├──→ ts/memory/ (Upstash + pgvector)
                │        └──→ ts/observability/ (Langfuse)
                │
                └──→ Direct imports (server components)
                         │
                         ├──→ ts/agent/tools.ts (tool definitions)
                         ├──→ ts/task/cost.ts (pricing data)
                         ├──→ ts/task/spec.ts (type definitions)
                         └──→ ts/mcp/entities.ts (entity types)
```

### Data Models (existing — no changes)

**entities** table (Neon pgvector):
- `name` varchar(512) PK, `entityType` varchar(128), `observations` jsonb, `embedding` vector(1536), `sessionId` varchar(256), `createdAt`/`updatedAt` timestamps

**relations** table:
- `fromEntity`/`toEntity` varchar(512) FK→entities, `relationType` varchar(128), composite PK

**sessions** table:
- `id` varchar(256) PK, `summary` text, `activeThreads` jsonb, `promotedAt` timestamp, `createdAt`/`updatedAt`

### Technology Stack

- **Framework**: Next.js 15 with Turbopack (`bun dev --turbopack`)
- **Runtime**: Bun (package manager + test runner)
- **Styling**: Tailwind CSS v4 + fumadocs-ui theme tokens (`fd-*` classes)
- **AI SDK**: `ai` + `@ai-sdk/anthropic` (v3.x) + `@ai-sdk/react` — streaming chat
- **Database**: Neon serverless + Drizzle ORM + pgvector
- **Cache**: Upstash Redis (REST API, edge-compatible)
- **Observability**: Langfuse (50K observations/month free tier)
- **Deployment**: Vercel (Next.js auto-detection, preview per PR)
- **Docs**: fumadocs-core + fumadocs-mdx (existing, unchanged)

**Decision: Import existing `ts/` modules via path alias instead of duplicating code**
- **Rationale**: 12 modules already exist with full test coverage. Path alias `@ts/*` → `../ts/*` lets Next.js resolve them at build time
- **Trade-offs**: Next.js must be configured to transpile files outside `web/`. May need `transpilePackages` in `next.config.mjs`
- **Alternatives considered**: Copy modules into `web/lib/`, create npm workspace — both add maintenance burden

**Decision: Server components for static pages, client components only where needed**
- **Rationale**: Tools, costs, and landing pages have no interactivity — render on server. Only chat, graph, dashboard, sessions need client-side state
- **Trade-offs**: Must be explicit about `"use client"` boundaries
- **Alternatives considered**: Full SPA — unnecessary JS bundle for static content

---

## Risks

### Technical Risks

**Risk**: Path alias `@ts/*` → `../ts/*` may not resolve correctly in Next.js build
- **Impact**: High — blocks all imports from existing codebase
- **Likelihood**: Medium — Next.js bundler may need explicit `transpilePackages` config
- **Mitigation**: Test with `next.config.mjs` `transpilePackages: ['../ts']` in Phase 0
- **Fallback**: Use relative imports (`../../ts/`) instead of path alias

**Risk**: Existing `ts/` modules import packages not in `web/package.json`
- **Impact**: Medium — build failures on missing dependencies
- **Likelihood**: Medium — `ts/db/client.ts` imports `drizzle-orm`, `@neondatabase/serverless`
- **Mitigation**: Audit all transitive imports in Phase 0, add missing deps to `web/package.json`
- **Fallback**: Add all root `package.json` dependencies to `web/package.json`

**Risk**: `@ai-sdk/anthropic` v3.x streaming format incompatible with `useChat`
- **Impact**: Medium — chat page broken
- **Likelihood**: Low — AI SDK versions are tested together
- **Mitigation**: Pin exact versions: `ai@^4.0`, `@ai-sdk/anthropic@^3.0`, `@ai-sdk/react@^1.0`
- **Fallback**: Use `@ai-sdk/anthropic@latest` compatible pair

### Dependency Risks

**Risk**: Langfuse API unavailable → traces page empty
- **Impact**: Low — traces page is view-only, not critical path
- **Likelihood**: Medium — Langfuse credentials may not be configured
- **Mitigation**: Traces page shows "Langfuse not configured" empty state
- **Fallback**: Skip traces page, add in future PR

**Risk**: Neon database empty → graph and sessions pages show no data
- **Impact**: Low — pages should handle empty state gracefully
- **Likelihood**: High — preview deployments won't have seeded data
- **Mitigation**: All data pages render empty state with helpful message ("No entities yet. Run a Jade session to populate the graph.")

### Scope Risks

**Risk**: Scope creep from 10 pages to 13 (analytics, actions, workers)
- **Impact**: Medium — delays PR merge
- **Likelihood**: Low — explicitly marked out of scope
- **Mitigation**: PRD explicitly scopes out 3 wireframes (11-analytics, 12-agent-actions, 13-workers) as blocked by missing prerequisites (Cube.js, Agent SDK, Worker configs)

---

## Files to Modify

| Action | File | Notes |
|--------|------|-------|
| Modify | `web/app/layout.tsx` | Add NavBar for non-docs routes |
| Modify | `web/app/page.tsx` | Update landing per `01-landing.txt` wireframe |
| Modify | `web/package.json` | Add `ai`, `@ai-sdk/anthropic`, `@ai-sdk/react` + transitive deps |
| Modify | `web/tsconfig.json` | Add `@ts/*` path alias for `../ts/` imports |
| Modify | `web/next.config.mjs` | Add `transpilePackages` if needed for `../ts/` |
| Delete | `api/health.ts` | Migrated to `web/app/api/health/route.ts` (already exists) |
| Delete | `api/graph.ts` | Migrated to `web/app/api/graph/route.ts` |
| Modify | `vercel.json` | Remove `"framework": null`, serverless config. Point to `web/` |
| Modify | `CLAUDE.md` | Update Architecture section with new API locations |
| Create | `web/components/nav-bar.tsx` | Shared navigation |
| Create | `web/components/status-dot.tsx` | Green/red indicator |
| Create | `web/components/entity-badge.tsx` | Colored entity type badge |
| Create | `web/components/tool-call-card.tsx` | Collapsible tool call display |
| Create | `web/components/relation-link.tsx` | Clickable relation arrow |
| Create | `web/app/api/graph/route.ts` | Migrated graph endpoint |
| Create | `web/app/api/sessions/route.ts` | Session list + TTL |
| Create | `web/app/api/search/route.ts` | Semantic search |
| Create | `web/app/api/chat/route.ts` | Streaming chat |
| Create | `web/app/api/costs/route.ts` | Token cost aggregation |
| Create | `web/app/dashboard/page.tsx` | Service health dashboard |
| Create | `web/app/graph/page.tsx` | Knowledge graph explorer |
| Create | `web/app/tools/page.tsx` | MCP tool reference |
| Create | `web/app/tasks/page.tsx` | Task planner + review |
| Create | `web/app/sessions/page.tsx` | Session browser |
| Create | `web/app/chat/page.tsx` | Streaming agent chat |
| Create | `web/app/traces/page.tsx` | Langfuse trace viewer |
| Create | `web/app/search/page.tsx` | Semantic search |
| Create | `web/app/costs/page.tsx` | Pricing + spend |

## Out of Scope (future PRs)

These 3 wireframes are blocked by work not in this PR:
- `/analytics` (`11-analytics.txt`) — needs Cube.js setup
- `/actions` (`12-agent-actions.txt`) — needs Agent SDK wrapper
- `/workers` (`13-workers.txt`) — needs knowledge worker YAML configs

---

## Glossary

- **MCP**: Model Context Protocol — standard for AI tool definitions. Jade exposes 13 tools via 2 MCP servers (Memory + Jade)
- **Hot memory**: Upstash Redis — session-scoped, TTL-based, working memory
- **Cold memory**: Neon pgvector — persistent knowledge graph with vector embeddings
- **Promotion**: Moving session data from hot (Redis) to cold (Neon) storage
- **Entity types**: Person, Decision, Concept, Tool, Session, Goal
- **Relation types**: made_decision, discussed_concept, uses_tool, has_goal, participated_in, related_to
- **fumadocs**: Documentation framework built on Next.js — already deployed at `/docs/*`
- **AI SDK**: Vercel's `ai` package for streaming LLM responses in React
