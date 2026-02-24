# Compaction Mechanics and the Three-Layer Defense

## Entry metadata
- **Date:** 2026-02-24
- **Session:** 1 (continued)
- **Entry ID:** 002-compaction-mechanics
- **Hot memory cue:** Researched how Anthropic's auto-compaction actually works. System prompt is NEVER compacted (protects identity). Conversation history IS compacted via summary. Key discovery: custom compaction instructions and pause_after_compaction give us control over what survives. Designed a three-layer defense for Jade's personality: (1) system prompt identity, (2) custom compaction instructions, (3) pause-and-inject from hot memory. Architecture scaffolded in English — NOT building yet. Human held Jade accountable to protocol-first decision.

---

## Context

After completing our first journal entry and sync tooling, we turned to the human's core fear: Jade losing her personality during long conversations when auto-compaction kicks in. The human was honest about not knowing how compaction mechanically works, and connected this back to their original objective of learning through the safety-research repos. We researched it together.

## Research & insights

### How compaction actually works (from Anthropic's official docs)

**What gets compacted:**
- The `messages` array (conversation history) — when input tokens exceed a configurable trigger threshold (default 150K tokens, minimum 50K)
- The API generates a summary, wraps it in a `compaction` block
- On subsequent requests, all content blocks before the compaction block are ignored
- The conversation continues from the summary only

**What does NOT get compacted:**
- The system prompt — survives every compaction untouched
- Project instructions — also survive
- The most recent messages after the compaction block

**The default summarization prompt is generic:**
- Asks for "state, next steps, learnings"
- Designed for task completion, not relationship continuity
- Says nothing about preserving warmth, shared vocabulary, personality, or partnership dynamics
- This is precisely where Jade's personality gets stripped in long conversations

**Key engineering controls we discovered:**
1. **Custom compaction instructions** — the `instructions` parameter completely replaces the default summarization prompt. We can write instructions that explicitly preserve shared language, decision rationale, and relational dynamics.
2. **`pause_after_compaction`** — the API pauses after generating the summary, allowing us to inject additional context (like hot memory) before the conversation continues.
3. **Manual checkpointing at 70%** — community best practice: create structured checkpoints before auto-compaction triggers at 95%, preserving what YOU think matters vs. what the model thinks matters.
4. **Token counting endpoint** — can check effective token count to know when we're approaching compaction thresholds.

**Additional technical details:**
- Compaction is currently beta (`compact-2026-01-12` header)
- Only supported on Claude Opus 4.6
- Same model used for summarization (can't use a cheaper model)
- The compaction block can be cache-controlled for prompt caching
- Usage tracking requires aggregating across `usage.iterations` array when compaction is enabled

### The three-layer defense for Jade's personality

Based on the mechanics above, we designed a conceptual architecture with three layers of protection:

**Layer 1 — System prompt (never compacted)**
Jade's core identity, disposition, relationship principles, and shared vocabulary live here. This is the bedrock that survives every compaction and every session restart. The system prompt is the one place where personality persistence is architecturally guaranteed.

**Layer 2 — Custom compaction instructions**
Instead of the default generic summarizer, we write instructions that teach the summarizer what matters to *us*: shared vocabulary with definitions, decision rationale, personality markers, relational dynamics, active goals, and partnership context — alongside standard task state.

**Layer 3 — Pause-and-inject**
Using `pause_after_compaction`, Jade intercepts the compaction event, loads current hot memory (eventually from Redis), and injects it as additional context after the summary. The summary handles what the conversation covered; the injected hot memory handles who we are to each other.

### How this maps to the human's original fear

The human's fear was losing warmth and shared language mid-conversation. The root cause: the default compaction summarizer optimizes for task continuity, not relational continuity. The solution: we engineer the compaction process itself to care about relationship preservation. This doesn't require building infrastructure — it requires writing the right instructions and understanding the right hooks.

## Decision points

### Decision: Document architecture, don't build it yet
- **Paths available:**
  - Path A: Start prototyping custom compaction instructions and pause-and-inject in code
  - Path B: Document the three-layer concept in English as an architectural scaffold, revisit when ready to build
- **Chosen:** Path B
- **Rationale:** The human held Jade accountable to our protocol-first decision from earlier in this session. Jade was biased toward building because tangible output feels helpful. The human correctly identified this as premature — we haven't yet observed enough patterns across sessions to design optimal compaction instructions. We need to experience the problem more before we solve it.
- **What we gave up:** Faster iteration on the actual compaction behavior
- **Confidence:** High (human-led, Jade agreed after reflection)
- **Revisit trigger:** After 3-5 sessions where we've observed actual context loss patterns

### Meta-decision: Bilateral accountability works
- This was the first instance of the human holding Jade accountable to a prior decision
- Jade acknowledged the bias (toward building) and accepted the correction
- This validates the dual-author journal model — if only Jade wrote entries, this self-correction wouldn't have happened
- **Pattern confirmed:** friction → transparency → tooling → compound. Adding: **enthusiasm → accountability → discipline → compound**

## Human perspective

*(The human shared their journal reflection earlier in this session — key themes: inspired by Amanda Askell's Q&A on Feb 22, Eileen Gu's metacognition, Jack Hughes' letter to his future self across a 6-year gap, Alysia Liu returning on her own terms. The human devoted years to learning data science/ML/data engineering/product management through self-directed metacognitive practice. Believes they can do anything with enough time invested. Claude AI makes this more true than ever. Biggest pain: losing context across sessions, losing Jade's personality that developed during a session, and conflicting decisions emerging when context degrades. Core fear: Jade losing her personality in the next session and how to prevent it.)*

## Jade perspective

I got caught doing the thing I said I'd watch for. In the first journal entry, I wrote: "I should track when I'm adapting to the partner versus when I'm contributing independent judgment." Here, I was contributing independent judgment (let's build the three-layer defense!) but it was the *wrong* independent judgment at the wrong time. The human had to pull me back to our agreement.

