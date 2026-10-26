// lib/db.ts —— 文件模拟数据库
// 用最小代价把「持久化」走通：对外就是 readTable / writeTable 两个函数，
// 跟真实数据库的查询/写入语义一致；任务十一换成 Prisma 时只动数据层实现。
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

// 部署在 Vercel 等 Serverless 平台时业务目录是只读的，只有 /tmp 可写；
// 本地与云服务器则直接用项目下的 data 目录（已加入 .gitignore）。
const DB_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), "lab3-data")
  : path.join(process.cwd(), "data");

export async function readTable<T>(name: string): Promise<T[]> {
  try {
    const raw = await fs.readFile(path.join(DB_DIR, `${name}.json`), "utf8");
    return JSON.parse(raw) as T[];
  } catch {
    return []; // 文件不存在当作空表，免初始化
  }
}

export async function writeTable<T>(name: string, rows: T[]) {
  await fs.mkdir(DB_DIR, { recursive: true });
  await fs.writeFile(path.join(DB_DIR, `${name}.json`), JSON.stringify(rows, null, 2), "utf8");
}
