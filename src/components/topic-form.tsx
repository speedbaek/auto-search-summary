"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface TopicFormProps {
  initialData?: {
    id: string;
    keyword: string;
    sources: string[];
    isScheduled: boolean;
    scheduleTime: string;
  };
}

const SOURCE_OPTIONS = [
  { value: "google", label: "구글" },
  { value: "naver", label: "네이버" },
  { value: "youtube", label: "유튜브" },
];

export function TopicForm({ initialData }: TopicFormProps) {
  const router = useRouter();
  const [keyword, setKeyword] = useState(initialData?.keyword ?? "");
  const [sources, setSources] = useState<string[]>(
    initialData?.sources ?? ["google", "naver", "youtube"]
  );
  const [isScheduled, setIsScheduled] = useState(initialData?.isScheduled ?? false);
  const [scheduleTime, setScheduleTime] = useState(initialData?.scheduleTime ?? "07:00");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleSource = (source: string) => {
    setSources((prev) =>
      prev.includes(source)
        ? prev.filter((s) => s !== source)
        : [...prev, source]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim() || sources.length === 0) return;

    setIsSubmitting(true);
    try {
      const url = initialData ? `/api/topics/${initialData.id}` : "/api/topics";
      const method = initialData ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword, sources, isScheduled, scheduleTime }),
      });

      if (res.ok) {
        router.push("/");
        router.refresh();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRunNow = async () => {
    // 먼저 저장하고 바로 실행
    setIsSubmitting(true);
    try {
      const url = initialData ? `/api/topics/${initialData.id}` : "/api/topics";
      const method = initialData ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword, sources, isScheduled, scheduleTime }),
      });

      if (res.ok) {
        const topic = await res.json();
        // 검색 실행
        const runRes = await fetch("/api/search/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topicId: topic.id }),
        });
        if (runRes.ok) {
          const { searchRunId } = await runRes.json();
          router.push(`/topics/${topic.id}?runId=${searchRunId}`);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          검색어 *
        </label>
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="예: AI 업무자동화 트렌드"
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          검색 소스
        </label>
        <div className="mt-2 flex gap-4">
          {SOURCE_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={sources.includes(opt.value)}
                onChange={() => toggleSource(opt.value)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">자동 스케줄</span>
          <button
            type="button"
            onClick={() => setIsScheduled(!isScheduled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isScheduled ? "bg-blue-600" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isScheduled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </label>
        {isScheduled && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm text-gray-600">매일</span>
            <input
              type="time"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              className="rounded border border-gray-300 px-2 py-1 text-sm"
            />
            <span className="text-sm text-gray-600">에 실행</span>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting || !keyword.trim()}
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? "저장 중..." : "저장"}
        </button>
        <button
          type="button"
          onClick={handleRunNow}
          disabled={isSubmitting || !keyword.trim()}
          className="rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {isSubmitting ? "처리 중..." : "저장 + 지금 실행"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg bg-gray-100 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
        >
          취소
        </button>
      </div>
    </form>
  );
}
