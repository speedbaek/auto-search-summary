# auto-search-summary Analysis Report

> **Analysis Type**: Gap Analysis (Design vs Implementation)
>
> **Project**: Auto Search Summary
> **Version**: 0.1.0
> **Date**: 2026-03-09
> **Design Doc**: [auto-search-summary.design.md](../../02-design/features/auto-search-summary.design.md)

---

## 1. Analysis Overview

### 1.1 Analysis Purpose

Verify the implementation matches the design document across all layers: API endpoints, data model, feature modules, UI components, file structure, and infrastructure configuration.

### 1.2 Analysis Scope

- **Design Document**: `docs/02-design/features/auto-search-summary.design.md`
- **Implementation Path**: `src/`, `prisma/schema.prisma`, `vercel.json`, `package.json`
- **Analysis Date**: 2026-03-09

---

## 2. Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| API Endpoints | 90% | ✅ |
| Data Model | 78% | ⚠️ |
| Feature Modules | 85% | ⚠️ |
| UI Components | 62% | ⚠️ |
| File Structure | 82% | ⚠️ |
| Infrastructure (vercel.json, package.json) | 95% | ✅ |
| Security/Auth | 100% | ✅ |
| **Overall Match Rate** | **82%** | ⚠️ |

---

## 3. API Endpoint Comparison

### 3.1 Endpoint Match

| Method | Design Path | Implementation File | Status | Notes |
|--------|------------|---------------------|--------|-------|
| GET | `/api/topics` | `src/app/api/topics/route.ts` | ✅ Match | |
| POST | `/api/topics` | `src/app/api/topics/route.ts` | ✅ Match | |
| PUT | `/api/topics/[id]` | `src/app/api/topics/[id]/route.ts` | ✅ Match | |
| DELETE | `/api/topics/[id]` | `src/app/api/topics/[id]/route.ts` | ✅ Match | |
| POST | `/api/search/run` | `src/app/api/search/run/route.ts` | ✅ Match | |
| GET | `/api/search/status/[runId]` | `src/app/api/search/status/[runId]/route.ts` | ✅ Match | |
| GET | `/api/reports` | `src/app/api/reports/route.ts` | ✅ Match | |
| GET | `/api/reports/[id]` | `src/app/api/reports/[id]/route.ts` | ✅ Match | |
| POST | `/api/reports/[id]/email` | `src/app/api/reports/[id]/email/route.ts` | ✅ Match | |
| POST | `/api/cron/run` | `src/app/api/cron/run/route.ts` | ✅ Match | |

**10/10 endpoints implemented.** All API routes match.

### 3.2 API Behavior Differences

| Endpoint | Design | Implementation | Impact |
|----------|--------|----------------|--------|
| `POST /api/search/run` | Returns 202 + `{ searchRunId, status: "searching" }` (async) | Returns 200 + full `RunResult` after completion (sync) | **High** - Design specifies async fire-and-forget with polling; implementation awaits full completion before responding |
| `POST /api/search/run` | Response field: `searchRunId` | Response field: `reportId`, `topicId`, `keyword`, `status` | **Medium** - Different response shape |
| `POST /api/cron/run` | Response: `{ executed, results: [{ topicId, status }] }` | Response: `{ executed, results: [{ topicId, keyword, status }] }` | **Low** - Extra `keyword` field added |
| Error format | `{ error: string, message: string }` | Mixed: some use `{ error: "Unauthorized" }` alone, some use `{ error, message }` | **Medium** - Inconsistent error format in `/api/topics/route.ts` |

### 3.3 API Score: 90%

All 10 endpoints exist. Deductions for async-vs-sync behavior mismatch on search/run and inconsistent error format.

---

## 4. Data Model Comparison

### 4.1 Entity Comparison

| Design Entity | Prisma Model | Status |
|--------------|--------------|--------|
| Topic | Topic | ✅ |
| SearchRun | SearchRun | ✅ |
| Report | Report | ✅ |
| (Auth models) | Account, Session, User, VerificationToken | ✅ Added (NextAuth requirement) |

### 4.2 Database Provider

| Item | Design | Implementation | Impact |
|------|--------|----------------|--------|
| DB Provider | `postgresql` | `sqlite` | **High** - Design specifies PostgreSQL; implementation uses SQLite |

### 4.3 Topic Model Field Comparison

