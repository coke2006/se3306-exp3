// app/posts/[slug]/page.tsx —— 文章详情页
// [slug] 是动态路由：文件夹名字面上就叫 [slug]，匹配 /posts/ 后面任意一段。
// Next.js 16 的 params 是 Promise，必须 await。
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPost, getPosts } from "@/lib/posts";
import { getLikeCount, getViewCount } from "@/lib/stats";
import { removePost } from "@/app/actions";
import Comments from "@/components/Comments";
import LikeButton from "@/components/LikeButton";
import ViewCounter from "@/components/ViewCounter";

// 详情页要先拿到 slug 才能渲染，允许阻塞
export const instant = false;

// 构建期把现有文章的详情页全部预生成（SSG）；
// 数据新鲜度由 lib/posts.ts 里的 use cache + cacheLife 决定，这里只负责清单。
export async function generateStaticParams() {
  const posts = await getPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [post, likes, views] = await Promise.all([
    getPost(slug),
    getLikeCount(slug),
    getViewCount(slug),
  ]);

  // 主动触发 404 兜底页（not-found.tsx），比渲染一句文案更规范：状态码也是 404
  if (!post) notFound();

  return (
    <article className="space-y-4">
      <h1 className="text-2xl font-bold">{post.title}</h1>
      <p className="text-sm text-gray-500">
        <Link
          href={`/?category=${encodeURIComponent(post.category)}`}
          className="text-blue-600 hover:underline"
        >
          #{post.category}
        </Link>
        {" · "}
        {post.publishedAt}
        {" · "}
        <ViewCounter slug={post.slug} initialCount={views} />
      </p>
      <p className="whitespace-pre-wrap">{post.content}</p>

      <div className="flex items-center gap-4">
        <LikeButton slug={post.slug} initialCount={likes} />
        <a href={`/posts/${post.slug}/edit`} className="text-blue-600 hover:underline cursor-pointer">
          编辑本文
        </a>
        {/* 删除也是表单写操作：hidden input 把 slug 交给 Server Action */}
        <form action={removePost}>
          <input type="hidden" name="slug" value={post.slug} />
          <button className="text-red-600 cursor-pointer hover:underline">删除本文</button>
        </form>
      </div>

      {/* 慢组件单独 Suspense：正文先出，评论好了再补上 */}
      <Suspense fallback={<p className="text-gray-500">评论加载中…</p>}>
        <Comments slug={post.slug} />
      </Suspense>
    </article>
  );
}
