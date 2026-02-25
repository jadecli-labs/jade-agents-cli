# jade-frontier-journal Makefile
# Reusable commands for bilateral learning partnership management
#
# Usage:
#   make setup      — Configure session (SSH keys, git identity, connectivity test)
#   make bundle     — Create downloadable git bundle for manual sync
#   make push       — Attempt direct push (with automatic fallback)
#   make unbundle   — Clone from bundle and push (run on YOUR machine)
#   make status     — Show current session state
#   make journal    — Create a new journal entry for today
#   make commit     — Stage all changes and commit with conventional message

SHELL := /bin/bash
SCRIPTS := ./scripts
JOURNAL_DIR := ./journal
DATE := $(shell date +%Y-%m-%d)

.PHONY: setup bundle push unbundle status journal commit help \
	test test-py test-ts lint lint-py lint-ts \
	install install-py install-ts install-tools

# ──────────────────────────────────────────
# Sync commands (wraps jade-sync.sh)
# ──────────────────────────────────────────

setup:
	@bash $(SCRIPTS)/jade-sync.sh setup

bundle:
	@bash $(SCRIPTS)/jade-sync.sh bundle

push:
	@bash $(SCRIPTS)/jade-sync.sh push

unbundle:
	@bash $(SCRIPTS)/jade-sync.sh unbundle

status:
	@bash $(SCRIPTS)/jade-sync.sh status

# ──────────────────────────────────────────
# Journal commands
# ──────────────────────────────────────────

journal:
	@mkdir -p $(JOURNAL_DIR)/$(DATE)
	@NEXT=$$(ls $(JOURNAL_DIR)/$(DATE)/ 2>/dev/null | wc -l | tr -d ' '); \
	NEXT=$$((NEXT + 1)); \
	PADDED=$$(printf "%03d" $$NEXT); \
	DEST="$(JOURNAL_DIR)/$(DATE)/$${PADDED}-new-entry.md"; \
	cp templates/decision-entry.md "$$DEST"; \
	sed -i "s/YYYY-MM-DD/$(DATE)/" "$$DEST"; \
	sed -i "s/\[sequential number\]/$$NEXT/" "$$DEST"; \
	sed -i "s/\[NNN-short-slug\]/$${PADDED}-new-entry/" "$$DEST"; \
	echo "[jade] Created $$DEST — rename the slug when you know the topic"

commit:
	@read -p "Commit message (will be prefixed with 'journal: '): " MSG; \
	git add -A; \
	git commit -m "journal: $$MSG" \
		--author="alex-jadecli <jade@jadecli.com>"
	@echo "[jade] Committed. Run 'make push' or 'make bundle' to sync."

# ──────────────────────────────────────────
# Testing
# ──────────────────────────────────────────

test-py:
	uv run pytest tests/ -v --tb=short

test-ts:
	bun test

test: test-py test-ts

# ──────────────────────────────────────────
# Linting
# ──────────────────────────────────────────

lint-py:
	uv run ruff check src/ tests/

lint-ts:
	bun run tsc --noEmit

lint: lint-py lint-ts

# ──────────────────────────────────────────
# Install
# ──────────────────────────────────────────

install-py:
	uv sync

install-ts:
	bun install

install-tools:
	uv tool install ty || true

install: install-tools install-py install-ts

# ──────────────────────────────────────────
# Future commands (placeholders)
# ──────────────────────────────────────────

# make voice    — ElevenLabs voice capture + transcription (coming soon)
# make trace    — MLflow trace viewer for recent sessions (coming soon)
# make hot      — Display current hot memory snapshot (coming soon)
# make cold     — Search cold memory with cue (coming soon)

# ──────────────────────────────────────────
# Help
# ──────────────────────────────────────────

help:
	@echo "jade-frontier-journal"
	@echo ""
	@echo "Sync:"
	@echo "  make setup      Configure session (SSH, git, connectivity)"
	@echo "  make bundle     Create git bundle for download"
	@echo "  make push       Push to GitHub (SSH → HTTPS → bundle fallback)"
	@echo "  make unbundle   Clone from bundle + push (on your machine)"
	@echo "  make status     Session state overview"
	@echo ""
	@echo "Journal:"
	@echo "  make journal    Create new entry from template for today"
	@echo "  make commit     Stage all + commit with message"
	@echo ""
	@echo "Dev:"
	@echo "  make test        Run all tests (Python + TypeScript)"
	@echo "  make test-py     Run Python tests only"
	@echo "  make test-ts     Run TypeScript tests only"
	@echo "  make lint        Run all linters (ruff + tsc)"
	@echo "  make install     Install all dependencies"
	@echo ""
	@echo "Coming soon:"
	@echo "  make voice      ElevenLabs voice capture"
	@echo "  make trace      MLflow trace viewer"
	@echo "  make hot        Hot memory snapshot"
	@echo "  make cold       Cold memory search"