| Field | Design Type | Impl Type | Status | Notes |
|-------|------------|-----------|--------|-------|
| id | String @id @default(cuid()) | String @id @default(cuid()) | ✅ | |
| keyword | String | String | ✅ | |
| sources | String[] @default(["google","naver","youtube"]) | String @default("[...]") | ⚠️ Changed | Design uses String array; implementation uses JSON string. SQLite does not support arrays. |
| isScheduled | Boolean @default(false) | Boolean @default(false) | ✅ | |
| scheduleTime | String @default("07:00") | String @default("07:00") | ✅ | |
| isActive | Boolean @default(true) | Boolean @default(true) | ✅ | |
| lastRunAt | DateTime? | DateTime? | ✅ | |
| createdAt | DateTime @default(now()) | DateTime @default(now()) | ✅ | |
| updatedAt | DateTime @updatedAt | DateTime @updatedAt | ✅ | |
| searchRuns | SearchRun[] | SearchRun[] | ✅ | |
| reports | Report[] | Report[] | ✅ | |

### 4.4 SearchRun Model Field Comparison

| Field | Design Type | Impl Type | Status | Notes |
|-------|------------|-----------|--------|-------|
| id | String @id @default(cuid()) | String @id @default(cuid()) | ✅ | |
| topicId | String | String | ✅ | |
| status | String @default("pending") | String @default("pending") | ✅ | |
| triggeredBy | String @default("manual") | String @default("manual") | ✅ | |
| startedAt | DateTime @default(now()) | DateTime @default(now()) | ✅ | |
| completedAt | DateTime? | DateTime? | ✅ | |
| crawledCount | Int @default(0) | Int @default(0) | ✅ | |
| errorLog | Json? | String? | ⚠️ Changed | Design uses Json type; implementation uses String (SQLite limitation) |
| topic | Relation | Relation | ✅ | |
| report | Report? | Report? | ✅ | |

### 4.5 Report Model Field Comparison

| Field | Design Type | Impl Type | Status | Notes |
|-------|------------|-----------|--------|-------|
| id | String @id @default(cuid()) | String @id @default(cuid()) | ✅ | |
| topicId | String | String | ✅ | |
| searchRunId | String @unique | String @unique | ✅ | |
| title | String | String | ✅ | |
| summary | String | String | ✅ | |
| content | String | String | ✅ | |
| sources | Json | String | ⚠️ Changed | Design uses Json type; implementation uses String (SQLite limitation) |
| isEmailed | Boolean @default(false) | Boolean @default(false) | ✅ | |
| createdAt | DateTime @default(now()) | DateTime @default(now()) | ✅ | |
| topic | Relation | Relation | ✅ | |
| searchRun | Relation | Relation | ✅ | |

### 4.6 Data Model Score: 78%

All 3 entities exist with correct relationships. Deductions for: SQLite instead of PostgreSQL (all Json/Array field type changes are downstream effects of this decision), and 3 field type changes (sources array to string, errorLog Json to String, sources Json to String).

---

## 5. Feature Module Comparison

### 5.1 Search Engine (`src/features/search-engine/`)

| Design Item | Implementation | Status |
|-------------|----------------|--------|
| `types.ts` with SearchResult interface | `types.ts` - exact match | ✅ |
| `index.ts` with searchAll() | `index.ts` - matches design | ✅ |
| `google.ts` with searchGoogle() | `google.ts` - top 5 results, Google CSE API | ✅ |
| `naver.ts` with searchNaver() | `naver.ts` - blog+news, 5 each | ✅ |
| `youtube.ts` with searchYoutube() | `youtube.ts` - top 5 results | ✅ |
| Promise.allSettled parallel execution | Implemented correctly | ✅ |
| Failed source skip, success-only merge | Implemented correctly | ✅ |

**Search Engine Score: 100%**

### 5.2 Crawler (`src/features/crawler/`)

| Design Item | Implementation | Status |
|-------------|----------------|--------|
| `index.ts` with crawlUrls() | `index.ts` - matches design | ✅ |
| CrawledContent interface | Exact match (url, title, platform, text, success, error?) | ✅ |
| `extractors.ts` separate file | Not created - extraction logic embedded in `index.ts` | ⚠️ Changed |
| fetch + cheerio for HTML parsing | Implemented correctly | ✅ |
| Priority selectors: article > main > .post-content > p tags | Implemented with extended selectors | ✅ |
| Meta description fallback | Implemented (meta name + og:description) | ✅ |
| YouTube: no crawl, use snippet | Implemented correctly | ✅ |
| 10s timeout per URL | `CRAWL_TIMEOUT = 10000` | ✅ |
| p-limit concurrency 5 | `CONCURRENCY = 5` with p-limit | ✅ |
| Max text 3000 chars | `MAX_TEXT_LENGTH = 3000` | ✅ |

