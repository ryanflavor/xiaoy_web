# 期权交易系统 Web 端棕地增强 PRD

## Intro Project Analysis and Context

### Existing Project Overview

**项目位置**: IDE 分析 - 基于现有项目文档和架构分析  
**当前项目状态**: 成熟的Python/vnpy期权交易系统，包含完整的ZeroMQ Majordomo RPC通信架构、指令解析引擎和算法交易功能。系统目前仅支持桌面客户端，需要构建Web前端以提升可访问性和部署灵活性。

### Available Documentation Analysis

**Available Documentation**:

- [x] Tech Stack Documentation - 详细的技术栈说明（Python/vnpy/ZMQ）
- [x] Source Tree/Architecture - 完整的架构文档和组件分析
- [x] Coding Standards - 基于现有Python项目的编码规范
- [x] API Documentation - ZMQ Majordomo RPC协议完整实现
- [x] External API Documentation - 期权交易所API和行情数据源
- [x] UX/UI Guidelines - 基于Shadcn/ui的现代化设计系统
- [x] Other: **指令解析Python参考实现** (5种核心指令类型)
- [x] **指令解析完整技术文档** - [完整文档套件](./instruction-parsing/) 包含85+测试用例、TypeScript实现指南、验证框架

### Enhancement Scope Definition

**Enhancement Type**: 
- [x] New Feature Addition - 全新Web前端界面
- [x] Integration with New Systems - API网关与现有ZMQ系统集成

**Enhancement Description**: 为现有Python期权交易系统构建完整的Web前端，通过API网关实现Web协议与ZMQ/Pickle协议的桥接，提供与桌面应用等价的功能体验。

**Impact Assessment**: 
- [x] Minimal Impact (isolated additions) - 对现有后端系统零影响，完全解耦的新增组件

### Goals and Background Context

#### Goals

- 构建现代化Web前端，完全复刻现有桌面应用的核心功能
- 实现指令解析的前端版本，与Python参考实现保持100%一致性（参考[指令解析文档套件](./instruction-parsing/)获取完整实现指南）
- 通过API网关无缝集成现有ZMQ/Pickle协议，确保后端零修改
- 提供实时账户监控、算法执行跟踪和桌面通知功能
- 达到或超越现有桌面应用的性能和用户体验标准

#### Background Context

现有的期权交易系统已在生产环境稳定运行，拥有成熟的业务逻辑和技术架构。随着业务需求变化，需要提供Web访问能力以支持远程交易和移动办公场景。本增强项目的关键在于在不影响现有系统稳定性的前提下，构建一个功能完整、性能优异的Web界面。

项目采用严格的"零后端修改"原则，通过API网关作为中间层实现协议适配，确保现有业务逻辑和数据流程完全不受影响。

### Change Log

| Change | Date | Version | Description | Author |
| ------ | ---- | ------- | ----------- | ------ |
| 初始创建 | 2025-06-20 | 1.0 | 基于现有项目分析创建棕地增强PRD | John (Product Manager) |
| PO验证更新 | 2025-06-20 | 1.1 | 基于PO验证结果，补充用户认证集成和指令解析一致性验证要求 | John (Product Manager) |

## Requirements

### Functional

- **FR1**: Web前端必须实现与Python参考实现完全一致的指令解析逻辑，覆盖4种核心指令类型（Vega、单向Delta、双向Delta、平仓指令）
- **FR2**: 指令输入界面必须提供实时解析预览，用户键入时即时显示标准化指令格式
- **FR3**: 综合预览表格必须包含所有关键字段：合约名称、VolM、方向、时间、档位、数量、价格、Margin、CashD、CashV、希腊值和风险度百分比
- **FR4**: 虚拟账户监控必须支持多账户复选框选择，并根据后端推送状态动态启用/禁用账户
- **FR5**: 算法监控面板必须按portfolio_id分组显示，包含总体进度和分账户进度跟踪
- **FR6**: 算法控制必须提供暂停、继续、停止操作，算法完成后显示"结束"状态
- **FR7**: 系统必须支持浏览器桌面通知和声音提醒，用于订单成交和算法事件推送

### Non Functional

