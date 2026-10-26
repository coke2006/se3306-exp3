// app/actions.ts —— 动作层（服务端写操作）
// "use server" 之后的每个导出函数都只在服务器上运行，浏览器里只是拿到一个可调用的引用。
// 表单可以直接 action={函数}，不用 onSubmit + fetch + 状态码那套样板。
// 校验必须放服务端：客户端校验只是体验，绕过它只需要开一下 DevTools。
"use server";

import { addPost, updatePost, deletePost } from "@/lib/posts";
import { addComment } from "@/lib/comments";
import { incrementLike, incrementView } from "@/lib/stats";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";

// useActionState 版签名：(上一状态, FormData) => 新状态。
// 与直连版 <form action={fn}> 的「只收 FormData、返回 void」不能混用。
export type CreateState = { ok?: boolean; error?: string };

export async function createPost(
  _prev: CreateState,
  formData: FormData,
): Promise<CreateState> {
  const title = String(formData.get("title") || "").trim();
  const content = String(formData.get("content") || "").trim();
  const category = String(formData.get("category") || "技术").trim();

  if (!title || !content) return { error: "标题和正文不能为空" };

  await addPost({ title, content, category });
  revalidatePath("/");     // 首页列表重新生成
  updateTag("posts");      // 让带 use cache 的读函数缓存立即失效
  return { ok: true };
}

export async function editPost(formData: FormData) {
  const slug = String(formData.get("slug"));
  const title = String(formData.get("title") || "").trim();
  const content = String(formData.get("content") || "").trim();
  if (!title || !content) return; // 编辑页没有挂状态版，至少防一下空提交

  await updatePost(slug, { title, content });
  revalidatePath("/");
  revalidatePath(`/posts/${slug}`);
  updateTag("posts");
  redirect("/"); // 保存后自动回首页
}

export async function removePost(formData: FormData) {
  const slug = String(formData.get("slug"));
  await deletePost(slug);
  revalidatePath("/");
  updateTag("posts");
  redirect("/");
}

// 任务十：评论写入文件数据库，写完回详情页（revalidatePath 后 redirect 触发重渲染）
export async function createComment(formData: FormData) {
  const slug = String(formData.get("slug"));
  const author = String(formData.get("author") || "").trim();
  const content = String(formData.get("content") || "").trim();
  if (!slug || !author || !content) return; // 空昵称/空评论不落盘

  await addComment({ slug, author, content });
  revalidatePath(`/posts/${slug}`);
  redirect(`/posts/${slug}`);
}

// 点赞：服务端写文件并返回最新计数，供乐观更新后校准
export async function likePost(slug: string) {
  const count = await incrementLike(slug);
  revalidatePath(`/posts/${slug}`);
  revalidatePath("/"); // 列表里的点赞数也要跟着刷新
  return count;
}

// 浏览量：打开详情页自动 +1 并持久化
export async function visitPost(slug: string) {
  const count = await incrementView(slug);
  revalidatePath(`/posts/${slug}`);
  revalidatePath("/");
  return count;
}
