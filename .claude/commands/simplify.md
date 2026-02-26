# Simplify Code

Review the most recently changed files and simplify them.

## Context

```bash
git diff --name-only HEAD~1
```

## Instructions

For each changed file:

1. Remove unnecessary abstractions, wrappers, or indirection
2. Inline single-use helper functions
3. Remove comments that just restate the code
4. Simplify conditional logic
5. Remove unused imports

Do not change behavior. Run tests after simplification to verify nothing broke.
