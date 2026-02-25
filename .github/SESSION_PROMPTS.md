# Session Prompts — PR #5

Tracking user prompts across Claude Code sessions for this PR.

## Session 1 (compacted — from previous context)

> **Prompt 1:** [Initial TDD implementation request — Weeks 1-5 full stack with dual Python+TypeScript, MCP protocol, fail-fast, uv+ruff, mise+bun]

> **Prompt 2:** [Week-by-week RED/GREEN/REFACTOR cycle execution]

> **Prompt 3:** "we want to setup cloud services where possible using verified github marketplace actions (JUST EXAMPLES, THESE ARE NOT REQUIREMENTS TO ACTUALLY USE IN THIS PR) https://github.com/marketplace?verification=verified_creator&type=actions like [list of action URLs]. we already have in https://github.com/organizations/jadecli-labs/settings/installations claude, cloudflare, neon, vercel, vercel toolbar installed. what cloud services are currently working? what do we need to setup still?"

> **Prompt 4:** "i want to set up everything and deploy it. that's a priority. lets research the cheapest and best place to deploy that works well with claude. i dont want any of these services to be nondeployed in the cloud. that defeats the point."

> **Prompt 5:** "i want full production tier. lets... Full production"

## Session 2 (current)

> **Prompt 1:** [Continuation context — session summary from compaction, requesting to continue from where we left off]

> **Prompt 2:** "why langfuse over mlflow?"

> **Prompt 3:** "check for github marketplace apps for these, can you use gh cli to set these up for me? i already have neon and vercel added to jadecli-labs org as apps for neon and vercel, just do the rest; [full cloud infrastructure summary + next steps list + Langfuse rationale]"

> **Prompt 4:** "we should make this research claud at session start ( [full cloud services status table + marketplace research findings] )"

> **Prompt 5:** "is there anything we mentioned we would setup need to setup in this active session but we didnt?"

> **Prompt 6:** "update the PR body for https://github.com/jadecli-labs/jade-frontier-journal/pull/5/changes to include details from transcript review and what's done this session and not done. ilso want to store my user prompts in this session in this pr 5 for tracking"

> **Prompt 7:** "update the PR body for https://github.com/jadecli-labs/jade-frontier-journal/pull/5/changes to include details from transcript review and what's done this session and not done. ilso want to store my user prompts in this session in this pr 5 for tracking"

## Decisions Made

1. **Langfuse over MLflow** — cheaper (50K free traces vs. needing a VM), purpose-built for LLM agents, works on edge/serverless, better Anthropic integration
2. **Upstash over Redis Cloud** — permanent free tier, REST API for edge compatibility
3. **Self-host Cube.js** — Cube Cloud minimum $99/mo, not worth it for this stage
4. **camelCase for MCP params** — Python uses `# noqa: N803` to suppress ruff naming convention
5. **SessionStart hook** — runs cloud status check at every session start, fires on all events (startup, resume, clear, compact)
6. **GitHub Marketplace** — Upstash and Langfuse don't have GitHub Apps; configured via API keys in GitHub Secrets instead
