import { SearchResult } from "./types";
import { searchGoogle } from "./google";
import { searchNaver } from "./naver";
import { searchYoutube } from "./youtube";
import { searchDuckDuckGo } from "./duckduckgo";

export type { SearchResult } from "./types";

async function searchGoogleWithFallback(keyword: string): Promise<SearchResult[]> {
  // Google API가 설정되어 있으면 API 사용, 아니면 DuckDuckGo fallback
  const apiKey = process.env.GOOGLE_API_KEY;
  const cx = process.env.GOOGLE_CX;

  if (apiKey && cx) {
    return searchGoogle(keyword);
  }

  console.log("[SearchEngine] Google API not configured, using DuckDuckGo fallback");
  return searchDuckDuckGo(keyword);
}

export async function searchAll(
  keyword: string,
  sources: string[]
): Promise<SearchResult[]> {
  const searches: Promise<SearchResult[]>[] = [];

  if (sources.includes("google")) searches.push(searchGoogleWithFallback(keyword));
  if (sources.includes("naver")) searches.push(searchNaver(keyword));
  if (sources.includes("youtube")) searches.push(searchYoutube(keyword));

  const results = await Promise.allSettled(searches);

  const allResults: SearchResult[] = [];

  for (const result of results) {
    if (result.status === "fulfilled") {
      allResults.push(...result.value);
    } else {
      console.error("[SearchEngine] Source failed:", result.reason);
    }
  }

  // Auto-fallback: if all configured sources returned empty (e.g. missing API keys),
  // always try DuckDuckGo as a last resort
  if (allResults.length === 0 && !sources.includes("google")) {
    console.log("[SearchEngine] All sources returned empty, falling back to DuckDuckGo");
    try {
      const fallbackResults = await searchDuckDuckGo(keyword);
      allResults.push(...fallbackResults);
    } catch (err) {
      console.error("[SearchEngine] DuckDuckGo fallback also failed:", err);
    }
  }

  return allResults;
}
