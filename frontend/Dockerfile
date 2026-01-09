# Build stage - use native platform for building
FROM --platform=$BUILDPLATFORM oven/bun:1 AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source files
COPY . .

# Set backend URL for build time (Kubernetes service name)
ENV BACKEND_URL=http://anonymspace-backend:3001

# Build the application
RUN bun run build

# Production stage - target amd64
FROM --platform=linux/amd64 oven/bun:1 AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy built assets
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["bun", "server.js"]
