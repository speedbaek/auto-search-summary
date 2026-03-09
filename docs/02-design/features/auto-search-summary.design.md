# 자동검색요약앱 Design Document

> **Summary**: 토픽 등록 → 다중 플랫폼 검색 → 크롤링 → AI 요약 → 이메일 전송까지의 기술 설계
>
> **Project**: Auto Search Summary
> **Version**: 0.1.0
> **Author**: 백상희
> **Date**: 2026-03-06
> **Status**: Draft
> **Planning Doc**: [auto-search-summary.plan.md](../01-plan/features/auto-search-summary.plan.md)

---

## 1. Design Goals

- **심플**: 개인용이므로 과도한 추상화 없이 직관적 구조
- **안정성**: 크롤링 실패, API 오류에도 전체 플로우가 멈추지 않는 방어적 설계
- **병렬 처리**: 검색·크롤링을 병렬로 처리하여 5분 이내 완료
- **즉시 사용 가능**: 프로젝트 셋업부터 배포까지 바이브코딩으로 빠르게

---

## 2. Architecture

### 2.1 Component Diagram

```
┌──────────────────────────────────────────────────────────┐
│                    Next.js App (Vercel)                   │
├──────────────┬───────────────┬────────────────────────────┤
│  Pages/UI    │  API Routes   │  Cron Handler              │
│              │               │                            │
│  Dashboard   │  /api/topics  │  /api/cron/run             │
│  TopicForm   │  /api/search  │  (Vercel Cron 트리거)      │
│  ReportView  │  /api/reports │                            │
└──────┬───────┴───────┬───────┴──────────┬─────────────────┘
       │               │                  │
       │        ┌──────▼──────┐    ┌──────▼──────┐
       │        │  Features   │    │  Scheduler  │
       │        ├─────────────┤    └──────┬──────┘
       │        │ SearchEngine│           │
       │        │ Crawler     │◄──────────┘
       │        │ Summarizer  │
       │        │ Mailer      │
       │        └──────┬──────┘
       │               │
  ┌────▼───────────────▼────┐
  │     PostgreSQL (Prisma)  │
  └──────────────────────────┘
```

### 2.2 외부 서비스 의존성

| 서비스 | 용도 | 무료 쿼터 | 개인용 충분 여부 |
|--------|------|-----------|:---------------:|
| Google Custom Search API | 웹 검색 | 100회/일 | ✅ (토픽 10개 × 1회 = 10회) |
| Naver Search API | 블로그/뉴스 검색 | 25,000회/일 | ✅ |
| YouTube Data API v3 | 영상 검색 | 10,000 units/일 | ✅ |
| Claude API (Anthropic) | AI 요약 | 종량제 | ✅ (월 ~$10 예상) |
| Resend | 이메일 전송 | 100통/일 | ✅ |
| Vercel | 호스팅 + Cron | Hobby (무료) | ⚠️ Cron 1일 1회 |

---

## 3. Data Model (Prisma Schema)

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"              // 로컬 개발: SQLite, 배포: PostgreSQL 전환 가능
  url      = env("DATABASE_URL")   // SQLite: "file:./dev.db"
}

model Topic {
  id           String      @id @default(cuid())
  keyword      String                              // 검색어
  sources      String      @default("[\"google\",\"naver\",\"youtube\"]") // JSON string (SQLite 호환)
  isScheduled  Boolean     @default(false)
  scheduleTime String      @default("07:00")       // HH:MM
  isActive     Boolean     @default(true)
  lastRunAt    DateTime?
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  searchRuns   SearchRun[]
  reports      Report[]
}

model SearchRun {
  id           String      @id @default(cuid())
  topicId      String
  status       String      @default("pending")     // pending|searching|crawling|summarizing|completed|failed
  triggeredBy  String      @default("manual")      // manual|schedule
  startedAt    DateTime    @default(now())
  completedAt  DateTime?
  crawledCount Int         @default(0)
  errorLog     String?                                 // JSON string (SQLite 호환)

  topic        Topic       @relation(fields: [topicId], references: [id], onDelete: Cascade)
  report       Report?
}

