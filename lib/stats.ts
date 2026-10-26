// lib/stats.ts —— 点赞与浏览量数据层（任务九/十）
// 两者结构相同（slug → 计数），所以合并成一张「统计表」存在 data/stats.json，
// 每行 { slug, likes, views }，点赞和浏览各写各的字段，互不影响。
import { readTable, writeTable } from "./db";

type StatRow = { slug: string; likes: number; views: number };

// 一次把全部文章的点赞/浏览读成映射，列表页排序与合并用
export async function getAllStats(): Promise<Record<string, { likes: number; views: number }>> {
  const rows = await readTable<StatRow>("stats");
  const map: Record<string, { likes: number; views: number }> = {};
  for (const r of rows) map[r.slug] = { likes: r.likes, views: r.views };
  return map;
}

async function getRow(slug: string) {
  const rows = await readTable<StatRow>("stats");
  let row = rows.find((r) => r.slug === slug);
  if (!row) {
    row = { slug, likes: 0, views: 0 };
    rows.push(row);
  }
  return { rows, row };
}

export async function getLikeCount(slug: string) {
  const { row } = await getRow(slug);
  return row.likes;
}

export async function getViewCount(slug: string) {
  const { row } = await getRow(slug);
  return row.views;
}

// 点赞 +1，返回最新计数（LikeButton 拿它做乐观更新后的校准）
export async function incrementLike(slug: string) {
  const { rows, row } = await getRow(slug);
  row.likes += 1;
  await writeTable("stats", rows);
  return row.likes;
}

// 浏览量 +1，返回最新计数（ViewCounter 打开详情页时调用）
export async function incrementView(slug: string) {
  const { rows, row } = await getRow(slug);
  row.views += 1;
  await writeTable("stats", rows);
  return row.views;
}
