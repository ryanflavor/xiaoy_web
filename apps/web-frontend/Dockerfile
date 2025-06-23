# Build Stage
FROM node:24-alpine AS builder

# Install dependencies for building
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy root package files for workspace
COPY package*.json ./
COPY package-lock.json ./
COPY turbo.json ./
COPY tsconfig.json ./

# Copy packages (dependencies)
COPY packages/ ./packages/

# Copy web-frontend app
COPY apps/web-frontend/ ./apps/web-frontend/

# Install dependencies
RUN npm ci

# Build the application
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build --filter=@xiaoy/web-frontend

# Production Stage
FROM node:24-alpine AS runner
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/apps/web-frontend/.next/standalone ./
COPY --from=builder /app/apps/web-frontend/.next/static ./apps/web-frontend/.next/static

# Copy public directory
COPY --from=builder /app/apps/web-frontend/public ./apps/web-frontend/public

# Set ownership to non-root user
RUN chown -R nextjs:nodejs /app

USER nextjs

# Environment variables
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1
ENV HOSTNAME 0.0.0.0
ENV PORT 3000

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); })"

CMD ["node", "apps/web-frontend/server.js"]