model Report {
  id           String      @id @default(cuid())
  topicId      String
  searchRunId  String      @unique
  title        String                              // AI 생성 제목
  summary      String                              // 한줄 요약
  content      String                              // Markdown 요약 본문
  sources      String                              // JSON string: [{ title, url, platform }]
  isEmailed    Boolean     @default(false)
  createdAt    DateTime    @default(now())

  topic        Topic       @relation(fields: [topicId], references: [id], onDelete: Cascade)
  searchRun    SearchRun   @relation(fields: [searchRunId], references: [id], onDelete: Cascade)
}
```

### 3.1 Entity Relationships

```
[Topic] 1 ──── N [SearchRun] 1 ──── 0..1 [Report]
   │
   └── 1 ──── N [Report] (shortcut: 토픽에서 정리본 바로 조회)
```

---

## 4. API Specification

### 4.1 Endpoints

| Method | Path | Description | 인증 |
|--------|------|-------------|:----:|
| GET | `/api/topics` | 토픽 목록 조회 | ✅ |
| POST | `/api/topics` | 토픽 등록 | ✅ |
| PUT | `/api/topics/[id]` | 토픽 수정 | ✅ |
| DELETE | `/api/topics/[id]` | 토픽 삭제 | ✅ |
| POST | `/api/search/run` | 수동 검색 실행 (특정 토픽) | ✅ |
| GET | `/api/search/status/[runId]` | 검색 실행 상태 조회 (폴링용) | ✅ |
| GET | `/api/reports` | 정리본 목록 (query: topicId, page) | ✅ |
| GET | `/api/reports/[id]` | 정리본 상세 | ✅ |
| POST | `/api/reports/[id]/email` | 정리본 이메일 전송 | ✅ |
| POST | `/api/cron/run` | 스케줄 자동 실행 (Cron 전용) | CRON_SECRET |

### 4.2 주요 API 상세

#### `POST /api/search/run`

수동으로 특정 토픽의 검색을 실행한다.

```typescript
// Request
{ topicId: string }

// Response 202 Accepted
{ searchRunId: string, status: "searching" }
```

실행은 비동기. 클라이언트는 `/api/search/status/[runId]`를 폴링하여 진행 상태 확인.

#### `GET /api/search/status/[runId]`

```typescript
// Response
{
  id: string,
  status: "searching" | "crawling" | "summarizing" | "completed" | "failed",
  crawledCount: number,
  reportId?: string  // completed일 때만
}
```

#### `POST /api/cron/run`

Vercel Cron이 호출. `isScheduled === true && isActive === true`인 모든 토픽을 순차 실행.

```typescript
// Header: Authorization: Bearer ${CRON_SECRET}
// Response
{ executed: number, results: [{ topicId, status }] }
```

### 4.3 에러 응답 형식

```typescript
// 모든 에러는 이 형식
{
  error: string,    // "TOPIC_NOT_FOUND", "SEARCH_FAILED" 등
  message: string   // 사람이 읽을 수 있는 메시지
}
```

---

## 5. Feature Module 상세 설계

### 5.1 Search Engine (`src/features/search-engine/`)

각 플랫폼별 검색을 병렬로 수행하고 결과를 통합한다.

```typescript
// src/features/search-engine/types.ts
interface SearchResult {
  title: string
  url: string
  snippet: string
  platform: "google" | "naver" | "youtube"
  publishedAt?: string
}

// src/features/search-engine/index.ts
async function searchAll(keyword: string, sources: string[]): Promise<SearchResult[]>

// src/features/search-engine/google.ts
async function searchGoogle(keyword: string): Promise<SearchResult[]>
// Google Custom Search API → 상위 5개 결과

// src/features/search-engine/naver.ts
async function searchNaver(keyword: string): Promise<SearchResult[]>
// Naver Search API (blog + news) → 각 5개 = 최대 10개

// src/features/search-engine/youtube.ts
async function searchYoutube(keyword: string): Promise<SearchResult[]>
// YouTube Data API → 상위 5개 (제목 + 설명)
```

**병렬 실행 전략:**
```typescript
const results = await Promise.allSettled([
  sources.includes("google") ? searchGoogle(keyword) : [],
  sources.includes("naver") ? searchNaver(keyword) : [],
  sources.includes("youtube") ? searchYoutube(keyword) : [],
])
// 실패한 소스는 스킵, 성공한 것만 합침
```

### 5.2 Crawler (`src/features/crawler/`)

검색 결과 URL들의 본문 텍스트를 추출한다.

```typescript
// src/features/crawler/index.ts
async function crawlUrls(results: SearchResult[]): Promise<CrawledContent[]>

