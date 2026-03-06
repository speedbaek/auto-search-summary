# 자동검색요약앱 (Auto Search Summary) Planning Document

> **Summary**: 관심 주제를 등록하면 구글/네이버/유튜브에서 자동 검색 → 크롤링 → AI 요약 → 깔끔한 정리본을 매일 아침 받아보는 개인용 정보 큐레이션 도구
>
> **Project**: Auto Search Summary
> **Version**: 0.2.0
> **Author**: 백상희
> **Date**: 2026-03-06
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 경영컨설팅, 광고, 법무/세무/특허 등 다양한 사업을 운영하면서 AI 업무자동화까지 관심사가 넓어, 매일 여러 플랫폼을 돌아다니며 정보를 수집·정리하는 데 시간이 너무 많이 든다 |
| **Solution** | 관심 주제(토픽)만 한번 등록하면 구글/네이버/유튜브를 자동으로 검색·크롤링하고, AI가 요약·분석한 정리본을 매일 원하는 시간에 자동 전달한다 |
| **Function/UX Effect** | 아침에 이메일 또는 앱을 열면 관심 분야의 최신 정보가 읽기 편한 정리본으로 이미 도착해 있다 |
| **Core Value** | "내 관심사의 자동 브리핑" — 정보 수집에 쓰던 시간을 의사결정과 실행에 집중할 수 있다 |

---

## 1. Overview

### 1.1 Purpose

20년차 CEO로서 경영컨설팅(인사/총무/회계 대행), 광고컨설팅, 특허법인/법무법인/세무법인 관련 업무, 그리고 최근 AI 업무자동화(바이브 코딩)까지 — 관심 분야가 넓고 매일 최신 정보를 파악해야 한다. 하지만 구글, 네이버, 유튜브를 하나하나 검색하고 콘텐츠를 읽는 것은 비효율적이다.

이 앱은 **나(백상희) 한 명이 편하게 쓸 수 있는 개인용 정보 수집 자동화 도구**다. 복잡한 기능 없이, 검색어 등록 → 자동 수집 → AI 정리본 → 매일 전달이라는 핵심 플로우에만 집중한다.

### 1.2 핵심 페르소나

```
이름: 백상희
직업: 20년차 CEO (다수 법인 운영)
사업 영역:
  - 경영컨설팅 (인사, 총무, 회계 대행)
  - 광고컨설팅업
  - 특허법인 / 법무법인 / 세무법인 관련 업
최근 관심사: AI 활용 업무자동화 (바이브 코딩)

정보 수집 패턴:
  - 아침에 업계 동향 빠르게 파악하고 싶다
  - 여러 플랫폼을 돌아다닐 시간이 없다
  - 핵심만 추려서 읽기 편하게 정리된 걸 원한다
  - 새로운 AI 도구, 법률 개정, 세무 이슈 등을 놓치고 싶지 않다

예상 토픽 예시:
  - "AI 업무자동화 트렌드"
  - "바이브코딩 최신 사례"
  - "2026 세법 개정"
  - "특허 출원 AI 활용"
  - "경영컨설팅 업계 동향"
  - "Claude AI 활용법"
```

### 1.3 Related Documents

- 참고: 유사 서비스 — Google Alerts, Perplexity AI, Feedly

---

## 2. Scope

### 2.1 In Scope (개인용 핵심)

- [ ] 검색어(토픽) 등록/수정/삭제
- [ ] 구글/네이버/유튜브 자동 검색
- [ ] 검색 결과 웹 페이지 본문 자동 크롤링
- [ ] AI가 요약·분석한 정리본 생성
- [ ] 정리본에 출처 링크 포함
- [ ] 매일 지정 시간에 자동 실행 (스케줄링)
- [ ] 결과를 이메일로 자동 전송
- [ ] 과거 정리본 열람
- [ ] 검색 실행 중 진행 상태 표시

### 2.2 Out of Scope (개인용이라 불필요)

- ~~회원가입/다중 사용자~~ → 나 혼자 쓰는 앱 (간단한 인증만)
- ~~수익화/Freemium/결제~~ → 개인 도구
- ~~팀 공유/워크스페이스~~ → 1인 사용
- ~~사용량 제한/Rate Limiting~~ → 본인만 사용
- SNS(인스타, 트위터) 검색 (추후 필요 시)
- 모바일 네이티브 앱 (웹에서 충분)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | MVP |
|----|-------------|----------|:---:|
| FR-01 | 토픽(검색어)을 등록/수정/삭제할 수 있다 | High | ✅ |
| FR-02 | 구글 웹 검색을 자동 수행한다 | High | ✅ |
| FR-03 | 네이버 블로그/뉴스 검색을 자동 수행한다 | High | ✅ |
| FR-04 | 유튜브 영상 검색을 수행한다 (제목+설명 수준) | Medium | ✅ |
| FR-05 | 검색된 웹 페이지의 본문을 자동 크롤링한다 | High | ✅ |
| FR-06 | 유튜브 자막을 자동 추출한다 | Low | ❌ 2차 |
| FR-07 | 수집된 콘텐츠를 AI가 요약·분석하여 정리본을 생성한다 | High | ✅ |
| FR-08 | 정리본에 출처(원문 링크)를 포함한다 | High | ✅ |
| FR-09 | 매일 원하는 시간에 자동 실행되도록 스케줄을 설정한다 | High | ✅ |
| FR-10 | 결과를 이메일로 자동 전송한다 | High | ✅ |
| FR-11 | 과거 정리본을 날짜별로 조회한다 | Medium | ✅ |
| FR-12 | 검색 실행 중 진행 상태를 표시한다 (검색 중/크롤링 중/요약 중) | High | ✅ |
| FR-13 | 검색 소스를 토픽별로 선택할 수 있다 (구글만, 네이버만 등) | Medium | ✅ |
| FR-14 | 간단한 로그인 (Google OAuth, 나 혼자 사용) | High | ✅ |

