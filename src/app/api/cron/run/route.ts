import { NextResponse } from "next/server";
import { runScheduledTopics } from "@/features/scheduler";

// Vercel Hobby: max 60s
export const maxDuration = 60;

export async function POST(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "Invalid CRON_SECRET" },
      { status: 401 }
    );
  }

  const results = await runScheduledTopics();

  return NextResponse.json({
    executed: results.length,
    results: results.map((r) => ({
      topicId: r.topicId,
      keyword: r.keyword,
      status: r.status,
    })),
  });
}
