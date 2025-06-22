# Introduction

本文档为期权交易系统Web端棕地增强项目提供全面的技术架构设计。主要目标是为现有的Python/vnpy分布式后端系统构建一个全新的、高性能的Web前端，同时确保不对现有后端服务进行任何修改。本文档将作为AI驱动开发的权威技术指南。

**Relationship to Existing Architecture:**
本文档补充现有项目架构，定义新组件如何与当前系统无缝集成。当新旧模式存在冲突时，本文档提供保持一致性的指导原则，同时确保增强功能的成功实施。

### Existing Project Analysis

基于对现有项目文档、代码结构和业务逻辑的深入分析，我识别出以下关键系统特征：

**Current Project State:**

- **Primary Purpose:** 成熟的Python期权交易系统，支持复杂的算法交易、实时指令解析和多账户管理
- **Current Tech Stack:** Python 3.10 + vnpy框架 + ZeroMQ Majordomo RPC + MySQL/MongoDB
- **Architecture Style:** 分布式微服务架构，采用RPC通信和Pub/Sub实时数据推送
- **Deployment Method:** 生产环境分布式部署，桌面客户端直连ZMQ broker

**Available Documentation:**

- 完整的PRD和架构文档，包含技术约束和集成需求
- ZMQ Majordomo协议完整实现（docs/appendices/rpc/mdp/）
- 4种核心指令类型的Python参考实现（docs/appendices/instructions/）
- 现有技术栈和数据库架构详细说明

**Identified Constraints:**

- **绝对约束**: 现有后端系统、业务逻辑、数据库结构零修改
- **协议约束**: 必须完全兼容ZMQ Majordomo RPC和Python pickle序列化
- **性能约束**: Web应用性能必须达到或超越现有桌面应用
- **安全约束**: 所有Web通信必须使用HTTPS/WSS加密

### Change Log

| Change | Date | Version | Description | Author |
| ------ | ---- | ------- | ----------- | ------ |
| 初始创建 | 2025-06-20 | 1.0 | 基于棕地PRD创建架构文档 | Winston (Architect) |
| PO验证更新 | 2025-06-20 | 1.1 | 基于PO验证反馈，补充认证集成方案和指令解析一致性验证架构 | Winston (Architect) |

