# SE3306 实验三：Next.js 全栈博客站

广东技术师范大学 · 24 软件工程 · 陈博（2024034743126）

对应《实验三_Next.js全栈博客站_实验指导书》任务一至任务十的自研实现：
把一个博客从「纯客户端」升级为全栈应用——服务端组件直连取数、Server Actions 表单写入、
`use cache` 新缓存模型、文件模拟数据库，以及分页 / 搜索 / 分类 / 排序 / 评论 / 点赞 / 浏览量。

## 技术栈

- Next.js 16.4（App Router + cacheComponents 新缓存模型 + Turbopack）
- React 19 + TypeScript + Tailwind CSS 4
- TanStack Query 5（客户端取数与缓存）
- 数据层：文章存内存（globalThis），评论 / 点赞 / 浏览量存 `data/*.json` 文件模拟数据库

## 本地运行

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # 生产构建（看路由表：○ 静态 / ◐ PPR / ƒ 动态）
npm start        # 生产模式
npm run lint     # 代码检查
node tools/smoke.js   # 端到端冒烟测试（需先 npm start）
```

## 功能对照

| 任务 | 实现位置 |
|---|---|
| 任务一 建项目 | `package.json`、`next.config.ts`（cacheComponents 默认开启） |
| 任务二 结构约定 | `app/about`、`app/posts/[slug]`、`app/not-found.tsx`、`app/posts/layout.tsx` |
| 任务三 布局外壳 | `app/layout.tsx`（导航 / 页脚只维护一处 + metadata 注入 head） |
| 任务四 渲染模式 | 静态页 `app/about`、客户端组件 `components/LikeButton.tsx`、`components/ViewCounter.tsx` |
| 任务五 数据获取 | `lib/posts.ts`（use cache + cacheLife + cacheTag）、`app/api/posts/route.ts`、`app/Providers.tsx`、`components/RemotePosts.tsx` |
| 任务六 表单写入 | `app/actions.ts`（createPost 状态版 / editPost / removePost）、`app/new/NewPostForm.tsx`（useActionState）、`app/posts/[slug]/edit/page.tsx` |
| 任务七 体验优化 | `app/posts/[slug]/loading.tsx`、`error.tsx`、`components/Comments.tsx`（Suspense 慢组件） |
| 任务九 分页搜索排序浏览量 | `lib/posts.ts` 的 `getPostsPage`、`RemotePosts`（条件全进 URL，刷新 / 分享不丢） |
| 任务十 评论与文件数据库 | `lib/db.ts`、`lib/stats.ts`、`lib/comments.ts`、乐观更新点赞 |

## 分层架构

```
页面层  app/*/page.tsx        组合数据与组件，输出这一页
数据层  lib/                  类型 + 增删改查（换数据库只改这里）
动作层  app/actions.ts        服务端写操作：校验、写数据、失效缓存
接口层  app/api/posts/route.ts  给浏览器端 Query 提供只读 JSON
```

读有两条路径（服务端直连 / 客户端 Query），写只有一条（Server Action）。

## 部署

- 线上地址（国内可直连）：<https://se3306-lab3-blog.app.workbuddy.host/?sharecode=N55MNBMA7Q>
- 镜像地址（Vercel）：<https://se3306-exp3-rho.vercel.app>
- 仓库（Gitee）：<https://gitee.com/coker-coal/se3306-exp3>

部署在 Vercel（支持 Next 16 新缓存模型与 PPR）。部署环境下文件系统只读，
`lib/db.ts` 会自动改写到 `/tmp`（见 `process.env.VERCEL` 分支），线上同样能发布、评论、点赞。
上线后实测：首页 / 文章页 / 写作页均 200，文章页服务端渲染出正文，`/api/posts` 返回种子数据。

## 备注

- `data/` 目录是运行时生成的文件数据库，已加入 `.gitignore`
- `tools/smoke.js` 是自写的 CDP 端到端测试脚本，13 项检查（发布 / 校验 / 编辑 / 删除 / 评论 / 点赞 / 浏览量 / 分页 / 搜索 / 分类 / 404 / SEO）
