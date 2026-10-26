// lib/posts.ts —— 数据层（文章）
// 页面、Server Action、Route Handler 在 Next.js 里会被打包成不同的模块实例，
// 各自的模块级变量互不相通——表现就是「首页发布了新文章，接口那边永远读到旧的」。
// 所以把文章数组挂到 globalThis 上：同一个 Node 进程内，三处读写的都是同一份数据。
// 换数据库（任务十一）时只改这个文件，函数签名不变。
import type { Post, PostPageData, PostWithStats, SortKey, SortOrder } from "./types";
import { cacheLife, cacheTag } from "next/cache";
import { getAllStats } from "./stats";

const globalForPosts = globalThis as unknown as { __blogPosts?: Post[] };

// 初始 6 篇：3 个分类、4 个日期；一页 5 篇，正好能翻出第 2 页，也能测分类与排序
const seedPosts: Post[] = [
  { id: "1700000000001", slug: "hello-next", title: "从 Vite 搬进 Next.js", content: "实验二用 Vite 写了客户端博客，这次把数据搬到了服务器上。", category: "技术", publishedAt: "2026-10-01" },
  { id: "1700000000002", slug: "fullstack-notes", title: "全栈第一次上手的感觉", content: "Server Actions 省掉了接口契约和 fetch 样板，写表单像写本地函数。", category: "随笔", publishedAt: "2026-10-02" },
  { id: "1700000000003", slug: "rsc-thoughts", title: "服务端组件到底省了什么", content: "默认不下发 JS，浏览器只下载真正需要交互的那一小块。", category: "技术", publishedAt: "2026-09-28" },
  { id: "1700000000004", slug: "cache-model", title: "Next 16 缓存模型学习记", content: "use cache 写在数据函数里，cacheLife 定保鲜档，cacheTag 负责精准失效。", category: "技术", publishedAt: "2026-09-20" },
  { id: "1700000000005", slug: "campus-life", title: "东校区的一天", content: "中山大道西的晚风、图书馆的插座，以及总也抢不到的打印位。", category: "生活", publishedAt: "2026-09-15" },
  { id: "1700000000006", slug: "study-plan", title: "本学期的学习计划", content: "周一到周四晚上各留两个小时写代码，周末整理这一周的笔记。", category: "随笔", publishedAt: "2026-09-10" },
];

const posts: Post[] = globalForPosts.__blogPosts ?? (globalForPosts.__blogPosts = seedPosts);

// —— 读 ——
// "use cache"：声明这份数据可以缓存（构建期生成）；cacheLife("minutes") 是内置档位：
// 浏览器端保鲜 5 分钟、后台 1 分钟重新生成、1 小时过期；cacheTag 打标签，
// 写操作后 updateTag("posts") 可以精准让这批缓存失效，用户马上看到新文章。
export async function getPosts() {
  "use cache";
  cacheLife("minutes");
  cacheTag("posts");
  return posts;
}

export async function getPost(slug: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag("posts");
  return posts.find((p) => p.slug === slug);
}

// 分类不写死：从现有文章里推导，首页按钮和发布页下拉都用这一份
export async function getCategories() {
  const all = await getPosts();
  return ["全部", ...Array.from(new Set(all.map((p) => p.category)))];
}

// 任务九：分页 + 搜索 + 分类 + 排序，一次查询返回一页数据与分页信息
export async function getPostsPage(
  page = 1,
  size = 5,
  q = "",
  category = "全部",
  sort: SortKey = "publishedAt",
  order: SortOrder = "desc",
): Promise<PostPageData> {
  const all = await getPosts();
  const stats = await getAllStats();

  // 文章本体合并上点赞数、浏览量，列表三列一次给齐
  let rows: PostWithStats[] = all.map((p) => ({
    ...p,
    likes: stats[p.slug]?.likes ?? 0,
    views: stats[p.slug]?.views ?? 0,
  }));

  if (category && category !== "全部") {
    rows = rows.filter((p) => p.category === category);
  }
  const keyword = q.trim();
  if (keyword) {
    rows = rows.filter((p) => p.title.includes(keyword) || p.content.includes(keyword));
  }

  // 排序：日期按字符串比较、数字按数值比；同值用 id 兜底，保证翻页时顺序稳定
  const dir = order === "asc" ? 1 : -1;
  rows.sort((a, b) => {
    if (sort === "likes") return (a.likes - b.likes) * dir;
    if (sort === "views") return (a.views - b.views) * dir;
    if (a.publishedAt !== b.publishedAt) return (a.publishedAt < b.publishedAt ? -1 : 1) * dir;
    return (Number(a.id) - Number(b.id)) * dir;
  });

  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const current = Math.min(Math.max(1, page), totalPages);
  const start = (current - 1) * size;
  return { items: rows.slice(start, start + size), total, page: current, size, totalPages };
}

// —— 写 ——
// 写函数不加 "use cache"：缓存只属于「读」，写完由动作层 updateTag 让缓存失效
export async function addPost(input: { title: string; content: string; category: string }) {
  const now = Date.now();
  const post: Post = {
    ...input,
    id: String(now),
    slug: "post-" + now,
    publishedAt: new Date().toISOString().slice(0, 10),
  };
  posts.unshift(post); // 新文章排最前
  return post;
}

export async function updatePost(slug: string, patch: Partial<Pick<Post, "title" | "content">>) {
  const i = posts.findIndex((p) => p.slug === slug);
  if (i >= 0) posts[i] = { ...posts[i], ...patch };
  return posts[i];
}

export async function deletePost(slug: string) {
  const i = posts.findIndex((p) => p.slug === slug);
  if (i >= 0) posts.splice(i, 1);
}
