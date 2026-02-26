# Multi-stage build for Jade
# Stage 1: Python base
FROM python:3.13-slim AS python-base
WORKDIR /app
COPY pyproject.toml ./
RUN pip install uv && uv sync --no-dev
COPY src/ ./src/

# Stage 2: Bun/TypeScript base
FROM oven/bun:1.3 AS bun-base
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production
COPY ts/ ./ts/
COPY api/ ./api/
COPY worker/ ./worker/

# Stage 3: Production image
FROM oven/bun:1.3-slim AS production
WORKDIR /app

# Create non-root user
RUN addgroup --system jade && adduser --system --ingroup jade jade

# Copy Python runtime
COPY --from=python-base /usr/local /usr/local
COPY --from=python-base /app/src ./src
COPY --from=python-base /app/.venv ./.venv

# Copy Bun runtime
COPY --from=bun-base /app/node_modules ./node_modules
COPY --from=bun-base /app/ts ./ts
COPY --from=bun-base /app/api ./api
COPY --from=bun-base /app/worker ./worker

COPY package.json tsconfig.json ./

# Switch to non-root user
USER jade

EXPOSE 3000

CMD ["bun", "run", "api/health.ts"]