- **NFR1**: 指令解析响应时间必须在100ms内，确保实时用户体验
- **NFR2**: WebSocket实时数据推送延迟必须控制在50ms内，支持算法进度和账户状态的实时更新
- **NFR3**: Web应用整体性能必须达到或超越现有桌面应用的响应速度
- **NFR4**: 系统必须支持并发多用户访问，单实例支持至少50个同时在线交易员
- **NFR5**: 前端应用必须具备离线检测和自动重连机制，确保网络异常时的用户体验

### Compatibility Requirements

- **CR1**: API网关与后端ZMQ通信必须完全遵循现有Majordomo协议规范，确保消息格式和序列化兼容性
- **CR2**: 数据库访问必须通过现有后端服务接口，严禁直接数据库连接，确保数据一致性和业务逻辑完整性
- **CR3**: 用户界面设计必须保持与现有桌面应用的操作习惯一致性，降低用户学习成本
- **CR4**: 新增API端点命名必须与现有RPC方法保持一致性，便于后续维护和扩展
- **CR5**: 用户认证必须集成现有SQL查询验证函数，确保认证逻辑的一致性和安全性

## Technical Constraints and Integration Requirements

### Existing Technology Stack

**Languages**: Python 3.10 (后端), TypeScript 5+ (新前端), Node.js LTS (API网关)
**Frameworks**: vnpy量化交易框架 (后端), Next.js 14+ (前端), Fastify (API网关)
**Database**: MySQL (用户数据), MongoDB (交易日志) - 仅通过现有服务访问
**Infrastructure**: ZeroMQ Majordomo RPC, Python pickle序列化, 分布式部署架构
**External Dependencies**: 期权交易所API, 实时行情数据源, 风险管理系统

### Integration Approach

**Database Integration Strategy**: 新Web前端通过API网关调用现有后端服务获取数据，严禁直接数据库访问，确保数据一致性和业务逻辑完整性

**API Integration Strategy**: 采用混合通信模式 - HTTPS用于请求/响应操作，WebSocket用于实时数据推送，API网关负责协议转换

**Frontend Integration Strategy**: 基于Shadcn/ui组件库构建现代化界面，保持操作流程与现有桌面应用一致，采用React Grid Layout实现可配置仪表盘

**Testing Integration Strategy**: 建立独立测试环境，通过模拟ZMQ服务进行API网关测试，前端测试覆盖指令解析逻辑一致性验证。建立Python-TypeScript指令解析对照测试框架，确保100%一致性验证

### Code Organization and Standards

**File Structure Approach**: 采用Monorepo架构，独立于现有Python代码库，包含web-frontend和api-gateway两个主要应用

**Naming Conventions**: API端点遵循RESTful规范，与现有RPC方法名保持映射关系，前端组件采用PascalCase命名

**Coding Standards**: TypeScript严格模式，ESLint+Prettier代码格式化，API网关遵循Node.js最佳实践

**Documentation Standards**: 代码注释采用TSDoc格式，API文档使用OpenAPI 3.0规范，与现有Python文档风格保持一致

### Deployment and Operations

**Build Process Integration**: 使用Docker容器化部署，Turborepo管理Monorepo构建流程，支持开发、测试、生产环境的独立配置

**Deployment Strategy**: 蓝绿部署策略，新Web前端与现有桌面应用并行运行，逐步迁移用户，确保零停机时间

**Monitoring and Logging**: 集成现有监控系统，使用统一日志格式，API网关提供健康检查端点和性能指标

**Configuration Management**: 环境变量配置与现有系统保持一致，支持开发、测试、生产环境的差异化配置

### Risk Assessment and Mitigation

**Technical Risks**: 
- 指令解析前端实现与Python版本不一致的风险
- Node.js与Python ZMQ/Pickle协议集成的兼容性风险  
- WebSocket连接稳定性对实时交易的影响风险

**Integration Risks**:
- API网关性能瓶颈可能影响整体系统响应速度
- 协议转换过程中的数据格式兼容性风险
- 现有后端服务负载增加对系统稳定性的影响

**Deployment Risks**:
- 新组件部署可能对现有系统网络和资源造成影响
- 用户从桌面应用迁移到Web应用的业务连续性风险

