import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "로그인이 필요합니다" },
      { status: 401 }
    );
  }

  const { runId } = await params;

  const searchRun = await prisma.searchRun.findUnique({
    where: { id: runId },
    include: { report: { select: { id: true } } },
  });

  if (!searchRun) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "검색 실행을 찾을 수 없습니다" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    id: searchRun.id,
    status: searchRun.status,
    crawledCount: searchRun.crawledCount,
    reportId: searchRun.report?.id,
  });
}
