# Review PR

Orchestrate specialized review agents to analyze the current changes.

## Context

```bash
git diff --name-only HEAD~1
git diff --stat HEAD~1
```

## Instructions

1. Spawn three sub-agents in parallel to review the changes:
   - **code-quality-reviewer**: Review code quality and consistency
   - **test-coverage-reviewer**: Check test coverage gaps
   - **security-reviewer**: Check for security issues

2. Once all agents finish, review their feedback.

3. Post only the feedback that you also deem noteworthy. Filter out noise, false positives, and nits that don't matter.

4. Provide a final summary with:
   - Overall assessment (ship it / needs changes / needs discussion)
   - Critical issues (must fix before merge)
   - Suggestions (nice to have)
