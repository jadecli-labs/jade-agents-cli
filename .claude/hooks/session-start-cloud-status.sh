#!/usr/bin/env bash
# SessionStart hook: Cloud services status check
# Outputs current state of all cloud service configurations so Claude
# has context on what's working and what still needs setup.

set -euo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"

echo "=== Jade Frontier Journal — Cloud Services Status ==="
echo ""

# --- GitHub Marketplace Apps (installed on org) ---
echo "## GitHub Marketplace Apps (jadecli-labs org)"
echo "  [installed] Claude (Anthropic) — PR review via claude-code-action"
echo "  [installed] Cloudflare Workers and Pages — auto-deploy"
echo "  [installed] Neon — DB branching per PR"
echo "  [installed] Vercel — preview + production deploys"
echo "  [installed] Vercel Toolbar"
echo "  [n/a] Upstash — no GitHub App exists, configured via API keys"
echo "  [n/a] Langfuse — no GitHub App exists, configured via API keys"
echo ""

# --- Check .env file ---
echo "## Local Environment (.env)"
if [ -f "$PROJECT_DIR/.env" ]; then
    echo "  .env file: EXISTS"

    check_env_var() {
        local var_name="$1"
        local label="$2"
        local value
        value=$(grep "^${var_name}=" "$PROJECT_DIR/.env" 2>/dev/null | cut -d'=' -f2- | tr -d '[:space:]')
        if [ -n "$value" ] && [ "$value" != "" ]; then
            echo "  [configured] $label ($var_name)"
        else
            echo "  [MISSING]    $label ($var_name)"
        fi
    }

    check_env_var "ANTHROPIC_API_KEY" "Anthropic API Key"
    check_env_var "NEON_DATABASE_URL" "Neon Database URL"
    check_env_var "NEON_API_KEY" "Neon API Key"
    check_env_var "UPSTASH_REDIS_REST_URL" "Upstash Redis URL"
    check_env_var "UPSTASH_REDIS_REST_TOKEN" "Upstash Redis Token"
    check_env_var "LANGFUSE_PUBLIC_KEY" "Langfuse Public Key"
    check_env_var "LANGFUSE_SECRET_KEY" "Langfuse Secret Key"
    check_env_var "LANGFUSE_HOST" "Langfuse Host"
    check_env_var "CUBE_API_URL" "Cube.js API URL"
    check_env_var "CUBE_API_KEY" "Cube.js API Key"
else
    echo "  .env file: MISSING (copy env.template to .env and fill in values)"
fi
echo ""

# --- Check GitHub Actions workflows ---
echo "## GitHub Actions Workflows"
for workflow in ci claude cloudflare-deploy neon-branch preview; do
    if [ -f "$PROJECT_DIR/.github/workflows/${workflow}.yml" ]; then
        echo "  [exists] ${workflow}.yml"
    else
        echo "  [MISSING] ${workflow}.yml"
    fi
done
echo ""

# --- Check deployment configs ---
echo "## Deployment Configs"
for config_file in vercel.json wrangler.toml Dockerfile docker-compose.yml drizzle.config.ts; do
    if [ -f "$PROJECT_DIR/$config_file" ]; then
        echo "  [exists] $config_file"
    else
        echo "  [MISSING] $config_file"
    fi
done
echo ""

# --- Check cloud client implementations ---
echo "## Cloud Client Implementations"
declare -A clients=(
    ["ts/db/schema.ts"]="Neon/Drizzle schema"
    ["ts/db/client.ts"]="Neon serverless client"
    ["ts/memory/upstash-hot.ts"]="Upstash Redis client"
    ["ts/observability/langfuse-tracing.ts"]="Langfuse TS client"
    ["src/jade/observability/langfuse_tracing.py"]="Langfuse Python client"
    ["worker/index.ts"]="Cloudflare MCP Worker"
    ["api/health.ts"]="Vercel health endpoint"
    ["api/graph.ts"]="Vercel graph endpoint"
)
for file in "${!clients[@]}"; do
    if [ -f "$PROJECT_DIR/$file" ]; then
        echo "  [exists] ${clients[$file]} ($file)"
    else
        echo "  [MISSING] ${clients[$file]} ($file)"
    fi
done
echo ""

# --- Test status ---
echo "## Test Suite (last known: 288 tests — 140 Python + 148 TypeScript)"
echo ""

# --- Action items ---
echo "## Setup Actions Needed"
ACTIONS_NEEDED=0

if [ ! -f "$PROJECT_DIR/.env" ]; then
    echo "  1. cp env.template .env  (create local env file)"
    ACTIONS_NEEDED=$((ACTIONS_NEEDED + 1))
else
    for var in ANTHROPIC_API_KEY NEON_DATABASE_URL UPSTASH_REDIS_REST_URL UPSTASH_REDIS_REST_TOKEN LANGFUSE_PUBLIC_KEY LANGFUSE_SECRET_KEY; do
        value=$(grep "^${var}=" "$PROJECT_DIR/.env" 2>/dev/null | cut -d'=' -f2- | tr -d '[:space:]')
        if [ -z "$value" ]; then
            ACTIONS_NEEDED=$((ACTIONS_NEEDED + 1))
        fi
    done
fi

if [ "$ACTIONS_NEEDED" -eq 0 ]; then
    echo "  All local credentials configured!"
else
    echo "  $ACTIONS_NEEDED credential(s) still need configuration."
    echo "  See: .github/SECRETS.md for full setup guide"
    echo "  Services to sign up for:"
    if [ -f "$PROJECT_DIR/.env" ]; then
        for check in "UPSTASH_REDIS_REST_URL:Upstash Redis:https://console.upstash.com" "LANGFUSE_PUBLIC_KEY:Langfuse:https://cloud.langfuse.com" "NEON_DATABASE_URL:Neon PostgreSQL:https://console.neon.tech" "ANTHROPIC_API_KEY:Anthropic:https://console.anthropic.com/settings/keys"; do
            var=$(echo "$check" | cut -d: -f1)
            label=$(echo "$check" | cut -d: -f2)
            url=$(echo "$check" | cut -d: -f3-)
            value=$(grep "^${var}=" "$PROJECT_DIR/.env" 2>/dev/null | cut -d'=' -f2- | tr -d '[:space:]')
            if [ -z "$value" ]; then
                echo "    - $label → $url"
            fi
        done
    fi
fi
echo ""
echo "=== End Cloud Status ==="
