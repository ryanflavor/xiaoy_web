# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a brownfield development project for a **Web-based Options Trading System Frontend**. The project aims to create a modern web interface for an existing Python-based options trading system while preserving all backend services unchanged.

### Key Architecture Components

- **Backend**: Existing Python system using vnpy framework with ZeroMQ Majordomo pattern RPC communication
- **Frontend**: New web application (to be built) that replicates desktop functionality
- **API Gateway**: Required middleware layer to bridge web protocols (REST/WebSocket) with existing ZMQ RPC services
- **Real-time Communication**: WebSocket connections for live data feeds (account status, algorithm progress, notifications)

## Core Business Logic - Instruction Parsing

The system's most critical feature is **instruction parsing** - converting natural language trading commands into structured orders. There are 4 main instruction types, each with Python reference implementations:

### 1. Vega Instructions (`docs/appendices/instructions/vega_case1.py`)
- Pattern: `"双买/双卖 [标的] [月份] [敞口] 的v"`
- Example: `"双卖 500 当月 万1 的v"` → `["沪500 当月 万1 双卖vega"]`
- Handles volatility-based strategies

### 2. Single-Side Delta (`docs/appendices/instructions/delta_case1.py`)
- Pattern: `"买/卖 [标的] [月份] [敞口] 的c/p"`
- Example: `"500 卖出 当月 万1 的p"` → `["沪500 当月 万1 卖put"]`
- Handles directional option trades

### 3. Dual-Side Delta (`docs/appendices/instructions/delta_case2.py`)
- Pattern: `"[标的] 有买有卖 调正/调负 [敞口] 的d"`
- Example: `"500 有买有卖 调正万1 的d"` → `["沪500 当月 万1 call"]`
- Handles delta-neutral adjustments

### 4. Clear/Close Positions (`docs/appendices/instructions/clear_case1.py`)
- Pattern: `"[标的] [行权价]c/p 平/清 [比例]%"`
- Example: `"500 5.5c 平20%"` → `["沪500 当月 call-5.5 平20%"]`
- Handles position closures

### Parsing Logic Rules
- **Target Expansion**: `"500"` → `["沪500", "深500"]` when multiple exposures present
- **Default Month**: Missing month defaults to `"当月"` (current month)
- **"各" Keyword**: Applies same exposure across multiple months/targets
- **Simplified Mappings**: `"50"` → `"沪50"`, `"80"` → `"科创80"`, etc.

## Frontend Requirements (MVP Scope)

### 1. Instruction Input Module
- Real-time instruction parsing with live preview
- Load recent instruction history
- Comprehensive preview table with columns: `合约名称`, `VolM`, `方向`, `时间`, `档位`, `数量`, `价格`, `Margin`, `CashD`, `CashV`
- Cross-account risk percentage summary

### 2. Virtual Account Monitoring
- Account list with checkboxes for selection
- Dynamic enabling/disabling based on backend health status
- Real-time "online status" and "position verification" indicators

### 3. Algorithm Monitoring
- Group algorithms by `portfolio_id`
- Show total progress and per-account progress
- Interactive controls: "Pause", "Continue", "Stop", "End" (when 100% complete)

### 4. Notification System
- Browser desktop notifications for critical events
- Audio alerts for order fills and errors

## Communication Architecture

### Backend RPC (Existing - Do Not Modify)
- **Protocol**: ZeroMQ Majordomo pattern (`docs/appendices/rpc/mdp/`)
- **Serialization**: Python pickle format
- **Pattern**: Client-Broker-Worker with Pub/Sub for real-time data

### Required API Gateway (To Be Built)
- Acts as ZMQ client to existing backend
- Exposes REST/GraphQL endpoints for web frontend
- Maintains WebSocket connections for real-time data streaming
- Translates between web-friendly JSON and backend pickle protocols

## Development Notes

- **Critical**: Frontend instruction parsing must exactly match Python reference implementations
- **No Backend Changes**: Existing services, database schema, and business logic remain unchanged
- **Compatibility**: All API gateway communications with backend must use existing ZMQ protocols
- **Performance**: Web application response times should match or exceed desktop application
- **Security**: All web communications must use HTTPS/WSS encryption

## Project Context

This is a complete frontend replacement project - the existing desktop application will be replaced by a browser-based interface. The web application must provide 100% functional parity with the current desktop system while offering improved accessibility and deployment flexibility.