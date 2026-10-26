// app/posts/[slug]/error.tsx —— 路由段错误边界
// 必须是客户端组件：错误发生在浏览器渲染阶段，reset 是要绑到按钮上的事件函数，
// 服务端组件无法把函数传给浏览器。
"use client";

export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="p-8 space-y-2">
      <p>加载失败了，可以点下面的按钮重试。</p>
      <button onClick={reset} className="text-blue-600 cursor-pointer hover:underline">
        重试
      </button>
    </div>
  );
}
