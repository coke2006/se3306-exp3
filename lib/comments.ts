// lib/comments.ts —— 评论数据层（任务十）
// 评论是典型的一对多写操作：读在服务端组件里做，写走 Server Action。
// 底层存 data/comments.json，换数据库时只改这个文件。
import type { Comment } from "./types";
import { readTable, writeTable } from "./db";

export async function getComments(slug: string) {
  const rows = await readTable<Comment>("comments");
  return rows
    .filter((c) => c.slug === slug)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)); // 新评论在前
}

// 必填校验在动作层做过了；这里只负责追加与落盘
export async function addComment(input: { slug: string; author: string; content: string }) {
  const rows = await readTable<Comment>("comments");
  rows.push({
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  });
  await writeTable("comments", rows);
}
