// app/posts/[slug]/edit/page.tsx —— 编辑页
// 服务端先按 slug 把旧内容查出来回填表单，提交交给动作层 editPost。
import { getPost } from "@/lib/posts";
import { editPost } from "@/app/actions";

// 编辑页要先用 slug 回填，允许阻塞
export const instant = false;

export default async function EditPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return <p>文章不存在。</p>;

  return (
    <form action={editPost} className="space-y-2">
      <h1 className="text-xl font-bold">编辑文章</h1>
      <input type="hidden" name="slug" value={post.slug} />
      <input name="title" defaultValue={post.title} className="border p-2 block w-full" />
      <textarea name="content" defaultValue={post.content} rows={8} className="border p-2 block w-full" />
      <button className="bg-blue-500 text-white px-4 py-2 rounded cursor-pointer hover:bg-blue-600">
        保存修改
      </button>
      <p className="text-sm text-gray-500">保存后会自动返回首页。</p>
    </form>
  );
}