**Crawler Score: 95%** (minor: extractors.ts merged into index.ts)

### 5.3 Summarizer (`src/features/summarizer/`)

| Design Item | Implementation | Status |
|-------------|----------------|--------|
| `index.ts` with summarize() | `index.ts` - matches design | ✅ |
| SummaryResult interface | Matches (title, summary, content, sources) | ✅ |
| `prompt.ts` separate file | Not created - prompt embedded in `index.ts` | ⚠️ Changed |
| AI prompt matching design spec | Core rules match (1-line summary, 3-5 points, insights, sources) | ✅ |
| 10000 char total input limit | `MAX_TOTAL_INPUT = 10000` | ✅ |
| 2000 char per content when over limit | `MAX_PER_CONTENT = 2000` | ✅ |
| Claude Sonnet 4 model | `anthropic("claude-sonnet-4-20250514")` | ✅ |
| @ai-sdk/anthropic usage | Implemented with ai + @ai-sdk/anthropic | ✅ |

**Summarizer Score: 95%** (minor: prompt.ts merged into index.ts)

### 5.4 Mailer (`src/features/mailer/`)

| Design Item | Implementation | Status |
|-------------|----------------|--------|
| `index.ts` with sendReportEmail() | `index.ts` - matches design | ✅ |
| Resend integration | Resend SDK used correctly | ✅ |
| `template.tsx` React Email component | Not created - inline HTML in index.ts | ⚠️ Changed |
| Markdown to HTML conversion | Basic Markdown-to-HTML conversion implemented | ✅ |
| Mobile-compatible layout | max-width:600px responsive design | ✅ |
| "View in app" link at bottom | Not implemented | ❌ Missing |

**Mailer Score: 75%**

### 5.5 Scheduler (`src/features/scheduler/`)

| Design Item | Implementation | Status |
|-------------|----------------|--------|
| `index.ts` with runScheduledTopics() | `index.ts` - matches design | ✅ |
| Query isScheduled && isActive topics | Implemented correctly | ✅ |
| Sequential execution | Implemented with for-of loop | ✅ |
| Failure retry (1 attempt) | Not implemented | ❌ Missing |
| Email send for each result | Implemented correctly | ✅ |
| Combined "daily briefing" email option | Not implemented | ❌ Missing |
| executeSearch() helper function | Implemented (exported, also used by /api/search/run) | ✅ |

**Scheduler Score: 70%**

### 5.6 Feature Module Overall Score: 85%

---

## 6. UI/Page Comparison

### 6.1 Page Routes

| Design Page | Design Path | Implementation | Status |
|-------------|------------|----------------|--------|
| Dashboard (main) | `src/app/page.tsx` | `src/app/page.tsx` | ✅ |
| Topic registration | `src/app/topics/new/page.tsx` | `src/app/topics/new/page.tsx` | ✅ |
| Topic detail/edit | `src/app/topics/[id]/page.tsx` | Not implemented | ❌ Missing |
| Report viewer | `src/app/reports/[id]/page.tsx` | `src/app/reports/[id]/page.tsx` | ✅ |

### 6.2 Component Comparison

| Design Component | Design Location | Implementation | Status |
|------------------|----------------|----------------|--------|
| TopicCard | `src/components/topic-card.tsx` | `src/components/topic-card.tsx` | ✅ |
| TopicForm | `src/components/topic-form.tsx` | `src/components/topic-form.tsx` | ✅ |
| ReportViewer | `src/components/report-viewer.tsx` | Inline in `src/app/reports/[id]/page.tsx` | ⚠️ Changed - not extracted as component |
| SearchProgress | `src/components/search-progress.tsx` | Not implemented | ❌ Missing |
| DateNavigator | `src/components/date-navigator.tsx` | Not implemented | ❌ Missing |
| SourceCheckbox | `src/components/source-checkbox.tsx` | Inline in TopicForm | ⚠️ Changed - not extracted |
| ScheduleToggle | `src/components/schedule-toggle.tsx` | Inline in TopicForm | ⚠️ Changed - not extracted |
| - | - | `src/components/header.tsx` | ⚠️ Added (not in design) |
| - | - | `src/components/dashboard-client.tsx` | ⚠️ Added (not in design) |
| shadcn/ui | `src/components/ui/` | Not installed (directory missing) | ❌ Missing |

