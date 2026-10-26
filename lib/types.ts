// lib/types.ts
// 全项目共用一份数据合约：先定类型再写代码，编辑器就能查拼写、给补全。
// 之后任务十一换 Prisma + SQLite 时字段不变，页面与动作层一行不用改。

export type Post = {
  id: string;
  slug: string;
  title: string;
  content: string;
  category: string;
  publishedAt: string; // YYYY-MM-DD
};

// 列表行：文章本体 + 两个统计数字（点赞、浏览）
export type PostWithStats = Post & {
  likes: number;
  views: number;
};

// 排序条件允许的键与方向，首页 URL 上的 sort / order 只接受这几个值
export type SortKey = "publishedAt" | "likes" | "views";
export type SortOrder = "asc" | "desc";

// 一页列表的返回结构：数据 + 分页信息，接口层与页面层共用
export type PostPageData = {
  items: PostWithStats[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
};

// 评论（任务十，存在 data/comments.json）
export type Comment = {
  id: string;
  slug: string;
  author: string;
  content: string;
  createdAt: string;
};
