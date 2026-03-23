import { generateObject } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { CrawledContent } from "../crawler";

export interface SummaryResult {
  title: string;
  summary: string;
  content: string;
  sources: { title: string; url: string; platform: string }[];
}

const MAX_TOTAL_INPUT = 15000;
const MAX_PER_CONTENT = 1500;

const summarySchema = z.object({
  title: z.string().describe("학습 자료 제목"),
  summary: z.string().describe("한 줄 요약 (1~2문장)"),
  content: z.string().describe("마크다운 형식의 본문"),
});

function prepareContents(contents: CrawledContent[]): string {
  const successful = contents.filter((c) => c.text.length > 0).slice(0, 10);

  return successful
    .map(
      (c, i) =>
        `[${i + 1}] ${c.title} (${c.url})\n${c.text.slice(0, MAX_PER_CONTENT)}`
    )
    .join("\n---\n")
    .slice(0, MAX_TOTAL_INPUT);
}

export async function summarize(
  keyword: string,
  contents: CrawledContent[]
): Promise<SummaryResult> {
  const preparedText = prepareContents(contents);

  const today = new Date().toISOString().split("T")[0];
  const systemPrompt = `당신은 검색 결과를 분석하여 최신 기술 동향 학습 자료를 작성하는 전문가입니다.
오늘 날짜: ${today}. 최신 정보를 우선하고, 오래된 내용은 제외하세요.
각 내용에 출처의 발행일이 있으면 반드시 표기하세요.`;

  const userPrompt = `"${keyword}" 검색 결과를 분석하여 학습 자료를 작성하세요.

규칙:
- 한국어 작성, 전문용어 영문 병기
- 핵심 내용 **bold** 처리
- 각 섹션 끝에 출처 URL과 발행일 표기
- 문단은 1~2문장씩 빈 줄로 분리
- 최근 발행된 자료를 우선 인용하고, 3개월 이상 된 내용은 가급적 제외
- 기술 트렌드의 경우 "2026년 3월 기준" 등 시점을 명시

구조: 핵심개요(3문장, 현재 시점 요약) → 주요내용(3~4개 섹션, 각 3~4문장+출처+날짜) → 실무 적용(3개 액션아이템)

검색 결과:
${preparedText}`;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }

  const anthropic = createAnthropic({ apiKey });

  console.log(`[Summarizer] Calling Claude API, input length: ${userPrompt.length}`);

  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-20250514"),
    system: systemPrompt,
    prompt: userPrompt,
    schema: summarySchema,
    maxOutputTokens: 3000,
  });

  console.log(`[Summarizer] Response received: title="${object.title}", content length=${object.content.length}`);

  const sources = contents
    .filter((c) => c.success || c.text.length > 0)
    .map((c) => ({
      title: c.title,
      url: c.url,
      platform: c.platform,
    }));

  return {
    title: object.title || `${keyword} 학습 자료`,
    summary: object.summary || "",
    content: object.content,
    sources,
  };
}
