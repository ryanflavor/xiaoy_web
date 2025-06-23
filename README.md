# Xiaoy Web Trading System

Web-based Options Trading System Frontend - Brownfield Enhancement

## Overview

This project implements a modern web interface for an existing Python-based options trading system while preserving all backend services unchanged. The system provides real-time instruction parsing, multi-account monitoring, and algorithm execution tracking through a responsive web application.

## Architecture

- **Frontend**: Next.js 14+ with TypeScript, Shadcn/ui components
- **API Gateway**: Node.js with Fastify, Socket.IO for real-time communication  
- **Integration**: ZMQ Majordomo protocol compatibility with existing Python backend
- **Monorepo**: Turborepo with npm workspaces for organized development

## Quick Start

```bash
# Install dependencies
npm install

# Start development servers
npm run dev

# Build all packages
npm run build

# Run tests
npm run test

# Lint code
npm run lint

# Format code
npm run format
```

## Project Structure

```
xiaoy_web/
├── apps/
│   ├── api-gateway/          # Node.js API Gateway Service
│   └── web-frontend/         # Next.js Web Application
├── packages/
│   ├── shared-types/         # Shared TypeScript definitions
│   ├── instruction-parser/   # Core instruction parsing logic
│   └── zmq-protocol/         # ZMQ protocol handlers
├── tools/
│   ├── validation/           # Python-TypeScript comparison testing
│   └── scripts/              # Development and deployment scripts
└── docs/                     # Architecture and development documentation
```

## Core Features

### 1. Instruction Parsing Engine
- 4 instruction types: Vega, Single-Side Delta, Dual-Side Delta, Clear Positions
- Real-time parsing with <100ms response time
- 100% compatibility with Python reference implementations
- Comprehensive preview table with risk calculations

### 2. Multi-Account Monitoring
- Real-time account health status
- Dynamic enable/disable based on backend status
- Cross-account risk percentage calculations

### 3. Algorithm Execution Tracking
- Portfolio-grouped algorithm monitoring
- Real-time progress updates via WebSocket
- Interactive controls: Pause/Continue/Stop/End

### 4. Real-time Notifications
- Browser desktop notifications
- Audio alerts for order fills and errors
- WebSocket-based live data updates

## Development

### Prerequisites

- Node.js 18+ LTS
- npm 9+
- Python 3.10+ (for backend integration testing)

### Development Scripts

```bash
# Start development mode (all apps)
npm run dev

# Start individual apps
npm run dev --workspace=api-gateway
npm run dev --workspace=web-frontend

# Type checking
npm run type-check

# Clean build artifacts
npm run clean
```

### Testing

```bash
# Run all tests
npm run test

# Run tests for specific package
npm run test --workspace=instruction-parser

# Run integration tests
npm run test:integration
```

## Integration Requirements

### ZMQ Backend Integration

The system integrates with an existing Python trading system using:

- **Protocol**: ZeroMQ Majordomo pattern
- **Serialization**: Python pickle format (handled via Python subprocess)  
- **Communication**: Bidirectional RPC with Pub/Sub for real-time data

### Authentication

- JWT tokens for web session management
- Integration with existing SQL authentication functions
- Maintains existing permission models

### Performance Requirements

- Instruction parsing: <100ms response time
- WebSocket latency: <50ms for real-time updates
- Support for 50+ concurrent users
- Build optimization: Frontend <3s, API Gateway <5s

## Deployment

### Docker Containers

```bash
# Build containers
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f
```

### Environment Configuration

Copy `.env.example` files in each app directory and configure:

- Database connection parameters
- ZMQ broker configuration
- Authentication secrets
- API endpoints

## Contributing

### Code Standards

- TypeScript strict mode enabled
- ESLint + Prettier for code formatting
- 100% type safety required
- Comprehensive test coverage (>80%)

### Commit Guidelines

- Husky pre-commit hooks enforce linting and formatting
- Conventional commit messages preferred
- All commits must pass type checking and tests

## Documentation

- [Architecture Documentation](./docs/brownfield-architecture.md)
- [API Design Specification](./docs/architecture/api-design-and-integration.md)
- [Instruction Parsing Guide](./docs/instruction-parsing/README.md)
- [Epic 0 Documentation](./docs/epics/epic-0/README.md)

## Security

- All web communications use HTTPS/WSS encryption
- JWT-based authentication with refresh tokens
- Input validation and sanitization
- Financial trading compliance considerations

## License

UNLICENSED - Proprietary trading system

---

**Status**: Epic 0 (Infrastructure Setup) - 93% Complete  
**Next**: Story 1.1 (Instruction Input Module) Development Ready  
**Documentation**: [Epic Progress Reports](./docs/epics/)