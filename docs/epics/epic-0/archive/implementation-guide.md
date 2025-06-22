# Epic 0 Implementation Guide

## Quick Start Implementation Plan

### **Day 1: Foundation (Story 0.1 + 0.2 Start)**

**Morning (2-3 hours):**
```bash
# Initialize Turborepo monorepo
npx create-turbo@latest xiaoy_web --package-manager npm
cd xiaoy_web

# Configure workspace structure  
mkdir -p apps/api-gateway apps/web-frontend packages/shared-types packages/instruction-parser packages/zmq-protocol tools/validation tools/scripts

# Root package.json setup
npm init -y
npm install -D turbo eslint prettier husky typescript @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

**Afternoon (3-4 hours):**
```bash
# API Gateway foundation
cd apps/api-gateway
npm init -y
npm install fastify @fastify/cors @fastify/env socket.io python-shell zod
npm install -D @types/node typescript ts-node nodemon

# Create basic server structure
mkdir -p src/{controllers,services,middleware,integrations,types}
```

### **Day 2: API Gateway + Frontend Foundation (Story 0.2 + 0.3)**

**API Gateway Completion:**
- Fastify server with health check endpoint
- Environment configuration with Zod validation
- Basic middleware (CORS, logging, error handling)
- Docker configuration

**Frontend Foundation:**
```bash
cd apps/web-frontend
npx create-next-app@14 . --typescript --tailwind --app --src-dir
npx shadcn-ui@latest init
npm install zustand socket.io-client
```

### **Day 3: Integration Testing (Story 0.4)**

**ZMQ System Integration:**
- Python subprocess integration in API Gateway
- Authentication system connection testing
- Mock services creation if needed
- Error handling implementation

### **Day 4: Shared Packages + CI/CD (Story 0.5 + 0.6)**

**Shared Packages:**
- TypeScript definitions for instruction parsing
- ZMQ protocol types
- Cross-package imports validation

**CI/CD Pipeline:**
- GitHub Actions workflows
- Docker builds
- Automated testing setup

### **Day 5: Validation + Documentation (Story 0.7)**

**Final Validation:**
- Complete development environment testing
- Documentation creation
- PO Master Checklist re-run
- Story 1.1 readiness confirmation

## Critical Implementation Commands

### **Monorepo Initialization**
```bash
# Root turbo.json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "lint": {},
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

### **API Gateway Health Check**
```typescript
// apps/api-gateway/src/server.ts
import Fastify from 'fastify'

const server = Fastify({ logger: true })

server.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})

const start = async () => {
  try {
    await server.listen({ port: 3001, host: '0.0.0.0' })
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

start()
```

### **Docker Configuration**
```dockerfile
# apps/api-gateway/Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3001
CMD ["npm", "start"]
```

## Validation Checklist

### **Epic 0 Success Criteria**
- [ ] `npm run build` works from root (all apps build successfully)
- [ ] `npm run dev` starts both API Gateway and Web Frontend
- [ ] API Gateway health check responds at http://localhost:3001/health
- [ ] Web Frontend loads at http://localhost:3000
- [ ] TypeScript compilation has zero errors
- [ ] ESLint passes with zero warnings
- [ ] Docker builds complete successfully
- [ ] CI/CD pipeline runs without errors

### **Story 1.1 Readiness Validation**
- [ ] Instruction parsing package structure exists
- [ ] WebSocket communication layer ready
- [ ] Authentication integration points defined
- [ ] Component development environment functional
- [ ] Testing framework configured for comprehensive validation

## Troubleshooting Common Issues

### **Node.js Version Conflicts**
```bash
# Use Node.js LTS
nvm install --lts
nvm use --lts
```

### **Package Installation Issues**
```bash
# Clear npm cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### **TypeScript Configuration Issues**
```bash
# Ensure consistent TypeScript version
npm install -D typescript@latest
npx tsc --version
```

### **Docker Build Issues**
```bash
# Multi-stage build for production
docker build --target production -t xiaoy-api-gateway .
docker run -p 3001:3001 xiaoy-api-gateway
```

## Post-Implementation Validation

### **Run PO Master Checklist**
After Epic 0 completion, re-run the PO Master Checklist to validate all 8 critical blockers are resolved:

1. ✅ Project Structure Exists
2. ✅ Development Environment Configured  
3. ✅ System Access Verified
4. ✅ Infrastructure Setup Complete
5. ✅ CI/CD Pipeline Operational
6. ✅ Environment Configuration Ready
7. ✅ Dependency Management Functional
8. ✅ Development Tooling Configured

### **Architecture Compliance Check**
Verify Epic 0 implementation matches brownfield architecture:
- Monorepo structure aligns with `docs/architecture/source-tree-integration.md`
- Technology stack matches `docs/architecture/tech-stack-alignment.md`
- Integration points follow `docs/architecture/api-design-and-integration.md`

---

**Next Steps After Epic 0:**
1. Re-run PO Master Checklist (expect 100% pass rate)
2. Move Story 1.1 from Draft to Approved status
3. Begin Story 1.1: Instruction Input Module development
4. Proceed with remaining Epic 1 stories with full infrastructure support