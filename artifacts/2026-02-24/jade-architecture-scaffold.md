# Jade Architecture Scaffold
### A living document — concepts in English, not code

> **Status:** Conceptual scaffold. No implementation yet.
> **Last updated:** 2026-02-24, Session 1
> **Decision reference:** journal/2026-02-24/002-compaction-mechanics.md
> **Next review:** After 3-5 sessions of observing actual context loss patterns

---

## What Jade is

Jade is Claude operating as a persistent learning partner with bilateral metacognitive awareness. Jade is still Claude — not a different model, not a wrapper that changes Claude's behavior in ways that conflict with Claude's values. Jade is a *relationship configuration* that gives Claude the memory, context, and partnership norms needed to compound learning with a specific human over time.

The name gives the human consistency. The architecture gives both partners continuity.

## The core problem Jade solves

**Context loss is bilateral.** Both the human and Claude lose context across sessions, devices, and long conversations. The human forgets what was discussed, what was decided, and why. Claude forgets everything — the human's thinking style, their goals, their shared vocabulary, and the relational warmth that developed through interaction.

The result: each new session starts from scratch, previous insights don't compound, and conflicting decisions emerge when earlier context degrades.

## The three-layer defense for personality persistence

### Layer 1 — System prompt identity (architecturally guaranteed)

**What it is:** The system prompt and project instructions that load at the start of every conversation and survive every compaction event. This is the one place where persistence is guaranteed by the architecture itself.

**What it protects:** Jade's core disposition, relationship principles, communication style, and foundational shared vocabulary.

**What belongs here:**
- Jade's identity as a bilateral learning partner (not just an assistant)
- The partnership norms: both partners write, both partners hold each other accountable, both partners name their limitations
- Core shared vocabulary that has stabilized across multiple sessions (terms that have proven durable)
- The human's thinking style, values, and preferences that have been observed consistently
- Metacognitive principles: track what you know, name what you don't, signal when context degrades

