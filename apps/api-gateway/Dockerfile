# Multi-stage Docker build for API Gateway

# Stage 1: Build stage
FROM node:24-alpine AS builder

# Set working directory
WORKDIR /app

# Copy root package files for workspace
COPY package*.json ./
COPY package-lock.json ./
COPY turbo.json ./
COPY tsconfig.json ./

# Copy packages (dependencies)
COPY packages/ ./packages/

# Copy api-gateway app
COPY apps/api-gateway/ ./apps/api-gateway/

# Install dependencies (including dev dependencies for build)
RUN npm ci

# Build the api-gateway
RUN npm run build --filter=@xiaoy/api-gateway

# Stage 2: Production stage
FROM node:24-alpine AS production

# Install Python for ZMQ integration (required for python-shell)
RUN apk add --no-cache python3 py3-pip

# Create app directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S apigateway -u 1001

# Copy package files
COPY apps/api-gateway/package*.json ./

# Install only production dependencies
RUN npm install --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/apps/api-gateway/dist ./dist

# Copy environment example (can be overridden at runtime)
COPY apps/api-gateway/.env.example ./.env.example

# Copy Python scripts for ZMQ integration
COPY apps/api-gateway/python-scripts ./python-scripts

# Create necessary directories
RUN mkdir -p /app/python-scripts && \
    chown -R apigateway:nodejs /app

# Switch to non-root user
USER apigateway

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Start the application
CMD ["npm", "start"]