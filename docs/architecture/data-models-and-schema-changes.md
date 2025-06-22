# Data Models and Schema Changes

### New Data Models

### InstructionDto

**Purpose:** 前端与API网关之间的指令传输对象
**Integration:** 基于现有Python指令解析逻辑，确保数据结构完全一致

**Key Attributes:**

- rawInput: string - 用户输入的原始指令文本
- parsedInstructions: Array<ParsedInstruction> - 解析后的标准化指令数组
- validationErrors: Array<ValidationError> - 解析过程中的错误信息
- timestamp: Date - 指令创建时间戳

**Relationships:**

- **With Existing:** 映射到现有Python指令解析引擎的输出格式
- **With New:** 关联OrderPreviewDto和AccountSelectionDto

### AccountStatusDto

**Purpose:** 虚拟账户状态的实时数据传输对象
**Integration:** 基于现有后端AccountData模型，通过ZMQ获取实时状态

**Key Attributes:**

- accountId: string - 账户唯一标识符
- accountName: string - 账户显示名称
- status: AccountStatus - 账户健康状态（正常/异常/离线）
- balance: number - 账户余额
- availableFunds: number - 可用资金
- riskRatio: number - 风险度百分比
- lastUpdate: Date - 最后更新时间

**Relationships:**

- **With Existing:** 直接映射现有AccountData数据结构
- **With New:** 用于AccountSelectionDto和OrderPreviewDto

### AlgorithmTaskDto

**Purpose:** 算法执行任务的监控数据传输对象
**Integration:** 聚合现有算法执行引擎的多个数据源

**Key Attributes:**

- portfolioId: string - 投资组合唯一标识
- taskName: string - 算法任务名称
- overallProgress: number - 总体执行进度（0-100）
- status: AlgorithmStatus - 任务状态（运行中/暂停/完成/错误）
- accountProgress: Array<AccountProgress> - 各账户执行进度
- startTime: Date - 任务开始时间
- estimatedCompletion: Date - 预计完成时间

**Relationships:**

- **With Existing:** 聚合现有算法执行数据和账户状态
- **With New:** 关联AccountStatusDto提供完整监控视图

### OrderPreviewDto

**Purpose:** 下单前的综合预览数据传输对象
**Integration:** 基于现有风险计算引擎和合约数据

**Key Attributes:**

- contractName: string - 合约名称
- direction: TradeDirection - 交易方向（买入/卖出）
- quantity: number - 交易数量
- price: number - 预计成交价格
- margin: number - 保证金要求
- greeks: GreeksData - 希腊值数据（Delta/Gamma/Theta/Vega）
- riskImpact: number - 风险影响评估
- estimatedPnL: number - 预期损益

**Relationships:**

- **With Existing:** 调用现有风险计算和定价引擎
- **With New:** 整合InstructionDto和AccountStatusDto数据

### Schema Integration Strategy

**Database Changes Required:**

- **New Tables:** 无 - 严格遵循零数据库修改原则
- **Modified Tables:** 无 - 所有现有表结构保持不变
- **New Indexes:** 无 - 不直接访问数据库
- **Migration Strategy:** 无需数据库迁移，所有数据通过现有服务API获取

**Backward Compatibility:**

- 100%向后兼容 - 新组件不影响现有数据访问模式
- 现有服务调用保持不变 - API网关作为额外客户端接入