### 6.3 UI Behavior Gaps

| Design Feature | Status | Notes |
|----------------|--------|-------|
| Search progress modal with per-step status (searching/crawling/summarizing progress bar) | ❌ Missing | TopicCard shows basic status text but no dedicated SearchProgress component with crawl count progress |
| Date navigation on report viewer (previous/next day) | ❌ Missing | No DateNavigator component |
| Topic edit page (`/topics/[id]`) | ❌ Missing | No page exists for editing existing topics |

### 6.4 UI Score: 62%

Major gaps: 3 designed components not implemented, 1 page missing, shadcn/ui not installed, SearchProgress UX significantly simplified.

---

## 7. File Structure Comparison

### 7.1 Designed vs Actual

| Design Path | Exists | Notes |
|-------------|:------:|-------|
| `prisma/schema.prisma` | ✅ | |
| `src/app/layout.tsx` | ✅ | |
| `src/app/page.tsx` | ✅ | |
| `src/app/topics/new/page.tsx` | ✅ | |
| `src/app/topics/[id]/page.tsx` | ❌ | Topic detail/edit page missing |
| `src/app/reports/[id]/page.tsx` | ✅ | |
| `src/app/api/topics/route.ts` | ✅ | |
| `src/app/api/topics/[id]/route.ts` | ✅ | |
| `src/app/api/search/run/route.ts` | ✅ | |
| `src/app/api/search/status/[runId]/route.ts` | ✅ | |
| `src/app/api/reports/route.ts` | ✅ | |
| `src/app/api/reports/[id]/route.ts` | ✅ | |
| `src/app/api/reports/[id]/email/route.ts` | ✅ | |
| `src/app/api/cron/run/route.ts` | ✅ | |
| `src/components/ui/` | ❌ | shadcn/ui not installed |
| `src/components/topic-card.tsx` | ✅ | |
| `src/components/topic-form.tsx` | ✅ | |
| `src/components/report-viewer.tsx` | ❌ | Logic embedded in page |
| `src/components/search-progress.tsx` | ❌ | Not implemented |
| `src/components/date-navigator.tsx` | ❌ | Not implemented |
| `src/components/source-checkbox.tsx` | ❌ | Inline in TopicForm |
| `src/components/schedule-toggle.tsx` | ❌ | Inline in TopicForm |
| `src/features/search-engine/index.ts` | ✅ | |
| `src/features/search-engine/google.ts` | ✅ | |
| `src/features/search-engine/naver.ts` | ✅ | |
| `src/features/search-engine/youtube.ts` | ✅ | |
| `src/features/search-engine/types.ts` | ✅ | |
| `src/features/crawler/index.ts` | ✅ | |
| `src/features/crawler/extractors.ts` | ❌ | Merged into index.ts |
| `src/features/summarizer/index.ts` | ✅ | |
| `src/features/summarizer/prompt.ts` | ❌ | Merged into index.ts |
| `src/features/mailer/index.ts` | ✅ | |
| `src/features/mailer/template.tsx` | ❌ | Inline HTML template |
| `src/lib/prisma.ts` | ✅ | |
| `src/lib/auth.ts` | ✅ | |
| `src/lib/utils.ts` | ✅ | |
| `vercel.json` | ✅ | |
| `.env.example` | ✅ | Design says `.env.local` only; .env.example is a good addition |

**Designed files: 36 | Existing: 27 | Missing: 9**

Extra files not in design:
- `src/components/header.tsx`
- `src/components/dashboard-client.tsx`
- `src/app/api/auth/[...nextauth]/route.ts`
- `src/app/globals.css`
- `.env.example`

### 7.2 File Structure Score: 82%

---

## 8. Infrastructure Comparison

### 8.1 vercel.json

| Item | Design | Implementation | Status |
|------|--------|----------------|--------|
| Cron path | `/api/cron/run` | `/api/cron/run` | ✅ |
| Schedule | `0 22 * * *` (UTC 22:00 = KST 07:00) | `0 22 * * *` | ✅ |

### 8.2 package.json Dependencies

