# API Design and Integration

### New API Endpoints

**API Integration Strategy:** 混合REST+WebSocket模式，REST处理请求/响应操作，WebSocket处理实时数据推送
**Authentication:** JWT令牌认证，与现有认证系统集成
**Versioning:** API版本控制(/api/v1/)，支持未来扩展

#### 用户认证端点

- **Method:** POST
- **Endpoint:** /api/v1/auth/login
- **Purpose:** 用户身份验证，获取JWT访问令牌
- **Integration:** 调用现有认证服务验证用户凭据

**Request:**

```json
{
  "username": "string",
  "password": "string",
  "remember": boolean
}
```

**Response:**

```json
{
  "success": boolean,
  "accessToken": "string",
  "refreshToken": "string",
  "expiresIn": number,
  "user": {
    "id": "string",
    "username": "string",
    "permissions": ["string"]
  }
}
```

#### 指令解析端点

- **Method:** POST
- **Endpoint:** /api/v1/instructions/parse
- **Purpose:** 解析自然语言交易指令，返回标准化格式
- **Integration:** 前端解析引擎预处理，后端Python引擎验证

**Request:**

```json
{
  "rawInstruction": "string",
  "selectedAccounts": ["string"],
  "validateOnly": boolean
}
```

**Response:**

```json
{
  "success": boolean,
  "parsedInstructions": [
    {
      "contractName": "string",
      "direction": "buy|sell",
      "quantity": number,
      "instrumentType": "call|put|vega",
      "month": "string"
    }
  ],
  "validationErrors": ["string"],
  "previewData": "OrderPreviewDto"
}
```

#### 订单提交端点

- **Method:** POST
- **Endpoint:** /api/v1/orders
- **Purpose:** 提交交易指令，创建算法任务
- **Integration:** 调用现有订单处理服务，启动算法执行

**Request:**

```json
{
  "instructions": ["ParsedInstruction"],
  "selectedAccounts": ["string"],
  "executionParams": {
    "timeLimit": number,
    "priceSlippage": number,
    "riskLimit": number
  },
  "idempotencyKey": "string"
}
```

**Response:**

```json
{
  "success": boolean,
  "orderId": "string",
  "portfolioId": "string",
  "estimatedCompletion": "ISO8601",
  "initialStatus": "AlgorithmTaskDto"
}
```

#### 算法控制端点

- **Method:** POST
- **Endpoint:** /api/v1/algorithms/{portfolioId}/control
- **Purpose:** 控制算法执行（暂停/继续/停止）
- **Integration:** 调用现有算法控制服务

**Request:**

```json
{
  "action": "pause|resume|stop|terminate",
  "reason": "string"
}
```

**Response:**

```json
{
  "success": boolean,
  "newStatus": "AlgorithmStatus",
  "effectiveTime": "ISO8601",
  "message": "string"
}
```
