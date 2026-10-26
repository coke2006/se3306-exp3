// app/posts/layout.tsx —— 博客区子布局
// layout 可以嵌套：它只包裹 posts 这一段路由，首页不受影响。
// 切换 posts 下的页面时，这个外壳也不会重新挂载。
export default function PostsLayout({ children }: { children: React.ReactNode }) {
  return <section className="border-l-4 pl-4">{children}</section>;
}
