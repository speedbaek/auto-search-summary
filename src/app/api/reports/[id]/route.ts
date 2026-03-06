import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "로그인이 필요합니다" },
      { status: 401 }
    );
  }

  const { id } = await params;

  const report = await prisma.report.findUnique({
    where: { id },
    include: {
      topic: { select: { keyword: true } },
      searchRun: { select: { startedAt: true, crawledCount: true } },
    },
  });

  if (!report) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "정리본을 찾을 수 없습니다" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ...report,
    sources: JSON.parse(report.sources),
  });
}
