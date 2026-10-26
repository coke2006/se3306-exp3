import type { Metadata } from "next";
import Link from "next/link";
import Providers from "./Providers";
import "./globals.css";

// metadata 写在 layout 顶部导出，框架会把它放进每个页面的 <head>：
// SEO 是站点级职责，集中管理比每页散写可靠。
export const metadata: Metadata = {
  title: "陈博的博客",
  description: "SE3306 实验三：用 Next.js App Router 做的全栈博客",
};

// RootLayout 是全站外壳：导航、页脚只维护一处，切页不重新挂载，状态不丢也不闪。
// children 是当前 URL 对应的 page 组件，框架自动传进来。
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <nav className="p-4 border-b flex gap-4">
          <Link href="/" className="hover:underline">首页</Link>
          <Link href="/about" className="hover:underline">关于</Link>
          <Link href="/new" className="hover:underline">写文章</Link>
        </nav>
        <Providers>
          <main className="max-w-2xl mx-auto p-4">{children}</main>
        </Providers>
        <footer className="text-center p-4 text-sm text-gray-500">
          © 2026 陈博的博客 · SE3306 实验三
        </footer>
      </body>
    </html>
  );
}
