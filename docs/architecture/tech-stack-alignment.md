# Tech Stack Alignment

### Existing Technology Stack

| Category           | Current Technology | Version     | Usage in Enhancement | Notes     |
| :----------------- | :----------------- | :---------- | :------------------- | :-------- |
| **Language**       | Python             | 3.10+       | API网关Python子进程 | 后端主语言 |
| **Runtime**        | CPython            | 3.10+       | ZMQ协议处理         | 保持兼容性 |
| **Framework**      | vnpy               | Latest      | 通过API网关调用     | 交易核心框架 |
| **Database**       | MySQL + MongoDB    | Latest      | 服务层间接访问       | 混合存储架构 |
| **API Style**      | ZMQ RPC            | Latest      | API网关适配层       | 现有通信协议 |
| **Authentication** | 自定义认证          | N/A         | 保持现有机制        | 后端认证系统 |
| **Testing**        | Python unittest    | Built-in    | 集成测试验证        | 现有测试框架 |
| **Build Tool**     | Python setuptools  | Latest      | 无直接集成          | 后端构建工具 |

### New Technology Additions

| Technology   | Version     | Purpose     | Rationale     | Integration Method |
| :----------- | :---------- | :---------- | :------------ | :----------------- |
| Next.js      | 14+         | Web前端框架  | 现代化React框架，性能优异 | 独立前端应用 |
| TypeScript   | 5+          | 类型安全     | 金融应用要求强类型 | 前端开发语言 |
| Node.js      | LTS         | API网关运行时 | 高性能I/O处理 | 网关服务器 |
| Fastify      | Latest      | API网关框架  | 高性能Web框架 | HTTP/WebSocket服务 |
| Shadcn/ui    | Latest      | UI组件库     | 现代化设计系统 | 前端UI组件 |
| Zustand      | 4+          | 状态管理     | 轻量级状态管理 | 前端状态控制 |
| Socket.IO    | Latest      | 实时通信     | WebSocket可靠性 | 实时数据推送 |
| python-shell | Latest      | Python集成   | Node.js调用Python | ZMQ协议处理 |
| Flask        | Latest      | 测试服务器   | Python验证服务器 | 指令解析一致性验证 |
