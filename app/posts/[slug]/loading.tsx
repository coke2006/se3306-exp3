// app/posts/[slug]/loading.tsx —— 路由级加载骨架
// 路由切换时框架自动显示，不用手写状态机；Slow 3G 下进详情页先看到它。
export default function Loading() {
  return (
    <div className="animate-pulse p-8 text-gray-500" aria-busy="true">
      文章加载中…
    </div>
  );
}