interface CrawledContent {
  url: string
  title: string
  platform: string
  text: string        // 추출된 본문 (최대 3000자)
  success: boolean
  error?: string
}
```

**크롤링 전략:**
- `fetch` + `cheerio`로 HTML 파싱
- `<article>`, `<main>`, `.post-content` 등 본문 영역 우선 추출
- 본문 추출 실패 시 → `<p>` 태그 텍스트 합산
- 그래도 실패 시 → `meta description` + 검색 스니펫으로 fallback
- **유튜브**: 크롤링 안 함, 검색 API에서 받은 제목+설명만 사용
- **타임아웃**: URL당 최대 10초
- **병렬 처리**: `Promise.allSettled` + 동시 5개 제한 (`p-limit`)
- **본문 길이 제한**: 페이지당 최대 3,000자 (Claude 토큰 절약)

```typescript
// 병렬 크롤링 (동시 5개)
import pLimit from 'p-limit'
const limit = pLimit(5)

const crawled = await Promise.allSettled(
  urls.map(url => limit(() => crawlPage(url)))
)
```

### 5.3 Summarizer (`src/features/summarizer/`)

크롤링된 콘텐츠를 Claude API로 요약·분석한다.

```typescript
// src/features/summarizer/index.ts
async function summarize(
  keyword: string,
  contents: CrawledContent[]
): Promise<SummaryResult>

interface SummaryResult {
  title: string       // AI가 생성한 리포트 제목
  summary: string     // 한줄 요약
  content: string     // Markdown 정리본
  sources: Source[]   // 출처 목록
}
```

**AI 프롬프트 설계:**

```
당신은 정보 큐레이션 전문가입니다.
아래 검색 결과들을 분석하여 "{keyword}"에 대한 오늘의 브리핑을 작성해주세요.

## 작성 규칙
1. **한줄 요약**: 오늘의 핵심을 한 문장으로
2. **주요 내용**: 3~5개 핵심 포인트를 각각 2~3문장으로 설명
3. **인사이트**: CEO 관점에서 주목할 점이나 시사점 1~2개
4. **출처**: 각 내용의 출처 URL을 [제목](URL) 형식으로 표기

## 톤
- 바쁜 경영자가 2분 안에 읽을 수 있는 분량
- 핵심만 간결하게, 불필요한 수식어 제거
- 한국어로 작성

## 수집된 콘텐츠
{각 CrawledContent의 title, url, text를 나열}
```

**토큰 관리:**
- 입력 텍스트 합산이 10,000자 초과 시, 각 콘텐츠를 2,000자로 재절삭
- Claude Sonnet 4 사용 (비용 효율 + 요약 품질 균형)
- 예상 비용: 토픽 1건당 ~$0.02 → 10토픽 × 30일 = ~$6/월

### 5.4 Mailer (`src/features/mailer/`)

```typescript
// src/features/mailer/index.ts
async function sendReportEmail(report: Report, recipientEmail: string): Promise<boolean>
```

**이메일 템플릿:**
- Resend + React Email 컴포넌트
- 정리본 Markdown → HTML 변환
- 깔끔한 이메일 레이아웃 (모바일 호환)
- 하단에 "앱에서 보기" 링크

### 5.5 Scheduler (`src/features/scheduler/`)

```typescript
// src/features/scheduler/index.ts
async function runScheduledTopics(): Promise<RunResult[]>
```

**Vercel Cron 설정:**
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/run",
      "schedule": "0 22 * * *"  // UTC 22:00 = KST 07:00
    }
  ]
}
```

**실행 로직:**
1. `isScheduled && isActive`인 토픽 전체 조회
2. 각 토픽을 순차 실행 (Vercel 함수 타임아웃 60초 고려)
3. 실패한 토픽은 1회 재시도
4. 각 결과 이메일 전송
5. 모든 토픽의 결과를 하나의 "오늘의 브리핑" 이메일로 합쳐서 발송 (옵션)

