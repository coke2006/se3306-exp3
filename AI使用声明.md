# AI 使用声明

课程：SE3306 Web 开发（实验三：Next.js 全栈博客站）
学生：陈博　2024034743126　24 软件工程

## 使用的 AI 工具

- WorkBuddy（AI 编程助手）

## AI 参与范围（如实说明）

本项目的代码由 AI 辅助完成，具体参与：

1. **讲解机制**：App Router 文件约定、Server Components / Client Components 边界、
   `use cache` / `cacheLife` / `cacheTag` 新缓存模型、`useActionState` 签名约束、
   Next 16 中 `params` 为 Promise 等差异点；
2. **编写代码**：按指导书任务 1-10 的步骤实现全部源码（`app/`、`components/`、`lib/`、`tools/`）；
3. **编写测试与截图脚本**：`tools/smoke.js`（13 项端到端检查）、`tools/shots.js`（无头 Chrome 截图）；
4. **审查代码**：见 `ai-review.md`，共 4 条记录，其中 2 条实际修复、1 条记录为已知限制、1 条确认为框架机制。

## 本人完成并验证的部分

- 通读指导书，确认每一步的实现与自检点；
- 在本机实际执行：安装依赖、`npm run dev` / `build` / `start`、`npm run lint`；
- 亲自跑通全部功能并确认结果：发布（含空值校验）、编辑、删除、评论、点赞、浏览量、
  分页 / 搜索 / 分类 / 排序、404、加载骨架、Suspense；
- 复核构建路由表（○ 静态 / ◐ PPR / ƒ 动态、Revalidate 1m / Expire 1h）；
- 能解释每个文件的职责与关键代码的运行机制（分层架构、两条读路径一条写路径、
  为什么内存数据要挂 `globalThis`、为什么校验必须在服务端）。

## 与指导书要求的对应关系

指导书要求「任务 1-7 古法编程，AI 辅助答疑」。本声明如实披露 AI 深度参与了代码编写；
作为补偿性质量措施，额外做了机器可复验的端到端测试（13 项）与成体系的 AI 审码记录
（`ai-review.md`），保证每一处提交代码都被真实运行、验证并可解释。
