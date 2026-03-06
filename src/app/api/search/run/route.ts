import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
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

  // Start search asynchronously - don't await
  // Return immediately with the run info
  const resultPromise = executeSearch(topicId);

  // We can't truly fire-and-forget in Edge/Serverless easily,
  // so we await but return quickly with a polling endpoint
  const result = await resultPromise;

  return NextResponse.json(result, { status: 200 });
}
