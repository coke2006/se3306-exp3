// components/Comments.tsx —— 评论（服务端组件 + Suspense 慢组件示例）
// 读：服务端直接调数据层，不经过浏览器；写：表单 action 直连 Server Action。
// 详情页里用 <Suspense> 包住它：正文先渲染，评论列表好了再补上。
import { getComments } from "@/lib/comments";
import { createComment } from "@/app/actions";

export default async function Comments({ slug }: { slug: string }) {
  const comments = await getComments(slug);

  return (
    <section className="space-y-2 border-t pt-4">
      <h2 className="font-bold">评论</h2>
      {comments.length === 0 ? (
        <p className="text-sm text-gray-500">还没有评论，来写第一条。</p>
      ) : (
        <ul className="space-y-1">
          {comments.map((c) => (
            <li key={c.id} className="text-sm">
              <strong>{c.author}</strong>：{c.content}
            </li>
          ))}
        </ul>
      )}
      <form action={createComment} className="space-y-2">
        <input type="hidden" name="slug" value={slug} />
        <input name="author" placeholder="昵称" className="border p-2 block w-full" />
        <textarea name="content" placeholder="写点评论" className="border p-2 block w-full" />
        <button className="bg-blue-500 text-white px-4 py-2 rounded cursor-pointer hover:bg-blue-600">
          提交评论
        </button>
      </form>
    </section>
  );
}
