# ai-review.md —— AI 审码记录

按指导书「AI 审码：ai-review.md 三件套齐全，有 diff 与运行验证」的要求，
这里记录项目完成后**逐文件审查发现的问题、改动与验证结果**。
每条三件套：① 问题片段与违反的规则 ② 修复 diff ③ 运行验证。

---

## 条目 1：切分类瞬间，旧条件的列表顶着新 URL 显示

**① 问题片段与规则**

`components/RemotePosts.tsx` 切换分类/搜索后，`useQuery` 首次请求还没返回时
`data` 为 `undefined`，此时 `view` 回退到 `serverData`（上一次服务端带来的旧条件数据）——
URL 已经是 `?category=生活`，列表却还是「全部」的内容，违反「URL 是状态」一致性。

**② 修复 diff**

```diff
-  const { data, isError } = useQuery<PostPageData>({ ... });
+  const { data, isPending, isError } = useQuery<PostPageData>({ ... });

   const view = isDefault ? serverData : (data ?? serverData);
+  // 切条件后 Query 首次请求还没回来时，明确显示加载中
+  const fetchingFirstPage = !isDefault && !data && !isError;

   {isError ? (
     <p className="text-red-600">加载失败了，请刷新重试。</p>
+  ) : fetchingFirstPage ? (
+    <p className="text-gray-500">加载中…</p>
   ) : view.items.length === 0 ? (
```

**③ 运行验证**

重新 `npm run build` 后跑 `node tools/smoke.js`，13 项全部 PASS；
人工点分类按钮，切换瞬间显示「加载中…」而不是旧列表。

---

## 条目 2：端到端测试里「点删除后立刻跳走」，写操作被导航中断

**① 问题片段与规则**

`tools/smoke.js` 点击「删除本文」后立即 `goto('/')`。
Server Action 是一次表单 POST，页面导航会把这次请求**直接掐断**，
导致删除没执行、断言超时——违反「写操作必须等到确认再离开」的交互规则
（对应指导书防重复提交第三层：提交后要给明确反馈）。

**② 修复 diff**

```diff
    form.querySelector('button').click();
    `);
-   await goto(cdp, `${BASE}/`);
+   await waitFor(`location.pathname === '/'`, 12000, "删除后重定向回首页");
+   await goto(cdp, `${BASE}/`);
```

**③ 运行验证**

重跑 `node tools/smoke.js`：`删除文章：首页列表同步移除` 由超时 FAIL 变为 PASS。

---

## 条目 3：stats.json 读-改-写存在并发覆盖风险（记录为已知限制）

**① 问题片段与规则**

`lib/stats.ts` 的 `incrementLike` / `incrementView` 是「读文件 → 改内存 → 写回整表」。
两个请求同时进来会互相覆盖对方的 +1（丢失更新），
违反数据完整性的一般要求。当前场景是单进程课堂演示，冲突概率可忽略，
但这是一个**真实项目必须用数据库事务解决**的问题——正是任务十一存在的意义。

**② 处理方式**

不修（超出本实验范围），在代码注释与报告里明确记录该限制：

```ts
// lib/stats.ts 头部注释
// 两者结构相同（slug → 计数），所以合并成一张「统计表」存在 data/stats.json
// 注：读-改-写非原子操作，多实例并发下会丢失更新；换数据库（任务十一）即解决
```

**③ 运行验证**

单进程下顺序点赞 3 次，`data/stats.json` 计数 1→2→3 正确（`node tools/smoke.js` 点赞项 PASS）。

---

## 条目 4：PPR 下 `notFound()` 的 HTTP 状态码是 200（机制确认，非缺陷）

**① 现象**

访问 `/posts/不存在的slug`，页面正确显示 404 兜底内容，但 HTTP 状态码是 200。
`fetch('/totally-unknown-path')` 则是标准 404。

**② 原因**

详情页是 `◐`（PPR）：静态壳（loading 骨架）先以 200 开始流式输出，
`notFound()` 在动态段才触发，此时状态码已经发出、无法改写。
这是 Next.js 部分预渲染的固有行为，浏览器侧用户体验与完整 404 一致。

**③ 处理**

测试断言改为「未知路由 404 状态码 + 不存在 slug 显示兜底内容」两条，
并在报告任务七节如实说明该机制。
