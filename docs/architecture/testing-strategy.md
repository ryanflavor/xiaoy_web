# Testing Strategy

### Integration with Existing Tests

**Existing Test Framework:** Python unittest + pytest用于后端测试，保持现有测试不受影响
**Test Organization:** 新增独立测试套件，避免与现有测试产生冲突
**Coverage Requirements:** 新代码测试覆盖率不低于80%，关键业务逻辑达到95%

### New Testing Requirements

#### Unit Tests for New Components

- **Framework:** Jest + React Testing Library用于前端，Jest + Supertest用于API网关
- **Location:** 每个组件同目录下的__tests__文件夹
- **Coverage Target:** 单元测试覆盖率80%以上
- **Integration with Existing:** 独立运行，不依赖现有后端服务
- **指令解析一致性测试:** Python-TypeScript对照测试框架，包含黄金标准数据集和自动化验证流程

#### Integration Tests

- **Scope:** API网关与现有ZMQ系统的协议兼容性测试
- **Existing System Verification:** 确保新组件不影响现有系统正常运行
- **New Feature Testing:** 端到端业务流程测试，覆盖指令解析到算法执行全链路

#### Regression Testing

- **Existing Feature Verification:** 自动化测试确保现有功能不受影响
- **Automated Regression Suite:** 每次部署前运行完整回归测试套件
- **Manual Testing Requirements:** 关键业务场景的手工验证，用户体验一致性检查
