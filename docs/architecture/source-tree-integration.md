# Source Tree Integration

### Existing Project Structure

```plaintext
xiaoy_web/
├── docs/                           # 现有项目文档
│   ├── prd.md
│   ├── architecture.md
│   └── appendices/
├── CLAUDE.md                       # 项目指导文档
└── .bmad-core/                    # BMAD工作流配置
```

### New File Organization

```plaintext
xiaoy_web/
├── docs/                           # 现有文档 + 新增棕地文档
│   ├── brownfield-prd.md          # 新增棕地PRD
│   ├── brownfield-architecture.md  # 新增棕地架构文档
├── apps/                           # 新增应用目录
│   ├── web-frontend/               # Next.js Web前端应用
│   │   ├── src/
│   │   │   ├── app/               # App Router页面
│   │   │   ├── components/        # React组件
│   │   │   ├── lib/               # 工具函数和配置
│   │   │   ├── hooks/             # 自定义React Hooks
│   │   │   └── types/             # TypeScript类型定义
│   │   ├── public/                # 静态资源
│   │   ├── package.json
│   │   └── Dockerfile
│   └── api-gateway/               # Node.js API网关应用
│       ├── src/
│       │   ├── routes/            # API路由定义
│       │   ├── services/          # 业务逻辑服务
│       │   ├── middleware/        # 中间件
│       │   ├── python/            # Python子进程脚本
│       │   └── types/             # TypeScript类型定义
│       ├── package.json
│       └── Dockerfile
├── packages/                      # 共享包目录
│   ├── shared-types/              # 共享TypeScript类型
│   └── config/                    # 共享配置
├── tools/                         # 开发工具
│   ├── scripts/                   # 构建和部署脚本
│   └── docker/                    # Docker配置
├── docker-compose.yml             # 开发环境编排
├── turbo.json                     # Turborepo配置
└── package.json                   # 根包配置
```

### Integration Guidelines

- **File Naming:** PascalCase用于React组件，camelCase用于函数和变量，kebab-case用于文件名
- **Folder Organization:** 按功能模块组织，每个模块包含组件、hooks、类型和测试
- **Import/Export Patterns:** 使用绝对路径导入，统一的barrel exports，避免循环依赖
