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
const MAX_PER_CONTENT = 2000;

function prepareContents(contents: CrawledContent[]): string {
  const successful = contents.filter((c) => c.text.length > 0);

  const totalLength = successful.reduce((sum, c) => sum + c.text.length, 0);

  const perContentLimit =
    totalLength > MAX_TOTAL_INPUT ? MAX_PER_CONTENT : MAX_TEXT_LENGTH;

  return successful
    .map(
      (c, i) =>
        `### 출처 ${i + 1}: ${c.title}\nURL: ${c.url}\n플랫폼: ${c.platform}\n\n${c.text.slice(0, perContentLimit)}`
    )
    .join("\n\n---\n\n");
}

const MAX_TEXT_LENGTH = 3000;

export async function summarize(
  keyword: string,
  contents: CrawledContent[]
): Promise<SummaryResult> {
  const preparedText = prepareContents(contents);

  const prompt = `당신은 정보 큐레이션 전문가입니다.
아래 검색 결과들을 분석하여 "${keyword}"에 대한 오늘의 브리핑을 작성해주세요.

## 작성 규칙
1. **제목**: "${keyword}" 관련 오늘의 브리핑 제목 (한 줄)
2. **한줄 요약**: 오늘의 핵심을 한 문장으로
3. **주요 내용**: 3~5개 핵심 포인트를 각각 2~3문장으로 설명
4. **인사이트**: CEO 관점에서 주목할 점이나 시사점 1~2개
5. **출처**: 각 내용의 출처를 [제목](URL) 형식으로 표기

## 톤
- 바쁜 경영자가 2분 안에 읽을 수 있는 분량
- 핵심만 간결하게, 불필요한 수식어 제거
- 한국어로 작성

## 응답 형식
반드시 아래 JSON 형식으로만 응답하세요:
{
  "title": "브리핑 제목",
  "summary": "한줄 요약",
  "content": "## 주요 내용\\n\\n### 1. ...\\n\\n..."
}

## 수집된 콘텐츠
${preparedText}`;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }

  const anthropic = createAnthropic({
    apiKey,
    baseURL: "https://api.anthropic.com/v1",
  });

  const { text } = await generateText({
    model: anthropic("claude-sonnet-4-20250514"),
    prompt,
    maxOutputTokens: 2000,
  });

  // Parse JSON response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("AI response is not valid JSON");
  }

  const parsed = JSON.parse(jsonMatch[0]);

  const sources = contents
    .filter((c) => c.success || c.text.length > 0)
    .map((c) => ({
      title: c.title,
      url: c.url,
      platform: c.platform,
    }));

  return {
    title: parsed.title || `${keyword} 브리핑`,
    summary: parsed.summary || "",
    content: parsed.content || text,
    sources,
  };
}
