import { generateText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { CrawledContent } from "../crawler";

export interface SummaryResult {
  title: string;
  summary: string;
  content: string;
  sources: { title: string; url: string; platform: string }[];
}

const MAX_TOTAL_INPUT = 40000;
const MAX_PER_CONTENT = 6000;
const MAX_TEXT_LENGTH = 8000;

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

export async function summarize(
  keyword: string,
  contents: CrawledContent[]
): Promise<SummaryResult> {
  const preparedText = prepareContents(contents);

  const prompt = `당신은 해당 분야 전문 리서처이자 교육 콘텐츠 작성자입니다.
아래 검색 결과들을 심층 분석하여 "${keyword}"에 대한 **학습용 정리 자료**를 작성해주세요.

## 작성 목표
- 이 자료만 읽으면 "${keyword}"의 현재 트렌드, 핵심 개념, 실무 적용 방법까지 파악할 수 있어야 합니다.
- 단순 요약이 아닌, **내용을 깊이 있게 설명**하고 구체적 사례와 데이터를 포함하세요.
- 각 섹션 끝에 해당 내용의 출처 링크를 **인라인**으로 표기하세요.

## 작성 규칙

### 1. 제목
"${keyword}" 관련 학습 자료 제목 (한 줄, 흥미를 끄는 표현)

### 2. 한줄 요약
오늘의 핵심을 한 문장으로 (구체적 수치나 키워드 포함)

### 3. 핵심 개요 (Overview)
- "${keyword}"가 왜 지금 중요한지, 전체 맥락을 3~4문장으로 설명

### 4. 주요 내용 (5~8개 섹션)
각 섹션은 반드시 다음을 포함:
- **소제목**: 핵심 포인트를 명확히 드러내는 제목
- **본문**: 5~8문장으로 상세하게 설명. 구체적 사례, 수치, 도구명, 기업명 등을 적극 포함
- **핵심 포인트**: 해당 섹션에서 기억할 1~2가지를 "> 💡" 인용 블록으로 정리
- **출처**: 해당 내용이 나온 원문 링크를 "📎 출처: [제목](URL)" 형식으로 섹션 바로 아래에 표기

### 5. 실무 적용 가이드
- 이 내용을 실무에 어떻게 적용할 수 있는지 3~5개 구체적 액션 아이템
- 가능하면 단계별 접근법 포함

### 6. 용어 정리
- 본문에 등장한 전문 용어 3~5개를 간단히 설명

### 7. 더 알아보기
- 본문에서 다루지 못한 관련 주제 2~3개를 짧게 언급

## 톤
- 학습자가 이 자료로 공부할 수 있는 교재 수준의 상세함
- 핵심 내용은 굵게(**bold**) 처리하여 스캔 가능하게
- 한국어로 작성, 전문 용어는 영문 병기

## 가독성 규칙 (최우선 규칙 - 반드시 지켜야 함)
절대로 3문장 이상을 하나의 문단에 넣지 마세요!
모든 본문은 아래 형식을 반드시 따르세요:

[소제목]

[1~2문장 문단]

[1~2문장 문단]

[1~2문장 문단]

[💡 인용 블록]

이처럼 **각 문단 사이에 반드시 빈 줄을 하나 넣어** 문단을 시각적으로 분리하세요.
3문장 이상이 빈 줄 없이 연속되면 실패입니다.

## 분량
- 최소 3000자 이상의 충실한 내용 (단, 불필요한 반복은 제외)

## 출처 표기 방식 (매우 중요)
- 각 섹션의 내용이 끝난 직후, 해당 내용의 출처를 "📎 출처: [제목](URL)" 형식으로 바로 표기
- 하나의 섹션에 여러 출처가 있으면 여러 줄로 표기
- 마지막에 출처를 모아두지 마세요. 반드시 인라인으로!

## 응답 형식
반드시 아래 JSON 형식으로만 응답하세요:
{
  "title": "학습 자료 제목",
  "summary": "한줄 요약",
  "content": "## 핵심 개요\\n\\n...\\n\\n## 주요 내용\\n\\n### 1. ...\\n\\n...\\n\\n📎 출처: [제목](URL)\\n\\n### 2. ...\\n\\n..."
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
    maxOutputTokens: 8000,
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
    title: parsed.title || `${keyword} 학습 자료`,
    summary: parsed.summary || "",
    content: parsed.content || text,
    sources,
  };
}
