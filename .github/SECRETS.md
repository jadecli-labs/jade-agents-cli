# GitHub Secrets Setup

Required secrets for full CI/CD and cloud deployment.

## Required Secrets (Settings → Secrets and variables → Actions)

### Anthropic (Claude Code Action + API)
- `ANTHROPIC_API_KEY` — From https://console.anthropic.com/settings/keys

### Neon (PostgreSQL + pgvector)
- `NEON_API_KEY` — From https://console.neon.tech → Account Settings → API Keys

### Neon (Repository Variable, not Secret)
- `NEON_PROJECT_ID` — From https://console.neon.tech → Project Settings
  - Set as **variable** (Settings → Secrets and variables → Actions → Variables tab)

### Vercel
- `VERCEL_TOKEN` — From https://vercel.com/account/tokens
- `VERCEL_ORG_ID` — From `.vercel/project.json` after `vercel link`
- `VERCEL_PROJECT_ID` — From `.vercel/project.json` after `vercel link`

### Cloudflare
- `CLOUDFLARE_API_TOKEN` — From https://dash.cloudflare.com/profile/api-tokens
  - Permission: "Edit Cloudflare Workers"
- `CLOUDFLARE_ACCOUNT_ID` — From Cloudflare dashboard sidebar

### Upstash Redis (set in Vercel/Cloudflare env, not GitHub)
- `UPSTASH_REDIS_REST_URL` — From https://console.upstash.com
- `UPSTASH_REDIS_REST_TOKEN` — From https://console.upstash.com

### Langfuse (set in Vercel/Cloudflare env, not GitHub)
- `LANGFUSE_PUBLIC_KEY` — From https://cloud.langfuse.com
- `LANGFUSE_SECRET_KEY` — From https://cloud.langfuse.com

## Quick Setup Checklist

1. [ ] Create Neon project → get `NEON_API_KEY` + `NEON_PROJECT_ID`
2. [ ] Create Upstash Redis database → get `UPSTASH_REDIS_REST_URL` + token
3. [ ] Create Langfuse account → get public + secret keys
4. [ ] Create Vercel project (`vercel link`) → get org + project IDs
5. [ ] Create Cloudflare API token → get token + account ID
6. [ ] Add all secrets to GitHub repo settings
7. [ ] Set Neon + Upstash + Langfuse env vars in Vercel project settings
8. [ ] Set secrets in Cloudflare Worker via `wrangler secret put`
