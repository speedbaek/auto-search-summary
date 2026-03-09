"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { TopicForm } from "@/components/topic-form";

interface TopicData {
  id: string;
  keyword: string;
  sources: string;
  isScheduled: boolean;
  scheduleTime: string;
}

export default function TopicEditPage() {
  const params = useParams();
  const [topic, setTopic] = useState<TopicData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/topics/${params.id}`)
      .then((res) => res.json())
      .then(setTopic)
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">토픽을 찾을 수 없습니다</p>
      </div>
    );
  }

  const parsedSources: string[] = (() => {
    try {
      return JSON.parse(topic.sources);
    } catch {
      return ["google", "naver", "youtube"];
    }
  })();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-xl font-bold text-gray-900">토픽 수정</h1>
      <TopicForm
        initialData={{
          id: topic.id,
          keyword: topic.keyword,
          sources: parsedSources,
          isScheduled: topic.isScheduled,
          scheduleTime: topic.scheduleTime,
        }}
      />
    </div>
  );
}
