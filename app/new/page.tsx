// app/new/page.tsx —— 发布页（服务端壳）
// 分类下拉的选项从数据层取，不写死；表单本体是客户端组件（要用 useActionState）。
import { getCategories } from "@/lib/posts";
import NewPostForm from "./NewPostForm";

export default async function NewPostPage() {
  const categories = await getCategories();
  return <NewPostForm categories={categories} />;
}
