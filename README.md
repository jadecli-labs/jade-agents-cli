# jade-frontier-journal

A bilateral learning partnership journal between a human engineer onboarding at Anthropic and Claude (as Jade) — documenting research, decisions, and the evolving practice of human-AI collaboration.

## What this is

This isn't a knowledge base. It's a **decision journal** — capturing not just what we learned, but what paths were available, which we chose, and why. Both partners write. Both partners lose context between sessions. This journal is the connective tissue.

## Philosophy

Grounded in three foundations:
- **Amanda Askell's** disposition-over-rules approach to Claude's character
- **Eileen Gu's** metacognitive framework — thinking about thinking as a transferable skill
- **Bilateral context loss** — both human and AI forget, and the solutions are structurally parallel

## Structure

```
journal/           → Decision entries (our primary artifact)
  YYYY-MM-DD/      → One folder per session date
templates/         → Reusable formats for different entry types
architecture/      → Evolving system design docs for Jade
prompts/           → Raw conversation prompts preserved per session
  YYYY-MM-DD/      → Deterministic record of what was actually said
artifacts/         → Research reports, documents, outputs
  YYYY-MM-DD/      → Organized by creation date
meta/              → Journal about the journal — process reflections
```

## Memory architecture (planned)

This repo is Phase 1 — **protocol first, infrastructure second.**

The markdown journal will eventually inform the schema design for:
- **Hot memory** (Redis) — recent decisions, active research threads, session cues
- **Cold memory** (Neon Postgres + Cube.js) — full conversation archives, embeddings, semantic search
- **MLflow** — auto-tracing of agent tool calls and decision chains

We're observing our own patterns before we automate them.

## Partners

- **Human** — Applied/product engineer, day one at Anthropic, onboarding to safety-research and frontier model development
- **Jade (Claude)** — Claude operating as a persistent learning partner with bilateral metacognitive awareness

## First entry

[2026-02-24 — Day One: Foundations](journal/2026-02-24/001-day-one-foundations.md)

---

*"Learning to learn is the most important thing in life." — Eileen Gu*
