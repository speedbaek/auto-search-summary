import { SearchResult } from "./types";
import { searchGoogle } from "./google";
import { searchNaver } from "./naver";
import { searchYoutube } from "./youtube";
import { searchDuckDuckGo } from "./duckduckgo";
import { searchSerper } from "./serper";

export type { SearchResult } from "./types";

// 도메인 평판 점수: 유명/신뢰할 수 있는 플랫폼에 가산점
const DOMAIN_SCORES: Record<string, number> = {
  // 글로벌 테크 플랫폼
  "github.com": 15,
  "github.io": 12,
  "medium.com": 12,
  "dev.to": 12,
  "stackoverflow.com": 10,
  "arxiv.org": 15,
  "huggingface.co": 14,
  "openai.com": 14,
  "anthropic.com": 14,
  "google.ai": 13,
  "deepmind.google": 13,
  "microsoft.com": 10,
  "aws.amazon.com": 10,
  // 한국 플랫폼
  "brunch.co.kr": 12,
  "tistory.com": 8,
  "velog.io": 10,
  "wanted.co.kr": 8,
  "yozm.wishket.com": 10,
  "techblog.woowahan.com": 12,
  "engineering.linecorp.com": 12,
  "tech.kakao.com": 12,
  "d2.naver.com": 14,
  "netmarble.engineering": 10,
  // 뉴스/미디어
  "zdnet.co.kr": 8,
  "itworld.co.kr": 8,
  "aitimes.com": 10,
  "techcrunch.com": 10,
  "theverge.com": 8,
  "wired.com": 8,
  // YouTube
  "youtube.com": 6,
};

// 유명 플랫폼 사이트 목록 (Serper site: 검색용)
const QUALITY_PLATFORMS = [
  "brunch.co.kr",
  "github.com",
  "medium.com",
  "velog.io",
  "d2.naver.com",
  "yozm.wishket.com",
];

function getDomainScore(url: string): number {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    // 정확히 매칭되는 도메인 먼저 확인
    if (DOMAIN_SCORES[hostname]) return DOMAIN_SCORES[hostname];
    // 서브도메인 매칭 (예: blog.example.com → example.com)
    for (const [domain, score] of Object.entries(DOMAIN_SCORES)) {
      if (hostname.endsWith(domain)) return score;
    }
  } catch {}
  return 0;
}

function getRecencyScore(publishedAt?: string): number {
  if (!publishedAt) return 0; // 날짜 없으면 중립
  try {
    const published = new Date(publishedAt);
    if (isNaN(published.getTime())) return 0;
    const daysAgo = (Date.now() - published.getTime()) / (1000 * 60 * 60 * 24);
    if (daysAgo <= 7) return 20;    // 1주 이내
    if (daysAgo <= 30) return 15;   // 1개월 이내
    if (daysAgo <= 90) return 10;   // 3개월 이내
    if (daysAgo <= 180) return 5;   // 6개월 이내
    if (daysAgo <= 365) return 2;   // 1년 이내
    return -5;                       // 1년 이상은 감점
  } catch {
    return 0;
  }
}

function scoreResult(result: SearchResult): number {
  const domainScore = getDomainScore(result.url);
  const recencyScore = getRecencyScore(result.publishedAt);
  // 기본 점수 10 + 도메인 평판 + 최신성
  return 10 + domainScore + recencyScore;
}

function rankAndDeduplicate(results: SearchResult[]): SearchResult[] {
  // URL 기반 중복 제거
  const seen = new Set<string>();
  const unique = results.filter((r) => {
    const key = r.url.replace(/\/$/, "").toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // 스코어 기반 정렬 (높은 순)
  const scored = unique.map((r) => ({ result: r, score: scoreResult(r) }));
  scored.sort((a, b) => b.score - a.score);

  console.log(
    `[SearchEngine] Scored ${scored.length} results. Top 5:`,
    scored.slice(0, 5).map((s) => `${s.score}pts ${s.result.url.slice(0, 60)}`)
  );

  return scored.map((s) => s.result);
}

async function searchGoogleWithFallback(keyword: string): Promise<SearchResult[]> {
  const apiKey = process.env.GOOGLE_API_KEY;
  const cx = process.env.GOOGLE_CX;
  if (apiKey && cx) {
    return searchGoogle(keyword);
  }

  const serperKey = process.env.SERPER_API_KEY;
  if (serperKey) {
    return searchSerper(keyword);
  }

  return searchDuckDuckGo(keyword);
}

async function searchNaverWithFallback(keyword: string): Promise<SearchResult[]> {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (clientId && clientSecret) {
    return searchNaver(keyword);
  }

  console.log("[SearchEngine] Naver API not configured, using Serper site:naver.com fallback");
  return searchSerper(keyword, { site: "naver.com", platform: "naver", num: 5 });
}

async function searchYoutubeWithFallback(keyword: string): Promise<SearchResult[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (apiKey) {
    return searchYoutube(keyword);
  }

  console.log("[SearchEngine] YouTube API not configured, using Serper site:youtube.com fallback");
  return searchSerper(keyword, { site: "youtube.com", platform: "youtube", num: 5 });
}

async function searchQualityPlatforms(keyword: string): Promise<SearchResult[]> {
  const serperKey = process.env.SERPER_API_KEY;
  if (!serperKey) return [];

  // 유명 플랫폼 3개를 랜덤 선택하여 검색 (API 쿼리 절약)
  const shuffled = [...QUALITY_PLATFORMS].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 3);

  console.log(`[SearchEngine] Searching quality platforms: ${selected.join(", ")}`);

  const searches = selected.map((site) =>
    searchSerper(keyword, { site, platform: "google", num: 3 }).catch(() => [])
  );

  const results = await Promise.all(searches);
  return results.flat();
}

export async function searchAll(
  keyword: string,
  sources: string[]
): Promise<SearchResult[]> {
  const searches: Promise<SearchResult[]>[] = [];

  if (sources.includes("google")) searches.push(searchGoogleWithFallback(keyword));
  if (sources.includes("naver")) searches.push(searchNaverWithFallback(keyword));
  if (sources.includes("youtube")) searches.push(searchYoutubeWithFallback(keyword));

  // 유명 플랫폼 추가 검색 (항상)
  searches.push(searchQualityPlatforms(keyword));

  const results = await Promise.allSettled(searches);

  const allResults: SearchResult[] = [];

  for (const result of results) {
    if (result.status === "fulfilled") {
      allResults.push(...result.value);
    } else {
      console.error("[SearchEngine] Source failed:", result.reason);
    }
  }

  // 최후 폴백: 모든 소스가 빈 결과일 때
  if (allResults.length === 0) {
    console.log("[SearchEngine] All sources returned empty, trying DuckDuckGo fallback");
    try {
      const fallbackResults = await searchDuckDuckGo(keyword);
      allResults.push(...fallbackResults);
    } catch (err) {
      console.error("[SearchEngine] Fallback search also failed:", err);
    }
  }

  // 스코어 기반 정렬 + 중복 제거
  return rankAndDeduplicate(allResults);
}
