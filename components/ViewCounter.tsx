// components/ViewCounter.tsx —— 浏览量计数（客户端组件）
// 打开详情页自动 +1；用 sessionStorage 去重：一次会话同一篇只计一次，防刷新灌水。
// 计数本身由服务端写进 data/stats.json，重启 dev / 换浏览器后仍在。
"use client";

import { useEffect, useState } from "react";
import { visitPost } from "@/app/actions";

export default function ViewCounter({ slug, initialCount }: { slug: string; initialCount: number }) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    const key = `viewed:${slug}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    visitPost(slug)
      .then(setCount)
      .catch(() => {});
  }, [slug]);

  return <span>浏览 {count}</span>;
}
