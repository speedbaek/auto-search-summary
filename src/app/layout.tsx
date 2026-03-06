import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Auto Search Summary",
  description: "관심 주제를 자동 검색하고 AI가 요약해주는 개인 브리핑 도구",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-gray-50 antialiased">{children}</body>
    </html>
  );
}
