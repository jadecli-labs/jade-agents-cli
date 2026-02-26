# TDD Green Phase — Make Tests Pass

Implement the minimum code to make all failing tests pass.

## Context

```bash
make test 2>&1 | tail -20
```

## Instructions

1. Read the failing tests to understand what's expected.
2. Implement the minimum code to make each test pass. No over-engineering.
3. Follow existing patterns in the codebase (frozen dataclasses, fail-fast, etc.).
4. Run `make test` after implementation — all tests must pass.
5. Run `make lint` — must be clean.
6. Report results.
