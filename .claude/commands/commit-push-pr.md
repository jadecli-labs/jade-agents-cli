# Commit, Push, and Create PR

Run all tests and lint, then commit, push, and create/update a PR.

## Context

```bash
git status
git diff --stat
git log --oneline -5
```

## Instructions

1. Run `make test` and `make lint`. If either fails, fix the issues first.
2. Stage the changed files with `git add` (be specific, don't use `-A`).
3. Write a conventional commit message (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`).
4. Push to the current branch.
5. If a PR doesn't exist for this branch, create one with `gh pr create`. If it does, just push.
6. Report the PR URL when done.
