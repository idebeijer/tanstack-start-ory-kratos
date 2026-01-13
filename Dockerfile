# Build stage
FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Build stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the TanStack Start/Nitro app
RUN bun run build

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy built output from builder
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/package.json ./

# Run as non-root user
USER bun

EXPOSE 3000

# Start the Nitro server
CMD ["bun", "run", ".output/server/index.mjs"]
