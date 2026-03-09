import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { executeSearch } from "@/features/scheduler";

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "로그인이 필요합니다" },
      { status: 401 }
    );
  }

  const body = await request.json();
  const { topicId } = body;

  if (!topicId) {
    return NextResponse.json(
      { error: "INVALID_INPUT", message: "topicId가 필요합니다" },
      { status: 400 }
    );
  }

  const topic = await prisma.topic.findUnique({ where: { id: topicId } });
  if (!topic) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "토픽을 찾을 수 없습니다" },
      { status: 404 }
    );
  }

  // Create search run record first
  const searchRun = await prisma.searchRun.create({
    data: { topicId, status: "searching" },
  });

  // Fire and forget - execute in background
  executeSearch(topicId, searchRun.id).catch((err) => {
    console.error("[SearchRun] Background execution failed:", err);
  });

  // Return immediately with 202 Accepted
  return NextResponse.json(
    { searchRunId: searchRun.id, status: "searching" },
    { status: 202 }
  );
}
