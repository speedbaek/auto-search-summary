import { generateText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { CrawledContent } from "../crawler";

export interface SummaryResult {
  title: string;
  summary: string;
  content: string;
  sources: { title: string; url: string; platform: string }[];
}

const MAX_TOTAL_INPUT = 10000;
const MAX_PER_CONTENT = 1500;

function prepareContents(contents: CrawledContent[]): string {
  const successful = contents.filter((c) => c.text.length > 0).slice(0, 5);

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

  const systemPrompt = `당신은 검색 결과를 분석하여 학습 자료를 작성하는 전문가입니다.
반드시 아래 JSON 형식으로만 응답하세요. JSON 외의 텍스트를 포함하지 마세요.
{"title":"제목","summary":"한줄요약","content":"마크다운 본문"}`;

  const userPrompt = `"${keyword}" 검색 결과를 분석하여 학습 자료를 작성하세요.

규칙:
- 한국어 작성, 전문용어 영문 병기
- 핵심 내용 **bold** 처리
- 각 섹션 끝에 출처 URL 표기
- 문단은 1~2문장씩 빈 줄로 분리

구조: 핵심개요(3문장) → 주요내용(3~4개 섹션, 각 3~4문장+출처) → 실무 적용(3개 액션아이템)

검색 결과:
${preparedText}`;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }

  const anthropic = createAnthropic({ apiKey });

  console.log(`[Summarizer] Calling Claude API, input length: ${userPrompt.length}`);

  const { text } = await generateText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: systemPrompt,
    prompt: userPrompt,
    maxOutputTokens: 2000,
  });

  console.log(`[Summarizer] Response received, length: ${text.length}, starts with: ${text.slice(0, 100)}`);

  // Parse JSON response with fallback
  const sources = contents
    .filter((c) => c.success || c.text.length > 0)
    .map((c) => ({
      title: c.title,
      url: c.url,
      platform: c.platform,
    }));

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        title: parsed.title || `${keyword} 학습 자료`,
        summary: parsed.summary || "",
        content: parsed.content || text,
        sources,
      };
    }
  } catch (e) {
    console.warn("[Summarizer] JSON parse failed, using raw text as content");
  }

  // Fallback: use raw text as content
  return {
    title: `${keyword} 학습 자료`,
    summary: `${keyword}에 대한 검색 결과 요약`,
    content: text,
    sources,
  };
}