### 3.2 Non-Functional Requirements

| Category | Criteria |
|----------|----------|
| Performance | 검색~정리본 생성까지 5분 이내 (크롤링 병렬 처리) |
| Reliability | 스케줄 실행 실패 시 1회 자동 재시도 |
| Cost | API 비용 월 $20 이내 유지 (개인 사용 수준) |
| UX | 토픽 등록~첫 정리본까지 3클릭 이내 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] 토픽 등록 → 자동 검색 → 정리본 생성 E2E 플로우 완성
- [ ] 구글 + 네이버 검색 통합 동작
- [ ] AI 정리본이 읽기 편하고 핵심이 잘 정리됨
- [ ] 매일 아침 자동 실행 → 이메일 수신 정상 동작
- [ ] 내가 매일 실제로 쓰고 싶을 만큼 편리함

---

## 5. Risks and Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| 웹사이트 크롤링 차단 | High | 공식 API 우선, 차단 시 해당 URL 스킵 + 메타데이터만 수집 |
| AI 요약 품질 불균일 | Medium | 프롬프트 반복 개선, 요약 템플릿 고정 |
| API 비용 초과 | Medium | 토픽당 검색 결과 수 제한 (상위 5~10개), Claude 토큰 관리 |
| JS 렌더링 사이트 크롤링 불가 | Medium | Cheerio로 안 되면 스킵, 제목+스니펫만으로 AI 요약 |
| Vercel Cron 무료 제한 (1일 1회) | Medium | 모든 토픽을 한번에 묶어서 실행 or Vercel Pro 전환 |

---

## 6. Architecture

### 6.1 기술 스택 (심플하게)

| Decision | Selected | Rationale |
|----------|----------|-----------|
| Framework | **Next.js (App Router)** | API Routes로 풀스택, Vercel 배포 간편 |
| AI Engine | **Claude API** | 한국어 요약 품질 좋음, 기존 경험 |
| Web Scraping | **Cheerio + fetch** | 서버사이드 경량 크롤링 |
| Search | **Google API + Naver API + YouTube API** | 공식 API로 안정적 |
| Scheduling | **Vercel Cron** | 서버 관리 불필요 |
| Email | **Resend** | 간편한 API, 무료 쿼터로 충분 (개인용) |
| DB | **PostgreSQL (Prisma)** | 기존 프로젝트와 동일 |
| Auth | **NextAuth (Google OAuth)** | 내 구글 계정으로 간단 로그인 |
| Styling | **Tailwind + shadcn/ui** | 빠른 UI 구축 |

### 6.2 폴더 구조

```
src/
  app/
    page.tsx                # 대시보드 (토픽 목록 + 최근 정리본)
    topics/
      new/page.tsx          # 토픽 등록
      [id]/page.tsx         # 토픽 상세 + 정리본 목록
    reports/
      [id]/page.tsx         # 정리본 뷰어
    api/
      topics/               # 토픽 CRUD
      search/run/            # 검색 실행
      reports/               # 정리본 조회
      cron/                  # 스케줄 자동 실행
  features/
    search-engine/           # 구글/네이버/유튜브 검색
    crawler/                 # 웹 페이지 크롤링
    summarizer/              # AI 요약
    scheduler/               # 스케줄 관리
  components/                # UI 컴포넌트
  lib/                       # 유틸리티
```

### 6.3 Core Data Flow

```
[백상희]
  │ 토픽 등록: "AI 업무자동화 트렌드"
  ▼
[스케줄러] ─── 매일 아침 7:00 자동 실행 ───┐
  │                                          │
  ▼                                          │
[검색 엔진] (병렬 실행)                      │
  ├── Google Search API ──┐                  │
  ├── Naver Search API ───┤ 상위 5~10개씩    │
  └── YouTube Data API ───┘                  │
  │                                          │
  ▼                                          │
[크롤러] (병렬 크롤링)                       │
  │ 각 URL 본문 텍스트 추출                  │
  │ 실패 시 스킵 (제목+스니펫만 전달)        │
  ▼                                          │
[AI 요약 엔진]                               │
  │ Claude API로 전체 내용 종합 분석         │
  │ → 핵심 요약, 주제별 분류, 인사이트       │
  ▼                                          │
[정리본 저장 + 이메일 전송]                  │
  │                                          │
  ▼                                          │
[백상희] 아침에 이메일로 정리본 수신 📧
```

