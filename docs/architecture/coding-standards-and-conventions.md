# Coding Standards and Conventions

### Existing Standards Compliance

**Code Style:** 遵循现有Python PEP8规范，新增TypeScript严格模式，ESLint+Prettier格式化
**Linting Rules:** 继承现有项目的代码质量标准，新增前端特定的linting规则
**Testing Patterns:** 单元测试覆盖率>80%，集成测试覆盖关键业务流程，E2E测试覆盖用户主要场景
**Documentation Style:** TSDoc注释格式，API文档使用OpenAPI 3.0，与现有Python文档风格保持一致

### Enhancement-Specific Standards

- **React组件规范:** 函数式组件优先，自定义Hooks封装逻辑，props类型严格定义
- **API设计规范:** RESTful风格，统一错误码格式，请求响应数据验证
- **状态管理规范:** Zustand store模块化，避免全局状态污染，数据流单向性
- **安全编码规范:** 输入验证和清理，XSS防护，CSRF令牌验证

### Critical Integration Rules

- **Existing API Compatibility:** 严格遵循ZMQ协议规范，消息格式不允许任何偏差
- **Database Integration:** 禁止直接数据库访问，所有查询通过现有服务接口
- **Error Handling:** 统一错误处理格式，与现有系统错误码保持一致
- **Logging Consistency:** 使用相同的日志格式和级别，便于运维监控和问题排查
