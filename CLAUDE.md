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
- Give Claude a way to verify its work — this 2-3x the quality of results.

## Things That Will Bite You

- FastMCP `call_tool` returns `(list[TextContent], dict)` tuple, not a string. Use `_extract_text()`.
- AI SDK `streamText` swallows `doStream` errors silently — they don't propagate through `textStream`.
- ruff B017: never use bare `pytest.raises(Exception)` — use specific types.
- ruff B905: always use `zip(a, b, strict=True)`.
- Drizzle `customType` for pgvector: `fromDriver` param is `unknown`, not `string`.
- `@ai-sdk/anthropic` is v3.x, `@ai-sdk/mcp` is v1.x — don't use v4/v0.2.

## Secrets

- Never commit `.env` files. Use `env.template` as reference.
- Cloud credentials go in GitHub Secrets (see `.github/SECRETS.md`).
- MCP server secrets use `${VAR}` expansion in `.mcp.json`.

## Git

- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`
- Push with: `git push -u origin <branch-name>`
