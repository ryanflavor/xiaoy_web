# 期权交易系统 Web 端项目文档索引

## 概述

本项目是一个 **棕地前端开发项目**，旨在为现有的 Python/vnpy 期权交易系统构建全新的 Web 用户界面。项目采用 API 网关模式，确保与现有后端系统的无缝集成，同时不对后端进行任何修改。

## 项目特点

- **项目类型**: 棕地增强 (Brownfield Enhancement)
- **主要目标**: 将桌面交易应用迁移到 Web 端
- **核心约束**: 保持现有后端系统完全不变
- **关键功能**: 自然语言指令解析、实时账户监控、算法进度跟踪

## 文档结构

### 核心文档
- [项目需求文档 (PRD)](./prd.md) - 产品需求和功能规范
- [架构文档](./architecture.md) - 技术架构和系统设计
- [前端规范](./front-end-spec.md) - UI/UX 设计规范
- [项目简报](./project-brief.md) - 项目概述和背景

### 架构文档
- [架构文档索引](./architecture/index.md) - 架构文档导航
- [技术栈对齐](./architecture/3-技术栈对齐-tech-stack-alignment.md)
- [组件架构](./architecture/5-组件架构.md)
- [API 设计与集成](./architecture/6-api-设计与集成.md)

### PRD 分片文档
- [PRD 索引](./prd/index.md) - PRD 文档导航
- [需求文档](./prd/requirements.md)
- [技术约束和集成需求](./prd/technical-constraints-and-integration-requirements.md)

### 指令解析文档 🎯
- [**指令解析文档套件**](./instruction-parsing/) - 完整的指令解析实现指南
  - [业务逻辑分析](./instruction-parsing/analysis.md) - 5种解析器类型的完整分析
  - [TypeScript实现指南](./instruction-parsing/typescript-guide.md) - 生产就绪的代码示例
  - [测试数据集](./instruction-parsing/test-datasets.json) - 85+测试用例
  - [验证框架](./instruction-parsing/validation-framework.md) - Python-TypeScript一致性测试
  - [边界情况处理](./instruction-parsing/edge-cases.md) - 全面的边界条件分析

### 技术参考
- [指令解析 Python 实现](./appendices/instructions/) - 4种指令类型的参考实现
- [ZeroMQ RPC 协议](./appendices/rpc/mdp/) - 现有通信协议实现

## 快速开始

### 开发环境要求
- Node.js 18+ (前端和 API 网关)
- Python 3.10 (仅用于 API 网关中的协议适配)
- 现代浏览器 (Chrome, Firefox, Safari)

### 核心开发流程
1. 理解现有指令解析逻辑 (参考 Python 实现)
2. 实现前端指令解析器 (JavaScript/TypeScript)
3. 构建 API 网关 (Node.js + Python 子进程)
4. 开发 Web 前端界面 (Next.js + React)
5. 集成实时通信 (WebSocket)

### 关键集成点
- **指令解析**: 前端必须精确复制 Python 参考实现的逻辑
- **通信协议**: API 网关必须使用 ZeroMQ Majordomo 模式
- **数据序列化**: 与后端通信必须使用 Python pickle 格式
- **实时数据**: 通过 WebSocket 推送账户状态和算法进度

## 开发指导

### 文档阅读顺序
1. **项目理解**: 先阅读 [项目简报](./project-brief.md) 了解背景
2. **需求分析**: 详细阅读 [PRD](./prd.md) 了解功能需求
3. **技术设计**: 研读 [架构文档](./architecture.md) 了解技术方案
4. **UI/UX 规范**: 参考 [前端规范](./front-end-spec.md) 进行界面设计
5. **代码实现**: 参考技术实现文档进行编码

### 关键注意事项
- **零后端修改**: 严禁修改现有 Python 后端系统
- **指令解析精确性**: 前端指令解析必须与 Python 实现完全一致
- **实时性能**: Web 应用性能必须达到或超越桌面应用
- **安全通信**: 所有 Web 通信必须使用 HTTPS/WSS 加密

## 相关资源

- **GitHub 仓库**: [项目代码库](https://github.com/your-org/xiaoy_web)
- **设计系统**: Shadcn/ui + React Grid Layout
- **开发框架**: Next.js 14+ with TypeScript
- **状态管理**: Zustand
- **API 网关**: Node.js + Fastify + python-shell