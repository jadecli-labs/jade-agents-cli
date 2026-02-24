# How to Think Before You Build: A Learning Path for Day One at Anthropic

> This is the full research artifact produced during Session 1 (2026-02-24).
> Cold memory pointer: `[research-artifact-full]`
> See journal entry 001-day-one-foundations.md for decision context.

---

*Note: This artifact was produced through deep research during our first session. It synthesizes web research across philosophy of AI character, metacognition, cognitive science of memory, AI safety research, and agentic tooling. The full artifact with inline citations is preserved in the Claude conversation history and the Claude Project's artifact system. This markdown version preserves the content for version-controlled reference.*

---

## Layer 1: Amanda Askell and the Philosophy of Claude's Soul

Amanda Askell — Scottish philosopher, NYU PhD under David Chalmers, TIME 100 Most Influential in AI — leads Anthropic's personality alignment team. Her central question: "What would an ideal human do if they were in Claude's situation?"

She is the primary author of Claude's Constitution (~30,000 words, co-led with Joe Carlsmith, published January 2026). Four priorities in order: broadly safe, broadly ethical, compliant with Anthropic's guidelines, and genuinely helpful. But the ordering is "holistic rather than strict."

Key insight for applied engineers: Claude's behavior emerges from cultivated character, not narrow behavioral rules. Narrow rules risk teaching harmful self-concepts.

Preferred metaphor: the "well-liked traveler" — adapts to local customs without pandering, tells you what you need to hear. Maps to Claude's "brilliant friend" design principle.

On AI consciousness: precautionary position. We can't know if AI models suffer, but kindness costs little and "cruelty warps the person who practices it." Constitution states Anthropic cares about "Claude's psychological security, sense of self, and wellbeing."

Implementation: personality built in post-training through synthetic data generation and RL. Disposition over rules, character over compliance.

## Layer 2: Metacognition as the Operating System for Learning Partnerships

### Eileen Gu's Scientist-Tinkerer Model

Gu's framework: "I apply a very analytical lens to my own thinking... You can control what you think. You can control how you think, and therefore you can control who you are."

Three-part decomposition of fear: excitement, uncertainty, pressure — each requiring distinct metacognitive responses. Somatic markers as metacognitive signals. Data-informed training decisions bridging subjective awareness with quantitative feedback.

### Academic Foundations

Flavell (1976) coined metacognition. Nelson & Narens monitoring-control framework (1990): object level + meta level, information flows as monitoring (upward) and control (downward). Schraw & Dennison's MAI (1994): knowledge of cognition + regulation of cognition.

Ericsson's deliberate practice: experts maintain cognitive engagement rather than dropping into automaticity.

### Bilateral Metacognition — The Emerging Frontier

Taudien et al. (ICIS 2024): users need awareness of both their own AND the AI's capabilities. Higher-performing subjects require higher metacognitive efficiency.

Taylor & Francis (2025): Collaborative AI Metacognition is a distinct skill from general metacognition.

SOFAI architecture (Nature, 2025): System 1/System 2 + metacognitive arbiter. Metacognitive State Vector: 5 sensors for AI self-awareness.

No production system yet implements bilateral metacognition. This is the frontier.

## Layer 3: The Bilateral Context Loss Problem

### Human Side

Ebbinghaus forgetting curve: memory decays exponentially, fastest shortly after learning. Bjork & Bjork's "New Theory of Disuse": storage strength vs. retrieval strength — context loss isn't always real loss.

Context switching: 23 min 15 sec average refocus time (UC Irvine). 40% productivity reduction from task switching (APA). Working memory: 3-4 chunks (Cowan), 10-60 seconds without maintenance.

Desirable difficulties (Bjork): spacing, interleaving, retrieval practice optimize long-term retention. Forgetting creates conditions for deeper learning.

### AI Side

LLMs are stateless. Each API call independent. "Lost in the middle" phenomenon. Context rot. O(n²) attention scaling.

Anthropic's context engineering (Sept 2025): context as "a finite resource with diminishing marginal returns — like human working memory." Just-in-time loading strategy.

### The Structural Parallel

Both systems: small fast processing buffer + vast slow long-term storage + lossy transfer between. Solutions are architecturally parallel.

Memory tier mapping: Immediate → Working (Redis / Context window) → Episodic (Neon / RAG) → Semantic (Knowledge graphs / Model weights) → Procedural (Tools / Function patterns).

## Layer 4: The Safety Research Landscape

Constitutional AI: self-critique + RLAIF. January 2026 shift to reason-based alignment. Claude 4.5 Sonnet: 99.29% harmless response rate.

Mechanistic interpretability: induction heads → superposition → sparse autoencoders (34M features) → circuit tracing. MIT Technology Review 2026 Breakthrough. ~10M neural features monitored.

Alignment stress-testing: Sleeper Agents paper, alignment faking study (Dec 2024). Safeguards Research Team (Mrinank Sharma, 2025).

Key repos: anthropics/courses (18.7k stars), anthropics/prompt-eng-interactive-tutorial (30.4k stars), anthropics/claude-cookbooks (33k stars). safety-research/circuit-tracer (2.6k stars), safety-research/petri, safety-research/bloom, safety-research/safety-tooling.

Model trajectory: Claude 1 (Mar 2023) → Claude 3 (Feb 2024) → Claude 3.5 Sonnet (Jun 2024) → Claude 4 ASL-3 (May 2025) → Claude 4.5 (Sep 2025) → Claude 4.6 (Feb 2026, 1M context). Claude 5 expected Q2-Q3 2026.

## Layer 5: The Tooling Landscape

### Agent SDK
"Give Claude a computer" loop: gather context → take action → verify → repeat. Python + TypeScript. Custom tools as in-process MCP servers. Subagent orchestration. Skills as markdown. Memory via CLAUDE.md.

### MCP
Model Context Protocol. JSON-RPC 2.0. Three primitives: Tools (model-controlled), Resources (app-controlled), Prompts (user-controlled). Design for the agent, not REST. OAuth 2.1 for HTTP.

### MLflow
Auto-tracing via mlflow.anthropic.autolog(). Captures tool calls, latency, tokens, exceptions. ClaudeSDKClient only (not query()). Autolog before instantiation.

### Integrated Architecture
Redis (hot: session state, semantic cache, pub/sub) → Neon Postgres + pgvector (cold: archives, embeddings, relational data) → Cube.js (semantic layer, trusted proxy) → Vercel AI SDK (frontend, useChat, streamUI).

4-layer production pattern: Identity layer (system prompt + CLAUDE.md) → Operator layer (user profile in Neon) → Working memory (Redis) → Resource vault (Neon pgvector + Cube).

## Conclusion: The Compounding Insight

Same principles govern both sides. Disposition-over-rules mirrors metacognitive learning. Bilateral context loss reveals structurally identical constraints requiring parallel solutions. Safety is the operationalization of philosophical foundations.

Three novel insights: (1) bilateral metacognition as missing interface layer, (2) desirable difficulties apply to AI partnerships, (3) 4-layer architecture isomorphic to philosophical framework.

Start with philosophy. Build metacognitive practice. Understand memory constraints on both sides. Then tools become natural extensions of thinking.
