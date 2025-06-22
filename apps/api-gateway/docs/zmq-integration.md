# ZMQ Integration Documentation

## Overview

The API Gateway uses ZeroMQ (ZMQ) with the Majordomo Protocol to communicate with the existing Python trading system. This integration provides:

- **Request/Reply Pattern**: For service calls (auth, account, algorithm, instruction)
- **Pub/Sub Pattern**: For real-time updates (market data, account status, algorithm progress)
- **Automatic Failover**: Connection pooling and retry logic
- **Mock Services**: Full mock implementation for development without backend

## Architecture

```
Web Frontend <--WebSocket--> API Gateway <--ZMQ--> Python Trading System
                                  |
                                  +---> Mock ZMQ Broker (Development)
```

## Services

### 1. **Authentication Service** (`auth_service`)
- `authenticate(username, password)`: User login
- `verify_user(userId)`: Verify user exists and is active
- `change_password(userId, oldPassword, newPassword)`: Change password
- `get_user_permissions(userId)`: Get user permissions

### 2. **Account Service** (`account_service`)
- `get_accounts()`: List all virtual accounts
- `get_account(accountId)`: Get specific account details
- `get_positions(accountId)`: Get account positions
- `get_risk_metrics(accountId)`: Get risk metrics (Greeks, VaR)
- `set_account_enabled(accountId, enabled)`: Enable/disable account
- `verify_positions(accountId)`: Verify positions match broker

### 3. **Algorithm Service** (`algorithm_service`)
- `get_algorithms()`: List all algorithms
- `get_algorithm(algorithmId)`: Get specific algorithm
- `send_algorithm_command(algorithmId, command)`: Control algorithms
- `get_algorithm_logs(algorithmId)`: Get algorithm execution logs

### 4. **Instruction Service** (`instruction_service`)
- `parse_instructions(text, accounts)`: Parse natural language instructions
- `execute_instructions(instructions, accounts)`: Execute parsed instructions
- `get_execution_status(executionId)`: Get execution progress
- `cancel_execution(executionId)`: Cancel running execution

## Configuration

### Environment Variables

```bash
# ZMQ Connection
ZMQ_BROKER_URL=tcp://localhost:5555      # Majordomo broker address
ZMQ_TIMEOUT=5000                         # Request timeout (ms)
ZMQ_RETRIES=3                            # Number of retries
ZMQ_HEARTBEAT_INTERVAL=2500              # Heartbeat interval (ms)

# Python Integration
PYTHON_PATH=python3                      # Python executable
PYTHON_SCRIPT_PATH=./python-scripts      # Path to helper scripts

# Development Mode
USE_MOCK_ZMQ=true                        # Use mock services
```

## Development Setup

### 1. Install Dependencies
```bash
cd apps/api-gateway
npm install
```

### 2. Start Mock Services (Development)
```bash
# The mock broker starts automatically when USE_MOCK_ZMQ=true
npm run dev
```

### 3. Connect to Real Backend (Production)
```bash
# Set environment variables
export USE_MOCK_ZMQ=false
export ZMQ_BROKER_URL=tcp://production-broker:5555

# Start server
npm run start
```

## Protocol Details

### Message Format

The Majordomo Protocol uses multipart messages:

**Client Request**:
```
[empty, "MDPC01", service, requestId, payload]
```

**Client Reply**:
```
[empty, "MDPC01", service, requestId, result]
```

### Serialization

- **Internal (API Gateway ↔ Frontend)**: JSON
- **External (API Gateway ↔ Python)**: Python pickle via subprocess

### Error Handling

Errors are returned as `[false, error_message]` in the pickle format.

## Testing

### Unit Tests
```bash
npm test
```

### Integration Tests with Mock
```bash
# Start mock broker
npm run test:integration
```

### Manual Testing
```bash
# Test ZMQ connection
curl http://localhost:3001/health

# Test instruction parsing
curl -X POST http://localhost:3001/api/v1/instructions/parse \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "text": "双卖 500 当月 万1 的v",
    "accounts": ["account1", "account2"]
  }'
```

## WebSocket Events

### Account Updates
```javascript
// Subscribe
socket.emit('account:subscribe', { accountIds: ['account1'] });

// Receive updates
socket.on('account:update', (update) => {
  console.log('Account updated:', update);
});
```

### Algorithm Progress
```javascript
// Subscribe
socket.emit('algorithm:subscribe', { algorithmIds: ['algo1'] });

// Receive updates
socket.on('algorithm:update', (update) => {
  console.log('Algorithm progress:', update);
});
```

### Instruction Execution
```javascript
// Execute with real-time updates
socket.emit('instruction:execute', {
  instructions: parsedInstructions,
  accounts: ['account1'],
  dryRun: false
});

// Receive execution updates
socket.on('instruction:execution:update', (update) => {
  console.log('Execution update:', update);
});
```

## Troubleshooting

### Connection Issues
1. Check ZMQ broker is running: `netstat -an | grep 5555`
2. Verify Python is installed: `python3 --version`
3. Check logs: `npm run dev | grep ZMQ`

### Serialization Errors
1. Ensure pickle_helper.py is accessible
2. Check Python has required modules: `python3 -c "import pickle, json"`
3. Verify data types match Python expectations

### Performance Issues
1. Monitor pending requests: Check `/health` endpoint
2. Increase timeout if needed: `ZMQ_TIMEOUT=10000`
3. Check connection pool metrics in logs

## Mock Data

The mock services provide realistic test data:

- **Accounts**: 3 test accounts with positions and P&L
- **Algorithms**: Running, paused, and completed algorithms
- **Instructions**: Supports all 4 instruction types
- **Market Data**: Simulated price updates every 5 seconds

## Production Deployment

1. Set `USE_MOCK_ZMQ=false`
2. Configure real ZMQ broker URL
3. Ensure network connectivity to Python services
4. Set up monitoring for connection health
5. Configure appropriate timeouts for your network

## Security Considerations

1. **Authentication**: All ZMQ requests include JWT validation
2. **Network**: Use encrypted tunnels for remote ZMQ connections
3. **Serialization**: Validate all pickle data before deserialization
4. **Rate Limiting**: Applied at API Gateway level