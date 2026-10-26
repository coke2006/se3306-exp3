// app/api/posts/route.ts —— 接口层（Route Handler）
// 给浏览器端的 Query 提供只读数据，与页面目录并存。
// 只做「解析参数 → 调数据层 → 返回 JSON」，不承担任何表单写操作。
import { getPostsPage } from "@/lib/posts";
import type { SortKey, SortOrder } from "@/lib/types";

export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const sortRaw = sp.get("sort") || "";
  const sort: SortKey = sortRaw === "likes" || sortRaw === "views" ? sortRaw : "publishedAt";
  const order: SortOrder = sp.get("order") === "asc" ? "asc" : "desc";
  const data = await getPostsPage(
    Number(sp.get("page") || "1") || 1,
    Number(sp.get("size") || "5") || 5,
    sp.get("q") || "",
    sp.get("category") || "全部",
    sort,
    order,
  );
  return Response.json(data);
}
