# Jade Frontier Journal

Bilateral learning partnership AI agent system. Dual Python + TypeScript codebase.

## Commands

```
make test          # Run all tests (140 Python + 148 TypeScript)
make test-py       # Python only: uv run pytest tests/ -v --tb=short
make test-ts       # TypeScript only: bun test
make lint          # Both linters: ruff check + tsc --noEmit
make lint-py       # Python only: uv run ruff check src/ tests/
make lint-ts       # TypeScript only: bun run tsc --noEmit
make install       # Install all deps: uv sync + bun install
```

## Code Style

- Python: uv + ruff. Target py312. Line length 120.
- TypeScript: bun + tsc strict mode. ES2022 target, ESNext modules.
- MCP tool parameters use **camelCase** (not snake_case). Python uses `# noqa: N803` to suppress ruff.
- Fail-fast: config classes raise immediately on invalid input. No lazy validation.

## Architecture

- `src/jade/` — Python source. `ts/` — TypeScript source. Every Python module has a TS equivalent.
- `src/jade/mcp/` — Memory server (9 tools) + Jade server (4 tools) via FastMCP
- `src/jade/agent/` — JadeAgent wraps Anthropic client with MCP tool routing
- `src/jade/memory/` — Hot (Redis/Upstash), Cold (Neon pgvector), Promotion (hot→cold)
- `src/jade/observability/` — Langfuse tracing (production), MLflow tracing (legacy/testing)
- `api/` — Vercel serverless functions (TypeScript)
- `worker/` — Cloudflare Workers edge MCP server

## Testing

- TDD: tests first, then implementation. Run single test files when iterating.
- Python tests use `FakeRedis`, `_FakeStore`, `_fake_embed` — no external services needed.
- TypeScript tests use in-memory fakes with the same pattern.
- Always run `make test` before committing. All 288 tests must pass.

## Secrets

- Never commit `.env` files. Use `env.template` as reference.
- Cloud credentials go in GitHub Secrets (see `.github/SECRETS.md`).
- MCP server secrets use `${VAR}` expansion in `.mcp.json`.

## Git

- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`
- Branch: `claude/jade-tdd-full-stack-GOCGd`
- Push with: `git push -u origin claude/jade-tdd-full-stack-GOCGd`

## Known Gaps

See `.github/PULL_REQUEST.md` — 9 identified gaps from transcript review.
