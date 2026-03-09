"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle, XCircle, Search, Globe, Brain } from "lucide-react";

interface SearchProgressProps {
  searchRunId: string;
  onComplete: (reportId: string) => void;
  onFailed: () => void;
}

type Status = "searching" | "crawling" | "summarizing" | "completed" | "failed";

const steps: { status: Status; label: string; icon: typeof Search }[] = [
  { status: "searching", label: "검색 중", icon: Search },
  { status: "crawling", label: "크롤링 중", icon: Globe },
  { status: "summarizing", label: "AI 요약 중", icon: Brain },
];

export function SearchProgress({ searchRunId, onComplete, onFailed }: SearchProgressProps) {
  const [currentStatus, setCurrentStatus] = useState<Status>("searching");
  const [crawledCount, setCrawledCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/search/status/${searchRunId}`);
        if (!res.ok) return;

        const data = await res.json();
        setCurrentStatus(data.status);
        setCrawledCount(data.crawledCount || 0);

        if (data.status === "completed" && data.reportId) {
          clearInterval(interval);
          onComplete(data.reportId);
        } else if (data.status === "failed") {
          clearInterval(interval);
          onFailed();
        }
      } catch {
        // polling error, retry on next interval
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [searchRunId, onComplete, onFailed]);

  const statusOrder: Status[] = ["searching", "crawling", "summarizing"];
  const currentIndex = statusOrder.indexOf(currentStatus);

  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
      <div className="space-y-3">
        {steps.map((step, i) => {
          const Icon = step.icon;
          const isActive = step.status === currentStatus;
          const isDone = currentIndex > i || currentStatus === "completed";
          const isPending = currentIndex < i && currentStatus !== "completed" && currentStatus !== "failed";

          return (
            <div key={step.status} className="flex items-center gap-3">
              {isDone ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : isActive ? (
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              ) : currentStatus === "failed" ? (
                <XCircle className="w-5 h-5 text-red-400" />
              ) : (
                <Icon className={`w-5 h-5 ${isPending ? "text-gray-300" : "text-gray-400"}`} />
              )}
              <span className={`text-sm ${isActive ? "text-blue-700 font-medium" : isDone ? "text-green-700" : "text-gray-400"}`}>
                {step.label}
                {isActive && step.status === "crawling" && crawledCount > 0 && (
                  <span className="ml-1 text-xs">({crawledCount}건 수집)</span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {currentStatus === "completed" && (
        <div className="mt-3 pt-3 border-t border-blue-200 flex items-center gap-2 text-green-700 text-sm font-medium">
          <CheckCircle className="w-4 h-4" />
          완료! 정리본이 생성되었습니다.
        </div>
      )}

      {currentStatus === "failed" && (
        <div className="mt-3 pt-3 border-t border-red-200 flex items-center gap-2 text-red-600 text-sm">
          <XCircle className="w-4 h-4" />
          검색에 실패했습니다. 다시 시도해주세요.
        </div>
      )}
    </div>
  );
}