| Design Dependency | Installed | Status |
|-------------------|:---------:|--------|
| next (App Router) | next@16.1.6 | ✅ |
| prisma + @prisma/client | prisma@6.19.2 | ✅ |
| next-auth | next-auth@5.0.0-beta.30 | ✅ |
| @ai-sdk/anthropic | @ai-sdk/anthropic@3.0.58 | ✅ |
| cheerio | cheerio@1.2.0 | ✅ |
| p-limit | p-limit@7.3.0 | ✅ |
| resend | resend@6.9.3 | ✅ |
| react-markdown | react-markdown@10.1.0 | ✅ |
| shadcn/ui components | Not installed (no @radix-ui packages) | ❌ Missing |
| React Email (@react-email) | Not installed | ❌ Missing |

### 8.3 Infrastructure Score: 95%

Core dependencies all present. Missing shadcn/ui and React Email libraries (impacts UI layer).

---

## 9. Security Comparison

| Design Security Item | Implementation | Status |
|---------------------|----------------|--------|
| NextAuth Google OAuth | `src/lib/auth.ts` with Google provider | ✅ |
| ALLOWED_EMAIL restriction | Implemented in signIn callback | ✅ |
| API Routes session check | All API routes check `auth()` session | ✅ |
| Cron endpoint CRON_SECRET verification | `Bearer ${CRON_SECRET}` header check | ✅ |
| API keys in env vars only | All keys read from `process.env` | ✅ |

**Security Score: 100%**

---

## 10. Error Handling Comparison

| Design Error Scenario | Implementation | Status |
|----------------------|----------------|--------|
| Google API failure: skip source | searchGoogle returns [] on missing config, throws on API error (caught by allSettled) | ✅ |
| Naver API failure: skip source | Same pattern as Google | ✅ |
| Individual URL crawl failure: skip URL | crawlPage returns `success: false` with snippet fallback | ✅ |
| All crawling fails: use snippets for AI summary | Summarizer receives all CrawledContent regardless of success flag | ✅ |
| Claude API failure: mark SearchRun as "failed" | executeSearch catch block sets status="failed" | ✅ |
| Email send failure: isEmailed stays false | sendReportEmail returns false, report not updated | ✅ |
| Cron timeout: save completed topics | Sequential execution; completed topics are saved before next starts | ✅ |

**Error Handling Score: 100%**

---

## 11. Differences Found

### 11.1 Missing Features (Design O, Implementation X)

| # | Item | Design Location | Description |
|---|------|----------------|-------------|
| 1 | Topic detail/edit page | design.md Section 10 line `src/app/topics/[id]/page.tsx` | Page for editing existing topics not implemented |
| 2 | SearchProgress component | design.md Section 6.4 + 6.5 | Dedicated search progress modal/component with per-step progress bar not implemented |
| 3 | DateNavigator component | design.md Section 6.3 + 6.5 | Previous/next day navigation on report viewer not implemented |
| 4 | Scheduler failure retry | design.md Section 5.5 | "Failed topic 1-time retry" not implemented |
| 5 | Combined daily briefing email | design.md Section 5.5 | Option to merge all topic results into single email not implemented |
| 6 | Mailer "View in app" link | design.md Section 5.4 | Email footer link to view report in app not implemented |
| 7 | shadcn/ui component library | design.md Section 9 Phase 1 | Not installed; all UI is hand-crafted Tailwind |
| 8 | React Email templates | design.md Section 5.4 | Email uses inline HTML instead of React Email components |
| 9 | Async search execution (202) | design.md Section 4.2 | POST /api/search/run waits synchronously instead of returning 202 immediately |

### 11.2 Added Features (Design X, Implementation O)

| # | Item | Implementation Location | Description |
|---|------|------------------------|-------------|
| 1 | Header component | `src/components/header.tsx` | Separate header component (reasonable extraction) |
| 2 | DashboardClient component | `src/components/dashboard-client.tsx` | Client-side dashboard wrapper (needed for React Server Components) |
| 3 | .env.example file | `.env.example` | Template file for environment variables (good practice) |
| 4 | NextAuth route handler | `src/app/api/auth/[...nextauth]/route.ts` | Required for NextAuth v5 (implied by design but not explicitly listed) |
| 5 | Topic delete from card | `src/components/topic-card.tsx` | Delete button directly on topic card (convenient UX addition) |

### 11.3 Changed Features (Design != Implementation)

