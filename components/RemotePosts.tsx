// components/RemotePosts.tsx —— 首页唯一的文章列表（客户端组件）
// 读路径②：切条件后在浏览器里用 TanStack Query 请求内置接口 /api/posts，
// queryKey 区分不同条件组合，切回看过的条件秒出（Query 缓存）。
// 「全部 + 无搜索 + 第 1 页 + 默认排序」时不发请求，直接吃服务端带来的首屏数据：
// 注意不能用 Query 的 initialData 传首屏数据——Next 16 预渲染时会把时间戳当成
// 不稳定值报 Date.now() 错误，用 enabled 才是正解。
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { PostPageData, SortKey, SortOrder } from "@/lib/types";

export type ListConditions = {
  page: number;
  q: string;
  category: string;
  sort: SortKey;
  order: SortOrder;
};

const SORTS: { key: SortKey; label: string }[] = [
  { key: "publishedAt", label: "时间" },
  { key: "likes", label: "点赞" },
  { key: "views", label: "浏览" },
];

export default function RemotePosts({
  categories,
  serverData,
  conditions,
}: {
  categories: string[];
  serverData: PostPageData;
  conditions: ListConditions;
}) {
  const router = useRouter();
  const [category, setCategory] = useState(conditions.category);
  const [sort, setSort] = useState<SortKey>(conditions.sort);
  const [order, setOrder] = useState<SortOrder>(conditions.order);
  const [page, setPage] = useState(conditions.page);
  const [q, setQ] = useState(conditions.q); // 已提交的搜索词
  const [draftQ, setDraftQ] = useState(conditions.q); // 输入框里的词

  const isDefault =
    category === "全部" && q === "" && page === 1 && sort === "publishedAt" && order === "desc";

  const { data, isError } = useQuery<PostPageData>({
    queryKey: ["posts", { category, q, page, sort, order }],
    queryFn: () =>
      fetch(
        `/api/posts?category=${encodeURIComponent(category)}&q=${encodeURIComponent(q)}` +
          `&page=${page}&size=5&sort=${sort}&order=${order}`,
      ).then((r) => r.json()),
    enabled: !isDefault, // 默认视图用服务端数据，不重复请求
  });

  const view = isDefault ? serverData : (data ?? serverData);

  // 把当前条件写进 URL：非默认值才上参数，刷新 / 分享 / 后退都不丢
  function syncUrl(next: ListConditions) {
    const params = new URLSearchParams();
    if (next.category !== "全部") params.set("category", next.category);
    if (next.q) params.set("q", next.q);
    if (next.page > 1) params.set("page", String(next.page));
    if (next.sort !== "publishedAt") params.set("sort", next.sort);
    if (next.order !== "desc") params.set("order", next.order);
    const qs = params.toString();
    router.replace(qs ? `/?${qs}` : "/");
  }

  // 统一入口：合并条件 → 换筛选维度时回到第 1 页 → 更新状态 → 同步 URL
  function go(next: Partial<ListConditions>) {
    const merged: ListConditions = { category, q, page, sort, order, ...next };
    if ("category" in next || "q" in next || "sort" in next || "order" in next) merged.page = 1;
    setCategory(merged.category);
    setQ(merged.q);
    setDraftQ(merged.q);
    setPage(merged.page);
    setSort(merged.sort);
    setOrder(merged.order);
    syncUrl(merged);
  }

  return (
    <div className="space-y-4">
      {/* 搜索：提交才触发，避免每敲一个字就发一次请求 */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go({ q: draftQ.trim() });
        }}
        className="flex gap-2"
      >
        <input
          value={draftQ}
          onChange={(e) => setDraftQ(e.target.value)}
          placeholder="搜索标题或正文"
          className="border p-2 flex-1"
        />
        <button className="bg-blue-500 text-white px-4 rounded cursor-pointer hover:bg-blue-600">
          搜索
        </button>
      </form>

      {/* 分类按钮：来自数据层推导，不写死 */}
      <div className="flex gap-2 flex-wrap">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => go({ category: c })}
            className={
              "border px-3 py-1 rounded cursor-pointer " +
              (c === category ? "bg-blue-500 text-white" : "")
            }
          >
            {c}
          </button>
        ))}
      </div>

      {/* 排序：三种键 + 升降序切换 */}
      <div className="flex items-center gap-2 flex-wrap text-sm">
        <span className="text-gray-500">排序：</span>
        {SORTS.map((s) => (
          <button
            key={s.key}
            onClick={() => go({ sort: s.key })}
            className={
              "border px-2 py-1 rounded cursor-pointer " +
              (sort === s.key ? "bg-blue-500 text-white" : "")
            }
          >
            {s.label}
          </button>
        ))}
        <button
          onClick={() => go({ order: order === "asc" ? "desc" : "asc" })}
          className="border px-2 py-1 rounded cursor-pointer"
        >
          {order === "asc" ? "升序 ↑" : "降序 ↓"}
        </button>
      </div>

      {/* 列表：三态都有交代——出错 / 空态 / 正常 */}
      {isError ? (
        <p className="text-red-600">加载失败了，请刷新重试。</p>
      ) : view.items.length === 0 ? (
        <p>没有匹配的文章。</p>
      ) : (
        <ul className="space-y-2">
          {view.items.map((p) => (
            <li key={p.id} className="flex items-center justify-between border-b pb-1 gap-2">
              <Link href={`/posts/${p.slug}`} className="text-blue-600 hover:underline">
                {p.title}
              </Link>
              <span className="text-sm text-gray-500 whitespace-nowrap">
                {p.publishedAt} · 浏览 {p.views} · 赞 {p.likes} ·{" "}
                <Link href={`/posts/${p.slug}/edit`} className="hover:underline">
                  编辑
                </Link>
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* 分页：上一页 / 页码 / 下一页 + 统计文字 */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => go({ page: page - 1 })}
          disabled={page <= 1}
          className="border px-2 rounded cursor-pointer disabled:opacity-40"
        >
          上一页
        </button>
        {Array.from({ length: view.totalPages }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            onClick={() => go({ page: n })}
            className={
              "border px-2 rounded cursor-pointer " + (n === page ? "bg-blue-500 text-white" : "")
            }
          >
            {n}
          </button>
        ))}
        <button
          onClick={() => go({ page: page + 1 })}
          disabled={page >= view.totalPages}
          className="border px-2 rounded cursor-pointer disabled:opacity-40"
        >
          下一页
        </button>
        <span className="text-sm text-gray-500">
          共 {view.total} 篇 · 每页 {view.size} 篇 · 第 {page}/{view.totalPages} 页
        </span>
      </div>
    </div>
  );
}
