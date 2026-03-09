"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, Mail, ExternalLink, CheckCircle } from "lucide-react";

interface Report {
  id: string;
  title: string;
  summary: string;
  content: string;
  sources: { title: string; url: string; platform: string }[];
  isEmailed: boolean;
  createdAt: string;
  topic: { keyword: string };
  searchRun: { startedAt: string; crawledCount: number };
}

export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailing, setEmailing] = useState(false);

  useEffect(() => {
    fetch(`/api/reports/${params.id}`)
      .then((res) => res.json())
      .then(setReport)
      .finally(() => setLoading(false));
  }, [params.id]);

  async function handleEmail() {
    if (!report) return;
    setEmailing(true);
    const res = await fetch(`/api/reports/${report.id}/email`, {
      method: "POST",
    });
    if (res.ok) {
      setReport({ ...report, isEmailed: true });
    }
    setEmailing(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">정리본을 찾을 수 없습니다</p>
      </div>
    );
  }

  const date = new Date(report.createdAt);
  const platformColors: Record<string, string> = {
    google: "bg-blue-100 text-blue-700",
    naver: "bg-green-100 text-green-700",
    youtube: "bg-red-100 text-red-700",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>뒤로</span>
          </button>
          <button
            onClick={handleEmail}
            disabled={emailing || report.isEmailed}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {report.isEmailed ? (
              <>
                <CheckCircle className="w-4 h-4" />
                전송됨
              </>
            ) : (
              <>
                <Mail className="w-4 h-4" />
                {emailing ? "전송 중..." : "이메일 전송"}
              </>
            )}
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <div className="text-sm text-gray-500 mb-2">
            {date.toLocaleDateString("ko-KR")} {date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })} | {report.topic.keyword} | 크롤링 {report.searchRun.crawledCount}건
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-3">
            {report.title}
          </h1>
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-6">
            <p className="text-blue-800 font-medium">{report.summary}</p>
          </div>
          <div className="prose prose-sm max-w-none prose-headings:mt-10 prose-headings:mb-4 prose-h2:text-lg prose-h2:border-b prose-h2:border-gray-200 prose-h2:pb-2 prose-h3:text-base prose-p:mb-5 prose-p:leading-7 prose-blockquote:bg-amber-50 prose-blockquote:border-amber-300 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:my-4 prose-ul:my-3 prose-li:my-1">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-blue-600 hover:underline no-underline">
                    {children}
                    <svg className="w-3 h-3 inline shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </a>
                ),
                p: ({ children, ...props }) => {
                  const text = typeof children === "string" ? children : Array.isArray(children) ? children.map(c => typeof c === "string" ? c : "").join("") : "";
                  const isSource = text.includes("📎") || text.includes("출처:");
                  if (isSource) {
                    return <p className="text-emerald-700 text-xs mt-2 mb-6 pl-3 border-l-2 border-emerald-300" {...props}>{children}</p>;
                  }
                  return <p {...props}>{children}</p>;
                },
              }}
            >{report.content}</ReactMarkdown>
          </div>
        </div>

        <details className="bg-white rounded-xl shadow-sm border">
          <summary className="px-6 py-4 cursor-pointer text-sm font-semibold text-gray-500 hover:text-gray-700">
            전체 참고 출처 ({report.sources.length}건) — 클릭하여 펼치기
          </summary>
          <ul className="px-6 pb-4 space-y-2">
            {report.sources.map((source, i) => (
              <li key={i} className="flex items-start gap-2">
                <span
                  className={`text-xs px-1.5 py-0.5 rounded ${platformColors[source.platform] || "bg-gray-100 text-gray-600"}`}
                >
                  {source.platform}
                </span>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                >
                  {source.title}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            ))}
          </ul>
        </details>
      </main>
    </div>
  );
}