**Vercel Hobby Plan 대응:**
- Cron은 1일 1회만 가능 → 모든 토픽을 한번에 실행하는 방식으로 충분
- 함수 타임아웃 60초 → 토픽당 병렬 검색+크롤링+요약을 약 30초로 제한
- 토픽이 많으면 여러 번에 나눠 실행 (현실적으로 10개 미만이므로 문제 없음)

---

## 6. UI/UX Design

### 6.1 대시보드 (메인 페이지)

```
┌─────────────────────────────────────────────────┐
│  🔍 Auto Search Summary          [내 계정] [로그아웃] │
├─────────────────────────────────────────────────┤
│                                                 │
│  내 토픽                          [+ 새 토픽]   │
│  ─────────────────────────────────────────────  │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ 📌 AI 업무자동화 트렌드                  │   │
│  │ 마지막 실행: 오늘 07:00 | 스케줄: ON     │   │
│  │ ▸ "Claude 4.5 출시로 코딩 자동화가..."   │   │
│  │                    [실행] [정리본 보기]   │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ 📌 2026 세법 개정                        │   │
│  │ 마지막 실행: 오늘 07:00 | 스케줄: ON     │   │
│  │ ▸ "종합소득세 신고 간소화 제도가..."      │   │
│  │                    [실행] [정리본 보기]   │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ 📌 특허 출원 AI 활용                     │   │
│  │ 마지막 실행: 어제 07:00 | 스케줄: OFF    │   │
│  │ ▸ 정리본 없음                            │   │
│  │                    [실행] [정리본 보기]   │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 6.2 토픽 등록/편집

```
┌─────────────────────────────────────────────────┐
│  🔍 토픽 등록                         [← 뒤로]  │
├─────────────────────────────────────────────────┤
│                                                 │
│  검색어 *                                       │
│  ┌─────────────────────────────────────────┐   │
│  │ AI 업무자동화 트렌드                     │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  검색 소스                                      │
│  ☑ 구글    ☑ 네이버    ☑ 유튜브               │
│                                                 │
│  자동 스케줄                                    │
│  [ON ●───] 매일  [ 07:00 ▼ ] 에 실행           │
│                                                 │
│             [저장] [지금 바로 실행]              │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 6.3 정리본 뷰어