**Mitigation Strategies**:
- 建立Python-TypeScript指令解析对照测试框架，包含黄金标准数据集和自动化验证流程
- 使用Python子进程处理ZMQ通信，确保协议兼容性
- 集成现有SQL查询认证函数，保持认证逻辑一致性
- 实施负载均衡和故障转移机制，提升系统可用性
- 采用渐进式部署和全面监控，确保系统稳定性
- 错误恢复机制将作为MVP后的增量功能逐步完善

## Epic and Story Structure

### Epic Approach

**Epic Structure Decision**: 单一综合史诗 - 考虑到指令下单、账户监控、算法监控等功能模块高度关联，且都依赖相同的API网关和实时通信基础设施，采用单一史诗结构能够确保功能开发的连贯性和集成的一致性。

## Epic 1: 期权交易系统Web端完整增强

**Epic Goal**: 构建功能完整的Web前端和API网关，实现与现有Python期权交易系统的无缝集成，提供指令下单、账户监控、算法跟踪的完整交易体验，同时确保现有系统零修改和业务连续性。

**Integration Requirements**: API网关必须完全兼容ZMQ Majordomo协议，前端指令解析必须与Python参考实现保持100%一致性，实时数据流必须确保低延迟和高可靠性。

### Story 1.1: API网关核心框架构建

As a **开发者**,
I want **建立API网关的核心框架，包括ZMQ协议适配和HTTP/WebSocket服务**,
so that **为后续的业务功能开发提供稳定的通信基础设施**。

#### Acceptance Criteria

- AC1: API网关能够成功连接现有ZMQ Majordomo broker并发送心跳
- AC2: 实现HTTP服务器，支持CORS和JWT认证中间件
- AC3: 实现WebSocket服务器，支持客户端连接和断线重连
- AC4: 通过Python子进程成功调用现有ZMQ服务并返回pickle数据
- AC5: 建立错误处理机制，包括网络异常和协议错误的处理

#### Integration Verification

- IV1: 确认API网关连接不影响现有ZMQ系统的正常运行
- IV2: 验证Python子进程调用不会造成现有服务的性能影响
- IV3: 确保API网关故障时现有桌面客户端正常工作

### Story 1.2: 前端项目基础设置与核心布局

As a **交易员**,
I want **一个现代化的Web界面框架，包含指令区、账户区、算法监控区的布局**,
so that **我能在熟悉的界面环境中进行期权交易操作**。

#### Acceptance Criteria

- AC1: Next.js项目成功创建，包含TypeScript和Shadcn/ui配置
- AC2: 实现基于React Grid Layout的可拖拽仪表盘容器
- AC3: 创建三个核心面板组件的基础框架和占位符
- AC4: 实现响应式布局，支持不同分辨率的桌面环境
- AC5: 集成Zustand状态管理，建立全局状态架构

#### Integration Verification

- IV1: 确认前端构建流程不与现有项目产生冲突
- IV2: 验证开发环境配置与现有系统端口规划兼容
- IV3: 确保布局系统性能满足实时交易界面要求

### Story 1.3: 指令解析引擎前端移植

As a **交易员**,
I want **在Web界面中输入自然语言交易指令，并实时看到解析结果**,
so that **我能确认系统正确理解我的交易意图，避免下单错误**。

#### Acceptance Criteria

- AC1: 实现4种指令类型的TypeScript解析逻辑（Vega、单向Delta、双向Delta、平仓）
- AC2: 指令输入框支持实时解析预览，键入时即时显示结果
- AC3: 解析结果格式与Python参考实现完全一致
- AC4: 支持所有Python版本中的关键词和简化映射规则
- AC5: 建立自动化测试套件，验证与Python实现的一致性

#### Integration Verification

- IV1: 确认前端解析逻辑与Python参考实现100%一致，通过对照测试框架验证
- IV2: 验证解析性能满足实时交互要求（<100ms）
- IV3: 确保解析错误处理与现有系统行为一致
- IV4: Python验证服务器与TypeScript测试套件集成测试通过

### Story 1.4: 账户监控与选择功能

