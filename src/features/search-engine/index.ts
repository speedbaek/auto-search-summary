import { SearchResult } from "./types";
import { searchGoogle } from "./google";
import { searchNaver } from "./naver";
import { searchYoutube } from "./youtube";
import { searchDuckDuckGo } from "./duckduckgo";
import { searchSerper } from "./serper";

export type { SearchResult } from "./types";

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

  // Fallback: Serper로 네이버 사이트 검색
  console.log("[SearchEngine] Naver API not configured, using Serper site:naver.com fallback");
  return searchSerper(keyword, { site: "naver.com", platform: "naver", num: 5 });
}

async function searchYoutubeWithFallback(keyword: string): Promise<SearchResult[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (apiKey) {
    return searchYoutube(keyword);
  }

  // Fallback: Serper로 유튜브 사이트 검색
  console.log("[SearchEngine] YouTube API not configured, using Serper site:youtube.com fallback");
  return searchSerper(keyword, { site: "youtube.com", platform: "youtube", num: 5 });
}

export async function searchAll(
  keyword: string,
  sources: string[]
): Promise<SearchResult[]> {
  const searches: Promise<SearchResult[]>[] = [];

  if (sources.includes("google")) searches.push(searchGoogleWithFallback(keyword));
  if (sources.includes("naver")) searches.push(searchNaverWithFallback(keyword));
  if (sources.includes("youtube")) searches.push(searchYoutubeWithFallback(keyword));

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

  return allResults;
}
