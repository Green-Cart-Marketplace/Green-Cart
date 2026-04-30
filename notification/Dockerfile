# Multi-stage build for Notification Service
# Stage 1: Builder
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including devDeps for build)
RUN npm ci --ignore-scripts

# Copy source code and build
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npm run build

# Stage 2: Runtime
FROM node:22-alpine AS runner

WORKDIR /app

# Create app user (non-root)
RUN addgroup -S app && adduser -S app -G app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Copy compiled code from builder
COPY --from=builder /app/dist ./dist

# Install curl for health checks (before switching to non-root user)
RUN apk add --no-cache curl

# Switch to app user
USER app

# Expose port
EXPOSE 5005
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:5005/health || exit 1

# Start service
CMD ["node", "dist/index.js"]