As a **交易员**,
I want **查看所有虚拟账户的状态，并能选择健康的账户进行交易**,
so that **我能确保只在正常运行的账户上执行交易指令**。

#### Acceptance Criteria

- AC1: 账户监控面板显示所有虚拟账户的基本信息
- AC2: 实现账户复选框选择功能，支持多账户同时选择
- AC3: 根据WebSocket推送的状态数据动态更新账户健康状态
- AC4: 不健康账户自动置灰并禁止选择，确保交易安全
- AC5: 显示账户关键指标：余额、可用资金、风险度等

#### Integration Verification

- IV1: 确认账户数据获取不影响现有账户管理系统
- IV2: 验证账户状态更新的实时性和准确性
- IV3: 确保账户权限验证与现有认证系统保持一致

### Story 1.5: 指令预览与风险计算

As a **交易员**,
I want **在下单前查看详细的订单预览表格，包含所有关键参数和风险指标**,
so that **我能在执行前全面评估交易的风险和收益**。

#### Acceptance Criteria

- AC1: 综合预览表格包含所有必需字段：合约名称、VolM、方向、时间、档位、数量、价格、Margin、CashD、CashV
- AC2: 实现希腊值计算和显示（Delta、Gamma、Theta、Vega）
- AC3: 计算并显示所有选中账户的综合风险度百分比
- AC4: 预览数据基于当前选择的账户和解析的指令动态生成
- AC5: 提供确认下单按钮和最终风险提示

#### Integration Verification

- IV1: 确认风险计算与现有风控模块算法保持一致
- IV2: 验证预览数据准确性，与实际下单结果匹配
- IV3: 确保预览性能满足实时交易决策要求

### Story 1.6: 实时算法监控与控制

As a **交易员**,
I want **实时监控所有算法的执行进度，并能进行暂停、继续、停止操作**,
so that **我能根据市场变化灵活管理自动化交易策略**。

#### Acceptance Criteria

- AC1: 算法监控面板按portfolio_id分组显示所有活跃算法
- AC2: 每个算法组显示总体进度和各账户的独立进度
- AC3: 实现暂停、继续、停止按钮，根据算法状态动态启用
- AC4: 算法完成后控制按钮变为"结束"状态
- AC5: 通过WebSocket实时更新算法进度和状态变化

#### Integration Verification

- IV1: 确认算法控制指令与现有算法执行引擎完全兼容
- IV2: 验证算法状态同步的实时性和准确性
- IV3: 确保算法控制不会影响其他正在运行的策略

### Story 1.7: 桌面通知与声音提醒系统

As a **交易员**,
I want **在关键事件发生时收到桌面通知和声音提醒**,
so that **即使没有专注于交易界面，我也不会错过重要的市场机会或风险事件**。

#### Acceptance Criteria

- AC1: 实现浏览器桌面通知，支持订单成交、算法完成、系统异常等事件
- AC2: 集成声音提醒系统，不同事件类型使用不同提示音
- AC3: 通知系统支持用户自定义开关和音量控制
- AC4: 通知内容包含事件详情和时间戳，支持点击跳转
- AC5: 确保通知在浏览器后台运行时正常工作

#### Integration Verification

- IV1: 确认通知触发与现有事件系统准确同步
- IV2: 验证通知系统不会影响交易界面的性能
- IV3: 确保通知权限请求符合浏览器安全标准

### Story 1.8: 系统集成测试与性能优化

As a **交易员**,
I want **一个稳定、高性能的Web交易系统**,
so that **我能放心地将其用于实际的期权交易业务**。

#### Acceptance Criteria

- AC1: 完整的端到端测试覆盖所有核心交易流程
- AC2: 性能测试确认指令解析<100ms，WebSocket延迟<50ms
- AC3: 并发测试验证系统支持50个同时在线用户
- AC4: 实现错误监控和用户反馈收集机制
- AC5: 建立生产环境部署流程和回滚策略

#### Integration Verification

- IV1: 确认Web系统与现有后端的完整兼容性
- IV2: 验证系统在高负载下的稳定性和现有服务的无影响性
- IV3: 确保灾难恢复机制和数据一致性保护