"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { TopicCard } from "./topic-card";
import type { Topic, Report } from "@prisma/client";

type TopicWithReport = Topic & { reports: Report[] };

export function DashboardClient() {
  const [topics, setTopics] = useState<TopicWithReport[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTopics = useCallback(async () => {
    const res = await fetch("/api/topics");
    if (res.ok) {
      const data = await res.json();
      setTopics(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTopics();
  }, [loadTopics]);

  if (loading) {
    return (
      <div className="mt-12 flex justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <>
      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">내 토픽</h2>
        <Link
          href="/topics/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + 새 토픽
        </Link>
      </div>

      <div className="mt-4 space-y-3">
        {topics.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
            <p className="text-gray-500">
              등록된 토픽이 없습니다.
              <br />
              관심 주제를 등록하면 자동으로 검색하고 요약해드립니다.
            </p>
            <Link
              href="/topics/new"
              className="mt-3 inline-block text-blue-600 hover:underline"
            >
              첫 토픽 등록하기
            </Link>
          </div>
        ) : (
          topics.map((topic) => (
            <TopicCard
              key={topic.id}
              topic={topic}
              latestReport={topic.reports[0] ?? null}
              onDelete={loadTopics}
            />
          ))
        )}
      </div>
    </>
  );
}
