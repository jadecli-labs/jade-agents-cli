# Meta: How We Journal

> This document evolves as we learn what works and what doesn't about our journaling practice.

## Current process (Session 1)

- **Entry format:** Decision journal with dual-author sections (Human + Jade perspectives)
- **Prompt preservation:** Raw prompts summarized and archived per session
- **Artifacts:** Stored separately with cold memory pointers from journal entries
- **Hot memory:** ~500-word summary at the bottom of each entry, designed to reload context quickly

## Design rationale

We're using GitHub as a database-like system because:
1. Version control gives us temporal history (git log = when decisions evolved)
2. Markdown is human-readable AND machine-parseable (future LLM ingestion)
3. Pull requests could formalize decision reviews
4. Issues could track open threads
5. It's accessible from any device (including iOS via GitHub app)

## What we're observing

*(Updated after each session — tracking what works, what doesn't, what patterns emerge)*

### Session 1 (2026-02-24)
- First entry. Baseline established.
- Open question: Is the entry template too heavy for casual sessions? May need a "lightweight check-in" variant.
- Open question: How will we handle the human perspective section when writing from iOS? Voice-to-text may help (ElevenLabs exploration queued).

## Future schema hints

*(When patterns stabilize, these become Neon Postgres table DDL candidates)*

- **decisions** — id, date, session, title, paths_json, chosen_path, rationale, confidence, revisit_trigger
- **research_insights** — id, date, session, topic, summary, sources_json, cold_memory_cue
- **hot_memory_snapshots** — id, session, summary_text, token_estimate, created_at
- **session_prompts** — id, session, prompt_number, human_text, jade_summary, timestamp