---

## 7. Data Model (심플)

```
Topic (검색 토픽)
  ├── id
  ├── keyword: "AI 업무자동화 트렌드"
  ├── sources: ["google", "naver", "youtube"]
  ├── isScheduled: boolean
  ├── scheduleTime: "07:00"
  ├── isActive: boolean
  ├── lastRunAt: DateTime?
  ├── createdAt, updatedAt
  └── has many → Reports

SearchRun (검색 실행 기록)
  ├── id
  ├── topicId
  ├── status: "searching" | "crawling" | "summarizing" | "completed" | "failed"
  ├── triggeredBy: "manual" | "schedule"
  ├── startedAt, completedAt
  ├── crawledCount: number
  ├── errorLog: JSON?
  └── has one → Report

Report (정리본)
  ├── id
  ├── topicId
  ├── searchRunId
  ├── title: AI 생성 제목
  ├── summary: 한줄 요약
  ├── content: Markdown 형식 요약 본문
  ├── sources: JSON  // [{ title, url, platform }]
  ├── isEmailed: boolean
  ├── createdAt
  └── belongs to → Topic
```

> **심플화 포인트**: User 테이블 불필요 (NextAuth 세션으로 나만 접근), EmailLog 불필요 (개인용이라 Report.isEmailed로 충분), Topic에서 summaryDepth/scheduleDays 제거 (매일 실행, 깊이는 고정)

---

## 8. User Flow

```
[매일 아침 — 자동]
  스케줄러 실행 → 등록된 토픽 전체 검색 → 정리본 생성 → 이메일 전송
  → 백상희는 이메일만 열면 됨 ✅

[수동 사용 — 필요할 때]
  1. 앱 접속 (auto-search.vercel.app)
  2. 대시보드에서 토픽 확인 / 새 토픽 추가
  3. "지금 실행" 클릭 → 진행 상태 표시 → 정리본 확인
  4. 과거 정리본 열람
```

### 주요 화면 (3개면 충분)

| 화면 | 핵심 요소 |
|------|-----------|
| **대시보드** | 내 토픽 목록, 각 토픽의 최신 정리본 미리보기, "지금 실행" 버튼 |
| **토픽 등록/편집** | 검색어 입력, 소스 체크박스, 스케줄 ON/OFF + 시간 설정 |
| **정리본 뷰어** | AI 요약 본문 (Markdown), 출처 링크 목록, 날짜 네비게이션 |

---

## 9. MVP 구현 순서

| 단계 | 기능 | 예상 기간 |
|------|------|-----------|
| ① | Next.js 프로젝트 셋업 + Google OAuth 로그인 | 1일 |
| ② | 토픽 CRUD (등록/수정/삭제) + DB 셋업 | 1~2일 |
| ③ | 구글 검색 + 네이버 검색 API 연동 | 2일 |
| ④ | 웹 페이지 크롤링 (Cheerio, 병렬 처리) | 2~3일 |
| ⑤ | AI 요약 엔진 (Claude API + 프롬프트 튜닝) | 2~3일 |
| ⑥ | 정리본 뷰어 UI + 대시보드 | 2일 |
| ⑦ | 스케줄링 (Vercel Cron) + 이메일 전송 (Resend) | 2일 |
| ⑧ | 진행 상태 표시 + UI 마무리 + 배포 | 1~2일 |

**총 예상: 약 2~3주** (바이브코딩으로 빠르게)

### 2차 추가 (쓰다가 필요하면)

- 유튜브 자막 추출 및 영상 내용 요약
- 정리본 PDF/노션 내보내기
- 특정 토픽 키워드 트렌드 변화 추적
- 카카오톡/슬랙 알림 연동

---

## 10. 환경변수

| Variable | Purpose | 비고 |
|----------|---------|------|
| `GOOGLE_SEARCH_API_KEY` | Google Custom Search API | 발급 필요 |
| `GOOGLE_SEARCH_ENGINE_ID` | Google Search Engine ID | 발급 필요 |
| `NAVER_CLIENT_ID` | 네이버 검색 API | 발급 필요 |
| `NAVER_CLIENT_SECRET` | 네이버 검색 API | 발급 필요 |
| `YOUTUBE_API_KEY` | YouTube Data API v3 | 발급 필요 |
| `ANTHROPIC_API_KEY` | Claude API (AI 요약) | 보유 중 |
| `RESEND_API_KEY` | 이메일 전송 | 발급 필요 |
| `CRON_SECRET` | Vercel Cron 인증 | 생성 필요 |
| `DATABASE_URL` | PostgreSQL 연결 | 생성 필요 |

---

## 11. Next Steps

1. [ ] 이 Plan 문서 확정
2. [ ] API 키 발급 (Google, Naver, YouTube, Resend)
3. [ ] 프로젝트 셋업 → 바로 구현 시작

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-06 | Initial draft | 백상희 |
| 0.2 | 2026-03-06 | 개인용 도구로 방향 전환, 퍼소나 구체화, 불필요한 고도화 제거 | 백상희 |
