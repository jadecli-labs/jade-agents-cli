#!/usr/bin/env bash
# PostToolUse hook: auto-format after Write|Edit
# Matches Anthropic's pattern: format on every edit to avoid CI failures later.
set -euo pipefail

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ] || [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

case "$FILE_PATH" in
  *.py)
    uv run ruff check --fix "$FILE_PATH" 2>/dev/null || true
    uv run ruff format "$FILE_PATH" 2>/dev/null || true
    ;;
esac

exit 0
