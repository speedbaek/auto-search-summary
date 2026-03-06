"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2, Play, FileText, Trash2 } from "lucide-react";
import type { Topic, Report } from "@prisma/client";

interface TopicCardProps {
  topic: Topic;
  latestReport: Report | null;
  onDelete?: () => void;
}

type SearchStatus = "idle" | "searching" | "crawling" | "summarizing" | "completed" | "failed";

export function TopicCard({ topic, latestReport, onDelete }: TopicCardProps) {
  const [status, setStatus] = useState<SearchStatus>("idle");
  const [resultReportId, setResultReportId] = useState<string | null>(null);

  const handleRun = async () => {
    setStatus("searching");
    try {
      const res = await fetch("/api/search/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId: topic.id }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === "completed" && data.reportId) {
          setStatus("completed");
          setResultReportId(data.reportId);
        } else {
          setStatus("failed");
        }
      } else {
        setStatus("failed");
      }
    } catch {
      setStatus("failed");
    }
  };

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

  const statusLabels: Record<SearchStatus, string> = {
    idle: "",
    searching: "검색 중...",
    crawling: "크롤링 중...",
    summarizing: "AI 요약 중...",
    completed: "완료!",
    failed: "실패",
  };

  const isRunning = !["idle", "completed", "failed"].includes(status);
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
          {status !== "idle" && (
            <div className={`mt-2 flex items-center gap-1.5 text-sm ${status === "failed" ? "text-red-600" : status === "completed" ? "text-green-600" : "text-blue-600"}`}>
              {isRunning && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {statusLabels[status]}
            </div>
          )}
          {status === "idle" && latestReport && (
            <p className="mt-2 text-sm text-gray-600 line-clamp-2">
              ▸ {latestReport.summary}
            </p>
          )}
        </div>
        <button
          onClick={handleDelete}
          className="text-gray-400 hover:text-red-500 p-1"
          title="삭제"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={handleRun}
          disabled={isRunning}
          className="flex items-center gap-1 rounded bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
        >
          {isRunning ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5" />
          )}
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
