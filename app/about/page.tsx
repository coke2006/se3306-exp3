// app/about/page.tsx —— 关于页（纯静态：构建期生成，不取数据）
export default function AboutPage() {
  return (
    <div className="space-y-2">
      <h1 className="text-xl font-bold">关于</h1>
      <p>这是一个用 Next.js App Router 做的全栈博客，SE3306 实验三的作品。</p>
      <p>文章列表、详情、发布、编辑、删除之外，还有分类过滤、搜索、分页、排序、评论、点赞与浏览量。</p>
    </div>
  );
}
