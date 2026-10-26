// app/page.tsx —— 首页
// 读路径①：服务端组件直连数据层取数，首屏 HTML 自带文章内容（右键查看源代码能看到标题）。
// 分页、搜索、分类、排序四个条件全部放进 URL（searchParams）：
// 页面可分享、可后退、刷新不丢。
import { getPostsPage, getCategories } from "@/lib/posts";
import type { SortKey, SortOrder } from "@/lib/types";
import RemotePosts from "../components/RemotePosts";

// 首页要先拿到 URL 条件才能渲染，允许阻塞，关掉即时导航校验
export const instant = false;

// URL 上的值不可信：白名单过滤一遍再交给数据层
function parseConditions(sp: Record<string, string | string[] | undefined>) {
  const sortRaw = String(sp.sort || "");
  const sort: SortKey = sortRaw === "likes" || sortRaw === "views" ? sortRaw : "publishedAt";
  const order: SortOrder = sp.order === "asc" ? "asc" : "desc";
  return {
    page: Math.max(1, Number(sp.page) || 1),
    q: String(sp.q || ""),
    category: String(sp.category || "全部"),
    sort,
    order,
  };
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const conditions = parseConditions(await searchParams);
  const [pageData, categories] = await Promise.all([
    getPostsPage(conditions.page, 5, conditions.q, conditions.category, conditions.sort, conditions.order),
    getCategories(),
  ]);

  // key 跟着条件与数据变：切换条件或发布/编辑/删除后，整个列表重新挂载，
  // 客户端组件里的 useState 初始值才能跟上服务端最新数据
  const listKey = [
    conditions.category, conditions.q, pageData.page,
    conditions.sort, conditions.order,
    pageData.items.map((p) => p.id).join("-"),
  ].join("|");

  return <RemotePosts key={listKey} categories={categories} serverData={pageData} conditions={conditions} />;
}
