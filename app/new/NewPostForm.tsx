// app/new/NewPostForm.tsx —— 发布表单（客户端组件）
// useActionState 把动作的返回状态与提交中状态带回页面：
// 错误提示用 state.error 渲染，isPending 期间禁用按钮防重复提交。
"use client";

import { useActionState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createPost } from "../actions";

const initialState = { ok: false, error: "" };

export default function NewPostForm({ categories }: { categories: string[] }) {
  const [state, formAction, isPending] = useActionState(createPost, initialState);
  const queryClient = useQueryClient();
  const router = useRouter();

  // 发布成功后要做两件事：
  // ① 服务端 updateTag 已让页面缓存失效（在动作里做了）；
  // ② 浏览器的 Query 缓存不会自己知道，要主动 invalidate 才会重拉列表。
  useEffect(() => {
    if (state.ok) {
      queryClient.invalidateQueries({ queryKey: ["posts"], refetchType: "all" });
      router.refresh();
    }
  }, [state, queryClient, router]);

  const options = categories.filter((c) => c !== "全部");

  return (
    <form action={formAction} className="space-y-2">
      <h1 className="text-xl font-bold">写文章</h1>
      <input name="title" placeholder="标题" className="border p-2 block w-full" />
      <textarea name="content" placeholder="正文" rows={8} className="border p-2 block w-full" />
      <select name="category" defaultValue={options[0] ?? "技术"} className="border p-2 block w-full">
        {options.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      {state.error && <p className="text-red-600">{state.error}</p>}
      <button
        disabled={isPending}
        className="bg-blue-500 text-white px-4 py-2 rounded cursor-pointer hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? "发布中…" : "发布"}
      </button>
    </form>
  );
}
