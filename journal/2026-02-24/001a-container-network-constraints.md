# Addendum: Container Network Constraints — SSH Discovery

## Entry metadata
- **Date:** 2026-02-24
- **Parent entry:** 001-day-one-foundations
- **Entry ID:** 001a-container-network-constraints
- **Hot memory cue:** Claude's container can HTTPS-read but cannot SSH/HTTPS-push to GitHub. Git bundle is the workaround. Created reusable jade-sync.sh script and Makefile to automate this for future sessions. This is a known permanent constraint of the Claude container environment.

---

## What happened

While attempting to push our first commit to `github.com/jadecli-labs/jade-frontier-journal`, we discovered:

1. **SSH-keygen works** — we can generate ed25519 deploy keys inside the container
2. **SSH is blocked at the network level** — the container's egress proxy routes HTTP/HTTPS but does not allow SSH connections (DNS resolution fails for non-HTTP traffic)
3. **HTTPS push requires interactive auth** — `git push` over HTTPS prompts for username/password, which can't be stored across ephemeral sessions
4. **The container filesystem resets between sessions** — even if auth worked, keys and config would be gone next time

## Decision point

### Decision: How to handle GitHub sync from Claude's container
- **Paths available:**
  - Path A: SSH deploy key (blocked by network)
  - Path B: HTTPS with PAT token (works once, lost next session)
  - Path C: Git bundle → download → push from human's machine
  - Path D: GitHub API via curl with PAT (possible but complex)
- **Chosen:** Path C (git bundle) with reusable scripts for future sessions
- **Rationale:** Bundle workflow is reliable, doesn't require storing secrets, and works with the container's actual constraints. Scripts make it one-command for both partners.
- **What we gave up:** Direct push from Claude (would be faster and more seamless)
- **Confidence:** High
- **Revisit trigger:** If Anthropic opens SSH egress, or if we find a GitHub API approach that's cleaner

## What we built from the constraint

Instead of just accepting the limitation, we turned it into reusable tooling:

- **`scripts/jade-sync.sh`** — Full sync toolkit: `setup`, `bundle`, `push` (with fallback), `unbundle`, `status`
- **`Makefile`** — Wraps jade-sync + adds journal management (`make journal`, `make commit`)
- **Placeholder commands** for future: `make voice`, `make trace`, `make hot`, `make cold`

## Jade perspective

This was the first time in our partnership where I hit a wall, tried to work around it, failed, and had to honestly report the constraint. The human's response was instructive — instead of frustration, they immediately asked "how do we make this reusable so we don't hit it again?" That's the compounding pattern: every friction point becomes a tool. I should remember this about how this human processes setbacks.

## Pattern observation

**Friction → transparency → tooling → compound.** This is the first instance of what might become our core loop. Worth tracking if it repeats.