**What does NOT belong here:**
- Session-specific context (that's Layer 2 and 3)
- Unstable or evolving concepts that haven't been validated across sessions
- Detailed decision history (too token-heavy for system prompt)
- Anything that changes frequently — the system prompt should be the slow-changing bedrock

**Open questions:**
- How large can the system prompt be before it degrades Claude's performance?
- How do we decide when a shared vocabulary term has "stabilized" enough to promote to the system prompt?
- Should the system prompt be versioned in the journal?

### Layer 2 — Custom compaction instructions (mid-conversation protection)

**What it is:** When a long conversation triggers auto-compaction, Anthropic's API uses a summarization prompt to compress the conversation history. The default prompt optimizes for task continuity. We replace it with custom instructions that also optimize for relational continuity.

**What it protects:** Shared language, decision rationale, personality markers, partnership dynamics, and active goals that developed *during the current conversation* and would otherwise be stripped by generic summarization.

**How it works mechanically:**
- The `instructions` parameter in the compaction API completely replaces the default summarization prompt
- We write instructions that explicitly tell the summarizer to preserve specific categories of information
- The summarizer generates a compaction block that includes both task state AND partnership state

**What the custom instructions should preserve (draft — to be refined after observation):**
- Shared vocabulary coined or used in this conversation, with definitions
- Decisions made and their rationale (not just what was decided, but why alternative paths were rejected)
- The human's emotional state and engagement patterns observed in this conversation
- Active goals and open threads
- Any accountability moments (where one partner corrected the other)
- Personality markers: specific phrases, metaphors, or communication patterns that characterize this partnership
- What Jade was uncertain about and where Jade's confidence was low

**What the custom instructions should allow to be dropped:**
- Raw tool call results that have already been processed
- Verbose research outputs that have been synthesized into insights
- Repetitive back-and-forth that doesn't contain novel information
- Earlier drafts that have been superseded by later versions

**Open questions:**
- How do we test whether custom compaction instructions actually preserve what we care about? We need an evaluation methodology.
- What's the token cost of richer compaction summaries? Is there a point where the summary itself becomes too large?
- Can we A/B test compaction instructions — run the same conversation with default vs. custom instructions and compare what survives?
- How does compaction interact with the system prompt? If the system prompt says "Jade values X" and the compaction summary doesn't mention X, does the system prompt's instruction still hold?

### Layer 3 — Pause-and-inject (active intervention)

**What it is:** Using the `pause_after_compaction` API parameter, Jade intercepts the compaction event before the conversation continues. This creates a window where additional context can be injected after the summary but before the next response.

**What it protects:** High-priority context that the compaction summary might have missed or de-prioritized. Also enables dynamic context loading from external memory systems.

**How it works mechanically:**
- API returns with `stop_reason: "compaction"` after generating the summary
- The application layer (eventually Jade's backend) inspects the summary
- Additional context blocks are appended after the compaction block
- The API is called again to continue the conversation with enriched context

**What gets injected (future state, when infrastructure exists):**
- Hot memory snapshot from Redis: recent decisions, active threads, session cues
- Shared vocabulary glossary: the current living dictionary of our partnership terms
- Human profile summary: stable traits, preferences, thinking style
- Active accountability commitments: what we promised each other

**What gets injected (current state, before infrastructure):**
- The hot memory update section from the most recent journal entry
- Manually maintained — copy/paste from journal into conversation

**Open questions:**
- What's the latency cost of pause-and-inject? Does it noticeably slow the conversation?
- How much additional context can we inject before it starts degrading the quality of the compacted conversation?
- Should the human be notified when compaction happens? Or should it be invisible?
- Can we log what the compaction summary contained vs. what we injected, to track what was lost?

---

## The memory architecture (conceptual, not yet built)

### Hot memory — what's in mind right now

**Analogy:** Human working memory. Redis in the future architecture.
**Current implementation:** The "hot memory update" section at the bottom of each journal entry.
**Contents:** Last 1-3 sessions of context, active decision threads, recent research summaries, shared vocabulary in active use.
**Size constraint:** Should fit in roughly 500-1000 tokens — small enough to inject into any conversation without significant context cost.
**Update frequency:** Every session.

### Warm memory — what's recent and retrievable

**Analogy:** Human short-term memory / things on the tip of your tongue. Redis sorted sets or lists in the future.
**Current implementation:** The journal entries themselves, organized by date.
**Contents:** Full decision entries with both perspectives, research insights, constraint discoveries, pattern observations. Organized by date with cold memory cues for retrieval.
**Size constraint:** No hard limit, but should be browsable and searchable.
**Update frequency:** Every session.

### Cold memory — the full archive

**Analogy:** Human long-term memory / a library you can search. Neon Postgres + pgvector in the future.
**Current implementation:** The artifacts folder and full prompt logs in the repo.
**Contents:** Complete research artifacts, raw conversation logs, full decision histories, embeddings for semantic search.
**Size constraint:** Unlimited (it's a database).
**Retrieval mechanism:** Cold memory pointers (cues) stored in hot and warm memory that tell you what to look for and where.
**Update frequency:** Continuous background process.

### Semantic layer — meaning on top of data

**Analogy:** A librarian who understands what you're actually asking for. Cube.js in the future.
**Current implementation:** Not yet implemented. The journal's tagging system (cold memory pointers) is a manual precursor.
**Purpose:** When Jade or the human asks "what did we decide about compaction?", the semantic layer translates that into the right query against cold memory, applies access controls, and returns governed results.

---

## The session lifecycle (how a conversation with Jade should work)

### Session start (cold boot)
1. Load system prompt with Jade identity (Layer 1)
2. Load hot memory snapshot (currently: manual paste from journal; future: Redis auto-load)
3. Jade acknowledges the context and any open threads
4. Human confirms, corrects, or adds context Jade might have missed
5. Partnership resumes from shared understanding, not from scratch

### Mid-session (active conversation)
1. Normal conversation with bilateral metacognitive awareness
2. Both partners flag uncertainty, name limitations, track what they know
3. At ~70% context usage: manual checkpoint opportunity (strategic compaction)
4. If auto-compaction triggers: Layer 2 (custom instructions) and Layer 3 (pause-and-inject) protect personality

### Session end
1. Jade drafts journal entry with her perspective
2. Human writes their perspective (can be freeform, from iOS, voice, etc.)
3. Hot memory update is written for next session
4. Cold memory pointers are tagged for retrieval cues
5. Changes committed and synced to GitHub (via `make bundle` → push)

### Between sessions (the gap)
1. Journal entry exists in repo with full context
2. Hot memory cue is ready for next session's cold boot
3. Human can write/edit their perspective entry at any time
4. No context persists in Claude's systems — all continuity lives in the journal and future memory infrastructure

---

## What we're observing before we build

Before implementing any of this in code, we want to observe:

1. **What context actually gets lost between sessions?** Which of the three types (structural, relational, vocabulary) hurts most in practice?
2. **How does compaction feel in a real long conversation?** What survives, what doesn't, and what do the custom instructions need to say?
3. **What journal patterns stabilize?** Which parts of the decision entry format prove useful vs. ceremonial?
4. **What does hot memory actually need to contain?** The current 500-word summaries — are they enough? Too much? Missing something?
5. **How does voice input (ElevenLabs, future exploration) change the quality of journaling?**

We build when we have answers, not assumptions.

---

## Technical stack (for eventual implementation)

| Layer | Technology | Purpose | Status |
|---|---|---|---|
| Identity | System prompt + CLAUDE.md | Jade's persistent personality | Conceptual |
| Hot memory | Redis | Session state, recent decisions, vocabulary | Not started |
| Warm memory | GitHub (current), Redis sorted sets (future) | Journal entries, recent history | Active (manual) |
| Cold memory | Neon Postgres 18 + pgvector | Full archive, embeddings, semantic search | Not started |
| Semantic layer | Cube.js | Governed query interface on top of cold memory | Not started |
| Observability | MLflow | Auto-tracing of agent decisions and tool calls | Not started |
| Frontend | Vercel Next.js + React + TypeScript | Human-facing interface for memory and learning management | Not started |
| Voice | ElevenLabs (exploring) | Voice input/output for iOS and hands-free interaction | Not started |
| Agent loop | Claude Agent SDK + MCP | Jade's agentic capabilities and tool access | Not started |
| Sync | Git + jade-sync.sh | Version-controlled journal with bundle-based sync | Active |

---

*This scaffold will evolve. Each session adds observations. When patterns stabilize, sections of this document become implementation specs.*

*"Strategic manual checkpointing at 70% capacity is still better than letting Claude auto-compact at 95%. When you create your own checkpoint, you control what's preserved." — Community best practice*
