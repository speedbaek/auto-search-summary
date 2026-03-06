import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.topic.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
