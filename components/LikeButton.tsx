// components/LikeButton.tsx —— 点赞按钮（客户端组件）
// 任务四的边界示例 + 任务十的乐观更新：
// 点下去先立刻 +1（不等服务器），再把请求发出去，返回的最新计数用来校准；
// 请求失败则把数字滚回去。一次会话内只允许点一次（作业演示口径）。
"use client";

import { useState, useTransition } from "react";
import { likePost } from "@/app/actions";

export default function LikeButton({ slug, initialCount }: { slug: string; initialCount: number }) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (liked || pending) return;
    setLiked(true);
    setCount((c) => c + 1); // 乐观更新：先改界面
    startTransition(async () => {
      try {
        const next = await likePost(slug); // 服务端写文件并返回最新计数
        setCount(next);
      } catch {
        setCount((c) => c - 1); // 回滚
        setLiked(false);
      }
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={liked || pending}
      aria-label={`给文章 ${slug} 点赞`}
      className="border px-3 py-1 rounded cursor-pointer hover:bg-gray-100 disabled:opacity-60"
    >
      {liked ? "已点赞" : "点赞"} {count}
    </button>
  );
}
