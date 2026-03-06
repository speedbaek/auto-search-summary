import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendReportEmail } from "@/features/mailer";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "로그인이 필요합니다" },
      { status: 401 }
    );
  }

  const { id } = await params;

  const report = await prisma.report.findUnique({ where: { id } });
  if (!report) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "정리본을 찾을 수 없습니다" },
      { status: 404 }
    );
  }

  const success = await sendReportEmail(
    {
      title: report.title,
      summary: report.summary,
      content: report.content,
      sources: JSON.parse(report.sources) as { title: string; url: string; platform: string }[],
    },
    session.user.email
  );

  if (!success) {
    return NextResponse.json(
      { error: "EMAIL_FAILED", message: "이메일 전송에 실패했습니다" },
      { status: 500 }
    );
  }

  await prisma.report.update({
    where: { id },
    data: { isEmailed: true },
  });

  return NextResponse.json({ success: true });
}
