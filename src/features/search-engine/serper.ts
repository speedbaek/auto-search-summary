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

export async function searchSerper(keyword: string): Promise<SearchResult[]> {
  const apiKey = process.env.SERPER_API_KEY;

  if (!apiKey) {
    console.warn("[Serper] API key not configured, skipping");
    return [];
  }

  console.log(`[Serper] Searching for: "${keyword}"`);

  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: keyword,
      gl: "kr",
      hl: "ko",
      num: 7,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`[Serper] API error: ${res.status} ${text}`);
    throw new Error(`Serper API error: ${res.status}`);
  }

  const data: SerperResponse = await res.json();

  const results: SearchResult[] = (data.organic || []).slice(0, 7).map((item) => ({
    title: item.title,
    url: item.link,
    snippet: item.snippet || "",
    platform: "google" as const,
    publishedAt: item.date,
  }));

  console.log(`[Serper] Found ${results.length} results`);

  return results;
}
