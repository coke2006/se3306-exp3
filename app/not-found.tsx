// app/not-found.tsx —— 404 兜底
// 放在 app 根目录才能覆盖全站；放子目录只影响那一段路由。
// 页面里也可以主动调用 notFound() 来触发它。
export default function NotFound() {
  return (
    <div className="space-y-2 p-8">
      <h1 className="text-xl font-bold">404</h1>
      <p>页面不存在，回首页看看吧。</p>
    </div>
  );
}