| # | Item | Design | Implementation | Impact |
|---|------|--------|----------------|--------|
| 1 | Database provider | PostgreSQL | SQLite | **High** - Affects data types (Json/Array not supported in SQLite) |
| 2 | Topic.sources type | String[] (array) | String (JSON string) | **Medium** - Requires JSON.parse/stringify in code |
| 3 | SearchRun.errorLog type | Json? | String? | **Low** - Stored as JSON.stringify string anyway |
| 4 | Report.sources type | Json | String | **Low** - Stored as JSON.stringify string anyway |
| 5 | Search run response | 202 Accepted, async with polling | 200 OK, synchronous await | **High** - UX waits for full completion |
| 6 | ReportViewer | Separate component in `src/components/report-viewer.tsx` | Inline in page `src/app/reports/[id]/page.tsx` | **Low** - Same functionality |
| 7 | Crawler extractors | Separate `extractors.ts` file | Logic embedded in `index.ts` | **Low** - Code organization preference |
| 8 | Summarizer prompt | Separate `prompt.ts` file | Prompt string in `index.ts` | **Low** - Code organization preference |
| 9 | Mailer template | React Email `template.tsx` | Inline HTML string | **Medium** - Harder to maintain |
| 10 | Error response format | Always `{ error: string, message: string }` | Mixed (some routes return `{ error: "Unauthorized" }` without message field) | **Medium** - Inconsistency in `/api/topics/route.ts` |

---

## 12. Overall Match Rate

```
+---------------------------------------------+
|  Overall Match Rate: 82%                     |
+---------------------------------------------+
|  API Endpoints:       90%  (10/10 exist)     |
|  Data Model:          78%  (SQLite != PG)    |
|  Feature Modules:     85%  (core complete)   |
|  UI Components:       62%  (3 missing)       |
|  File Structure:      82%  (27/36 files)     |
|  Infrastructure:      95%  (deps OK)         |
|  Security:           100%  (all checks pass) |
|  Error Handling:     100%  (all cases OK)    |
+---------------------------------------------+
```

---

## 13. Recommended Actions

### 13.1 Immediate Actions (High Impact)

| # | Priority | Item | Files Affected |
|---|----------|------|----------------|
| 1 | HIGH | Decide on PostgreSQL vs SQLite and update design or implementation to match | `prisma/schema.prisma`, design doc Section 3 |
| 2 | HIGH | Implement async search execution (return 202) or update design to reflect synchronous behavior | `src/app/api/search/run/route.ts` |
| 3 | HIGH | Standardize error response format: all routes should use `{ error: string, message: string }` | `src/app/api/topics/route.ts` (lines 7, 20, 26) |

### 13.2 Short-term Actions (Feature Completeness)

| # | Priority | Item | Effort |
|---|----------|------|--------|
| 4 | MEDIUM | Create `src/app/topics/[id]/page.tsx` for topic editing | ~2 hours |
| 5 | MEDIUM | Create `SearchProgress` component with step-by-step progress UI | ~3 hours |
| 6 | MEDIUM | Create `DateNavigator` component for report date browsing | ~2 hours |
| 7 | MEDIUM | Add scheduler failure retry (1 attempt) in `src/features/scheduler/index.ts` | ~1 hour |
| 8 | LOW | Add "View in app" link to email template | ~30 min |

### 13.3 Design Document Updates Needed

The following items should be added/changed in the design document to match implementation decisions:

- [ ] Document SQLite choice (if intentional) and its implications on field types
- [ ] Add Header and DashboardClient to component list
- [ ] Add NextAuth route handler to file structure
- [ ] Add .env.example to file structure
- [ ] Note that SourceCheckbox and ScheduleToggle are inline in TopicForm (if intentional)
- [ ] Document the topic delete from TopicCard UI

---

## 14. Post-Analysis Actions

**Match Rate = 82%** (between 70% and 90%)

There are some differences between design and implementation. Document update is recommended for intentional changes, and implementation should be completed for missing features.

### Synchronization Options

1. **Modify implementation to match design** -- Recommended for: PostgreSQL migration, async search, error format consistency, missing UI components
2. **Update design to match implementation** -- Recommended for: SQLite decision (if intentional), merged files (extractors.ts/prompt.ts/template.tsx), inline components
3. **Record as intentional** -- Recommended for: Header/DashboardClient additions, .env.example

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-09 | Initial gap analysis | Claude (gap-detector) |
