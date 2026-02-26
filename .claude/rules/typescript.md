---
paths:
  - "ts/**/*.ts"
  - "api/**/*.ts"
  - "worker/**/*.ts"
---

# TypeScript Rules

- Use `bun` for package management and test runner (not npm/yarn/pnpm)
- Strict mode enabled. All functions need explicit return types.
- Import paths: `@jade/*` maps to `./ts/*` (see tsconfig paths)
- Tests: `*.test.ts` files in `ts/tests/` mirroring source structure
- Bun test uses `describe`/`it`/`expect` — no imports needed
- Edge-compatible code in `worker/` and `api/` — no Node.js-only APIs
