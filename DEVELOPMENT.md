# Development Setup Guide

**Xiaoy Web Options Trading System**

## Prerequisites

- **Node.js**: v18+ (v20 recommended)
- **npm**: v9+
- **Git**: Latest version
- **Docker**: Latest version
- **Python**: v3.10+ (for ZMQ integration)

**System Requirements:** 8GB+ RAM, 10GB storage

## Quick Start

```bash
# 1. Clone and install
git clone <repo-url>
cd xiaoy_web
npm install

# 2. Environment setup
cp apps/api-gateway/.env.example apps/api-gateway/.env
cp apps/web-frontend/.env.local.example apps/web-frontend/.env.local

# 3. Start development
npm run dev

# 4. Verify setup
npm run validate:env
```

## Environment Configuration

### API Gateway (apps/api-gateway/.env)
```env
NODE_ENV=development
PORT=3001
USE_MOCK_ZMQ=true
JWT_SECRET=development-secret
CORS_ORIGIN=http://localhost:3000
```

### Frontend (apps/web-frontend/.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXT_PUBLIC_ENABLE_DEBUG=true
```

## Development Commands

```bash
# Development
npm run dev              # Start all servers
npm run dev:api          # API Gateway only
npm run dev:web          # Frontend only

# Building
npm run build            # Build all packages
npm run type-check       # TypeScript validation

# Testing
npm run test             # Run all tests
npm run lint             # Code quality checks
npm run validate:env     # Environment validation

# Utilities
npm run clean            # Clean build artifacts
npm run reset            # Clean and reinstall
```

## Development Servers

**After `npm run dev`:**
- **API Gateway:** http://localhost:3001
- **Web Frontend:** http://localhost:3000
- **API Docs:** http://localhost:3001/docs

**Hot Reload:** ✅ Automatic for all changes

## Testing

### Quick Tests
```bash
# Health check
curl http://localhost:3001/health

# Login test
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "trader1", "password": "password123"}'

# Frontend: Visit http://localhost:3000
# ✅ Page loads, API connected, WebSocket online
```

## Troubleshooting

### Common Issues

```bash
# Port conflicts
npx kill-port 3000 3001

# Clean install
npm run reset

# TypeScript errors
npm run type-check

# ZMQ issues (use mock)
USE_MOCK_ZMQ=true npm run dev
```

## Validation Checklist

**Run automated validation:**
```bash
npm run validate:env
```

**Manual checks:**
- [ ] Node.js v18+ installed
- [ ] npm install successful
- [ ] API Gateway starts (port 3001)
- [ ] Frontend starts (port 3000)
- [ ] Health check responds: `curl localhost:3001/health`
- [ ] Hot reload working

## Performance Targets

- **API Response:** < 100ms
- **Frontend Load:** < 3 seconds
- **Build Time:** < 60 seconds
- **Hot Reload:** < 2 seconds

## Additional Resources

- **Architecture:** [docs/brownfield-architecture.md](./docs/brownfield-architecture.md)
- **Epic 0 Report:** [docs/epics/epic-0/completion-report.md](./docs/epics/epic-0/completion-report.md)
- **API Gateway:** [apps/api-gateway/README.md](./apps/api-gateway/README.md)
- **Frontend:** [apps/web-frontend/README.md](./apps/web-frontend/README.md)

---

**Status:** ✅ Epic 0 Complete - Ready for Epic 1 Development  
**Last Updated:** 2025-06-23