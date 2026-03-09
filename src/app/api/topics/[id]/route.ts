import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED", message: "로그인이 필요합니다" }, { status: 401 });

  const { id } = await params;
  const topic = await prisma.topic.findUnique({
    where: { id },
    include: { reports: { orderBy: { createdAt: "desc" }, take: 5 } },
  });

  if (!topic) {
    return NextResponse.json({ error: "NOT_FOUND", message: "토픽을 찾을 수 없습니다" }, { status: 404 });
  }

  return NextResponse.json(topic);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED", message: "로그인이 필요합니다" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const topic = await prisma.topic.update({
    where: { id },
    data: {
      keyword: body.keyword,
      sources: JSON.stringify(body.sources),
      isScheduled: body.isScheduled,
      scheduleTime: body.scheduleTime,
      isActive: body.isActive,
    },
  });

  return NextResponse.json(topic);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED", message: "로그인이 필요합니다" }, { status: 401 });

  const { id } = await params;
  await prisma.topic.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
