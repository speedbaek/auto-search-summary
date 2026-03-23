import { SearchResult } from "./types";

interface SerperOrganicResult {
  title: string;
  link: string;
  snippet: string;
  date?: string;
}

interface SerperResponse {
  organic: SerperOrganicResult[];
}

export async function searchSerper(
  keyword: string,
  options?: { site?: string; platform?: SearchResult["platform"]; num?: number }
): Promise<SearchResult[]> {
  const apiKey = process.env.SERPER_API_KEY;

  if (!apiKey) {
    console.warn("[Serper] API key not configured, skipping");
    return [];
  }

  const query = options?.site ? `${keyword} site:${options.site}` : keyword;
  const platform = options?.platform || "google";
  const num = options?.num || 10;

  console.log(`[Serper] Searching for: "${query}" (platform: ${platform})`);

  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: query,
      gl: "kr",
      hl: "ko",
      num,
      tbs: "qdr:m",
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`[Serper] API error: ${res.status} ${text}`);
    throw new Error(`Serper API error: ${res.status}`);
  }

  const data: SerperResponse = await res.json();

  const results: SearchResult[] = (data.organic || []).slice(0, num).map((item) => ({
    title: item.title,
    url: item.link,
    snippet: item.snippet || "",
    platform,
    publishedAt: item.date,
  }));

  console.log(`[Serper] Found ${results.length} results for platform: ${platform}`);

  return results;
}
