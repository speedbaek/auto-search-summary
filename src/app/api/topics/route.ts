import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED", message: "로그인이 필요합니다" }, { status: 401 });

  const topics = await prisma.topic.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      reports: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  return NextResponse.json(topics);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED", message: "로그인이 필요합니다" }, { status: 401 });

  const body = await req.json();
  const { keyword, sources, isScheduled, scheduleTime } = body;

  if (!keyword?.trim()) {
    return NextResponse.json({ error: "INVALID_INPUT", message: "검색어를 입력해주세요" }, { status: 400 });
  }

  const topic = await prisma.topic.create({
    data: {
      keyword: keyword.trim(),
      sources: JSON.stringify(sources || ["google", "naver", "youtube"]),
      isScheduled: isScheduled ?? false,
      scheduleTime: scheduleTime || "07:00",
    },
  });

  return NextResponse.json(topic, { status: 201 });
}
