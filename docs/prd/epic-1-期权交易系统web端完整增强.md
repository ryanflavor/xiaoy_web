# Epic 1: 期权交易系统Web端完整增强

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