```
┌─────────────────────────────────────────────────┐
│  🔍 AI 업무자동화 트렌드              [← 뒤로]  │
│  2026-03-06 (오늘) | ◀ 어제  내일 ▶             │
├─────────────────────────────────────────────────┤
│                                                 │
│  📋 AI 업무자동화, 바이브코딩의 시대가 열린다   │
│                                                 │
│  > 한줄: Claude 4.5 출시와 함께 AI 코딩         │
│  > 도구의 실무 적용이 본격화되고 있다            │
│                                                 │
│  ─────────────────────────────────────────────  │
│                                                 │
│  ## 주요 내용                                   │
│                                                 │
│  **1. Claude 4.5 출시와 코딩 자동화**           │
│  Anthropic이 Claude 4.5를 출시하며 코딩         │
│  생산성이 2배 향상되었다고 발표...              │
│                                                 │
│  **2. 바이브코딩 실무 사례 증가**               │
│  국내 스타트업에서 바이브코딩으로 MVP를          │
│  2주 만에 완성한 사례가 공유...                 │
│                                                 │
│  **3. AI 에이전트 업무 적용**                   │
│  반복적인 데이터 수집, 보고서 작성 등을          │
│  AI 에이전트가 대체하는 사례가 늘어나고...      │
│                                                 │
│  ## 인사이트                                    │
│  경영컨설팅 업무 중 정기 보고서 작성,            │
│  세무 데이터 수집 등에 AI 에이전트를             │
│  도입하면 인건비 절감 효과가 클 것으로 보인다.  │
│                                                 │
│  ## 출처                                        │
│  • [Claude 4.5 릴리즈 노트](url) - Google       │
│  • [바이브코딩 실무 후기](url) - 네이버 블로그   │
│  • [AI 에이전트 활용법](url) - YouTube           │
│                                                 │
│  ─────────────────────────────────────────────  │
│  [📧 이메일로 보내기]  [🔄 다시 실행]           │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 6.4 검색 진행 상태 (모달/인라인)

```
┌───────────────────────────────┐
│  🔄 검색 실행 중...            │
│                               │
│  ✅ 구글 검색 완료 (5건)      │
│  ✅ 네이버 검색 완료 (8건)    │
│  ✅ 유튜브 검색 완료 (5건)    │
│  🔄 웹 페이지 크롤링 중...    │
│     ████████░░ 12/18          │
│  ⏳ AI 요약 대기 중            │
│                               │
│  [취소]                        │
└───────────────────────────────┘
```

### 6.5 Component List

| Component | Location | 역할 |
|-----------|----------|------|
| `TopicCard` | `src/components/topic-card.tsx` | 대시보드의 토픽 카드 |
| `TopicForm` | `src/components/topic-form.tsx` | 토픽 등록/편집 폼 |
| `ReportViewer` | `src/components/report-viewer.tsx` | 정리본 Markdown 렌더링 |
| `SearchProgress` | `src/components/search-progress.tsx` | 검색 진행 상태 표시 |
| `DateNavigator` | `src/components/date-navigator.tsx` | 정리본 날짜 네비게이션 |
| `SourceCheckbox` | `src/components/source-checkbox.tsx` | 검색 소스 선택 체크박스 |
| `ScheduleToggle` | `src/components/schedule-toggle.tsx` | 스케줄 ON/OFF + 시간 설정 |

---

## 7. Error Handling

| 상황 | 처리 방식 |
|------|-----------|
| Google API 실패 | 해당 소스 스킵, 나머지 소스 결과로 요약 진행 |
| Naver API 실패 | 해당 소스 스킵 |
| 개별 URL 크롤링 실패 | 해당 URL 스킵, 검색 스니펫으로 대체 |
| 모든 크롤링 실패 | 검색 결과 제목+스니펫만으로 AI 요약 시도 |
| Claude API 실패 | SearchRun status를 "failed"로 표시, UI에 에러 표시 |
| 이메일 전송 실패 | Report.isEmailed = false 유지, 다음 실행 시 재시도 안 함 (앱에서 수동 재전송) |
| Cron 실행 중 타임아웃 | 완료된 토픽까지만 저장, 나머지는 다음 날 실행 |

---

## 8. Security (개인용 최소)

- [x] NextAuth Google OAuth로 본인만 로그인
- [x] 허용된 이메일 주소를 환경변수로 제한 (`ALLOWED_EMAIL=sh.baek@...`)
- [x] API Routes에 세션 체크 미들웨어
- [x] Cron 엔드포인트는 `CRON_SECRET` 헤더 검증
- [x] API 키는 환경변수로만 관리 (코드에 하드코딩 금지)
- [ ] Rate Limiting → 불필요 (나만 씀)
- [ ] CSRF → NextAuth 기본 제공

---

## 9. Implementation Order (구현 순서)

### Phase 1: 기반 셋업 (1일)

```
1. [ ] Next.js 프로젝트 생성 (App Router)
2. [ ] Prisma 초기화 + PostgreSQL 연결
3. [ ] schema.prisma 작성 (Topic, SearchRun, Report)
4. [ ] NextAuth Google OAuth 설정
5. [ ] ALLOWED_EMAIL 환경변수로 접근 제한
6. [ ] shadcn/ui 설치 + 기본 레이아웃
```

### Phase 2: 토픽 CRUD (1~2일)

```
1. [ ] GET/POST/PUT/DELETE /api/topics 구현
2. [ ] 대시보드 페이지 (토픽 목록)
3. [ ] TopicForm 컴포넌트 (등록/편집)
4. [ ] TopicCard 컴포넌트 (목록 아이템)
```

### Phase 3: 검색 엔진 (2일)

```
1. [ ] Google Custom Search API 연동 (searchGoogle)
2. [ ] Naver Search API 연동 (searchNaver)
3. [ ] YouTube Data API 연동 (searchYoutube)
4. [ ] searchAll 통합 함수 (Promise.allSettled 병렬)
5. [ ] POST /api/search/run 엔드포인트
```

### Phase 4: 크롤러 (2~3일)

```
1. [ ] crawlPage 함수 (fetch + cheerio 본문 추출)
2. [ ] 본문 추출 로직 (article > main > p 태그 fallback)
3. [ ] p-limit으로 동시 5개 병렬 크롤링
4. [ ] 타임아웃 10초 + 에러 핸들링 (스킵 처리)
5. [ ] 본문 3000자 제한
```

### Phase 5: AI 요약 (2~3일)

```
1. [ ] Claude API 연동 (@ai-sdk/anthropic)
2. [ ] 요약 프롬프트 설계 + 테스트
3. [ ] summarize 함수 구현
4. [ ] Report DB 저장
5. [ ] 프롬프트 반복 튜닝 (실제 결과 보며 개선)
```

### Phase 6: UI (2일)

```
1. [ ] ReportViewer 컴포넌트 (Markdown 렌더링)
2. [ ] DateNavigator (이전/다음 날짜 이동)
3. [ ] SearchProgress 컴포넌트 (진행 상태 폴링)
4. [ ] 대시보드에 최신 정리본 미리보기 연결
5. [ ] GET /api/search/status/[runId] 폴링 구현
```

### Phase 7: 스케줄링 + 이메일 (2일)

```
1. [ ] Resend 연동 + 이메일 템플릿
2. [ ] POST /api/reports/[id]/email 구현
3. [ ] vercel.json Cron 설정
4. [ ] POST /api/cron/run 구현 (전체 토픽 순차 실행)
5. [ ] 실패 시 1회 재시도 로직
```

### Phase 8: 마무리 + 배포 (1~2일)

```
1. [ ] UI 다듬기 (반응형, 로딩 상태)
2. [ ] 에러 처리 점검
3. [ ] Vercel 배포
4. [ ] 환경변수 설정
5. [ ] 실제 토픽 등록하고 E2E 테스트
```

---

## 10. 파일 구조 최종

```
auto-search-summary/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # 대시보드
│   │   ├── topics/
│   │   │   ├── new/page.tsx            # 토픽 등록
│   │   │   └── [id]/page.tsx           # 토픽 상세
│   │   ├── reports/
│   │   │   └── [id]/page.tsx           # 정리본 뷰어
│   │   └── api/
│   │       ├── topics/
│   │       │   ├── route.ts            # GET, POST
│   │       │   └── [id]/route.ts       # PUT, DELETE
│   │       ├── search/
│   │       │   ├── run/route.ts        # POST (검색 실행)
│   │       │   └── status/[runId]/route.ts  # GET (상태 조회)
│   │       ├── reports/
│   │       │   ├── route.ts            # GET (목록)
│   │       │   └── [id]/
│   │       │       ├── route.ts        # GET (상세)
│   │       │       └── email/route.ts  # POST (이메일)
│   │       └── cron/
│   │           └── run/route.ts        # POST (스케줄 실행)
│   ├── components/
│   │   ├── ui/                         # shadcn/ui
│   │   ├── topic-card.tsx
│   │   ├── topic-form.tsx
│   │   ├── report-viewer.tsx
│   │   ├── search-progress.tsx
│   │   ├── date-navigator.tsx
│   │   ├── source-checkbox.tsx
│   │   └── schedule-toggle.tsx
│   ├── features/
│   │   ├── search-engine/
│   │   │   ├── index.ts               # searchAll
│   │   │   ├── google.ts
│   │   │   ├── naver.ts
│   │   │   ├── youtube.ts
│   │   │   └── types.ts
│   │   ├── crawler/
│   │   │   ├── index.ts               # crawlUrls
│   │   │   └── extractors.ts          # HTML 본문 추출
│   │   ├── summarizer/
│   │   │   ├── index.ts               # summarize
│   │   │   └── prompt.ts              # 프롬프트 템플릿
│   │   └── mailer/
│   │       ├── index.ts               # sendReportEmail
│   │       └── template.tsx           # React Email 템플릿
│   └── lib/
│       ├── prisma.ts                  # Prisma Client
│       ├── auth.ts                    # NextAuth 설정
│       └── utils.ts
├── vercel.json                        # Cron 설정
├── .env.local                         # 환경변수 (gitignore)
└── package.json
```

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-06 | Initial design | 백상희 |
