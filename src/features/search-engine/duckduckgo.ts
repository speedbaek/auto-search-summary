import * as cheerio from "cheerio";
import { SearchResult } from "./types";

export async function searchDuckDuckGo(keyword: string): Promise<SearchResult[]> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(keyword)}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`DuckDuckGo search error: ${res.status}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  const results: SearchResult[] = [];

  $(".result").each((_, el) => {
    if (results.length >= 7) return false;

    const titleEl = $(el).find(".result__a");
    const snippetEl = $(el).find(".result__snippet");
    const href = titleEl.attr("href") || "";

    // DuckDuckGo wraps URLs in a redirect, extract the actual URL
    let actualUrl = href;
    const uddgMatch = href.match(/uddg=([^&]+)/);
    if (uddgMatch) {
      actualUrl = decodeURIComponent(uddgMatch[1]);
    }

    const title = titleEl.text().trim();
    const snippet = snippetEl.text().trim();

    if (title && actualUrl && actualUrl.startsWith("http")) {
      results.push({
        title,
        url: actualUrl,
        snippet,
        platform: "google", // treat as generic web results
      });
    }
  });

  return results;
}
