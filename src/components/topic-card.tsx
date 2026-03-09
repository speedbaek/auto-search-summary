"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { Play, FileText, Trash2, Settings } from "lucide-react";
import type { Topic, Report } from "@prisma/client";
import { SearchProgress } from "./search-progress";

interface TopicCardProps {
  topic: Topic;
  latestReport: Report | null;
  onDelete?: () => void;
}

export function TopicCard({ topic, latestReport, onDelete }: TopicCardProps) {
  const [searchRunId, setSearchRunId] = useState<string | null>(null);
  const [resultReportId, setResultReportId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const handleRun = async () => {
    setFailed(false);
    setResultReportId(null);
    try {
      const res = await fetch("/api/search/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId: topic.id }),
      });
      if (res.ok || res.status === 202) {
        const data = await res.json();
        setSearchRunId(data.searchRunId);
      } else {
        setFailed(true);
      }
    } catch {
      setFailed(true);
    }
  };

  const handleComplete = useCallback((reportId: string) => {
    setResultReportId(reportId);
    setSearchRunId(null);
  }, []);

  const handleFailed = useCallback(() => {
    setFailed(true);
    setSearchRunId(null);
  }, []);

  const handleDelete = async () => {
    if (!confirm(`"${topic.keyword}" 토픽을 삭제하시겠습니까?`)) return;
    await fetch(`/api/topics/${topic.id}`, { method: "DELETE" });
    onDelete?.();
  };

  const lastRun = topic.lastRunAt
    ? new Date(topic.lastRunAt).toLocaleDateString("ko-KR", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "실행 기록 없음";

  const isRunning = !!searchRunId;
  const reportId = resultReportId || latestReport?.id;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">📌 {topic.keyword}</h3>
          <p className="mt-1 text-xs text-gray-500">
            마지막 실행: {lastRun} | 스케줄:{" "}
            {topic.isScheduled ? `ON (${topic.scheduleTime})` : "OFF"}
          </p>
          {!isRunning && !failed && latestReport && (
            <p className="mt-2 text-sm text-gray-600 line-clamp-2">
              ▸ {latestReport.summary}
            </p>
          )}
        </div>
        <div className="flex gap-1">
          <Link
            href={`/topics/${topic.id}`}
            className="text-gray-400 hover:text-blue-500 p-1"
            title="수정"
          >
            <Settings className="w-4 h-4" />
          </Link>
          <button
            onClick={handleDelete}
            className="text-gray-400 hover:text-red-500 p-1"
            title="삭제"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {searchRunId && (
        <div className="mt-3">
          <SearchProgress
            searchRunId={searchRunId}
            onComplete={handleComplete}
            onFailed={handleFailed}
          />
        </div>
      )}

      {failed && (
        <p className="mt-2 text-sm text-red-600">검색에 실패했습니다. 다시 시도해주세요.</p>
      )}

      <div className="mt-3 flex gap-2">
        <button
          onClick={handleRun}
          disabled={isRunning}
          className="flex items-center gap-1 rounded bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
        >
          <Play className="w-3.5 h-3.5" />
          {isRunning ? "실행 중" : "실행"}
        </button>
        {reportId && (
          <Link
            href={`/reports/${reportId}`}
            className="flex items-center gap-1 rounded bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            <FileText className="w-3.5 h-3.5" />
            정리본 보기
          </Link>
        )}
      </div>
    </div>
  );
}
