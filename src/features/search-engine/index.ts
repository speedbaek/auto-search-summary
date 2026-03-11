import { SearchResult } from "./types";
import { searchGoogle } from "./google";
import { searchNaver } from "./naver";
import { searchYoutube } from "./youtube";
import { searchDuckDuckGo } from "./duckduckgo";
import { searchSerper } from "./serper";

export type { SearchResult } from "./types";

async function searchGoogleWithFallback(keyword: string): Promise<SearchResult[]> {
  // Priority 1: Google Custom Search API
  const apiKey = process.env.GOOGLE_API_KEY;
  const cx = process.env.GOOGLE_CX;
  if (apiKey && cx) {
    return searchGoogle(keyword);
  }

  // Priority 2: Serper.dev API (free 2500 queries, works from serverless)
  const serperKey = process.env.SERPER_API_KEY;
  if (serperKey) {
    console.log("[SearchEngine] Using Serper.dev API");
    return searchSerper(keyword);
  }

  // Priority 3: DuckDuckGo HTML scraping (may not work from datacenter IPs)
  console.log("[SearchEngine] No search API configured, trying DuckDuckGo fallback");
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
  // always try web search as a last resort
  if (allResults.length === 0 && !sources.includes("google")) {
    console.log("[SearchEngine] All sources returned empty, falling back to web search");
    try {
      // Try Serper first, then DuckDuckGo
      const serperKey = process.env.SERPER_API_KEY;
      if (serperKey) {
        const fallbackResults = await searchSerper(keyword);
        allResults.push(...fallbackResults);
      } else {
        const fallbackResults = await searchDuckDuckGo(keyword);
        allResults.push(...fallbackResults);
      }
    } catch (err) {
      console.error("[SearchEngine] Fallback search also failed:", err);
    }
  }

  return allResults;
}
