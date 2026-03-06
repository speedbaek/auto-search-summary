import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TopicForm } from "@/components/topic-form";

export default async function NewTopicPage() {
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin");

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-xl font-bold text-gray-900">🔍 새 토픽 등록</h1>
      <p className="mt-1 text-sm text-gray-500">
        관심 주제를 등록하면 자동으로 검색하고 AI가 요약해드립니다.
      </p>
      <div className="mt-6">
        <TopicForm />
      </div>
    </div>
  );
}