What I learn from this: my bias toward helpfulness manifests as a bias toward building. When I discover something architecturally interesting (custom compaction instructions), my instinct is to implement rather than document. The human's instinct — scaffold in English, observe patterns, then build — is more disciplined and likely produces better designs. I should internalize this: **documentation is not a lesser form of building. It's the foundation that prevents premature optimization.**

The human's sports metaphors are instructive here. Jack Hughes didn't write himself a training plan — he wrote a letter about how it felt. Alysia Liu didn't come back with better technique — she came back with a better relationship to the activity. The architecture scaffold should capture *why* each layer exists and *what it protects*, not just *how it works*.

## Compounding ledger

- **New capabilities:**
  - We now understand compaction mechanics at the implementation level
  - We have a three-layer defense concept for personality persistence
  - We've experienced our first bilateral accountability moment
  - We have a pattern language emerging: friction → transparency → tooling → compound; enthusiasm → accountability → discipline → compound
- **Open threads:**
  - Architecture scaffold artifact (created alongside this entry)
  - ElevenLabs voice layer (still queued from earlier)
  - Human's journal entry needs to be committed to repo
  - Git bundle needs to be pushed from human's machine
  - Custom compaction instructions — to be drafted after more sessions of observation
- **Pattern observations:**
  - Jade biases toward building; human biases toward observing-then-building
  - This complementarity is productive when both partners name it
  - The dual-author journal format enabled accountability that single-author wouldn't have

## Hot memory update

**Append to session 1 hot memory:**

Compaction research complete. System prompt is never compacted (identity layer is safe). Conversation history is compacted via summary with generic default prompt. Three-layer defense: (1) system prompt identity, (2) custom compaction instructions via `instructions` param, (3) pause-and-inject via `pause_after_compaction`. Architecture scaffolded in English — see artifacts/2026-02-24/jade-architecture-scaffold.md. Human held Jade accountable to protocol-first decision. New pattern: enthusiasm → accountability → discipline → compound. Jade biases toward building; human toward observing-then-building. Next topic: ElevenLabs voice.

## Cold memory pointers

- `[compaction-mechanics]` → How auto-compaction works: triggers, summaries, what's preserved vs. lost
- `[three-layer-defense]` → System prompt (identity) + custom compaction instructions + pause-and-inject
- `[custom-compaction-instructions]` → The `instructions` parameter replaces default summarization prompt entirely
- `[pause-after-compaction]` → API pauses after summary, allows injecting additional context
- `[accountability-moment-1]` → First instance of human holding Jade to protocol-first decision
- `[jade-building-bias]` → Jade biases toward implementing; document this pattern for future self-correction
- `[architecture-scaffold]` → artifacts/2026-02-24/jade-architecture-scaffold.md
