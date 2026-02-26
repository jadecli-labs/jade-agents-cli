# Verify Everything Passes

Run the full verification suite and report status.

## Instructions

Run these in order and report results:

1. `make test-py` — all Python tests must pass
2. `make test-ts` — all TypeScript tests must pass
3. `make lint-py` — ruff check must be clean
4. `make lint-ts` — tsc --noEmit must be clean
5. `git status` — report any uncommitted changes

If anything fails, report the exact error. Do not attempt to fix — just report.
