// app/Providers.tsx —— 客户端组件：包一层 QueryClientProvider
// 与 layout 同理：外壳组件接收 children 并渲染它。
// useState(() => new QueryClient()) 惰性初始化，保证每个浏览器会话只建一个客户端，
// 且不会在服务端渲染时创建（避免服务端/客户端两个实例不一致）。
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient());
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
