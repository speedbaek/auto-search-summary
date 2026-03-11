import * as cheerio from "cheerio";
import { SearchResult } from "./types";

export async function searchDuckDuckGo(keyword: string): Promise<SearchResult[]> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(keyword)}`;

  console.log(`[DuckDuckGo] Searching for: "${keyword}"`);

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    console.error(`[DuckDuckGo] HTTP error: ${res.status} ${res.statusText}`);
    throw new Error(`DuckDuckGo search error: ${res.status}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  const results: SearchResult[] = [];

  // Primary selector: .result (standard)
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

  // Fallback selector: try alternative selectors if .result didn't work
  if (results.length === 0) {
    // Try .web-result or .results_links selectors
    $(".web-result, .results_links").each((_, el) => {
      if (results.length >= 7) return false;

      const titleEl = $(el).find("a.result__a, a[href]").first();
      const snippetEl = $(el).find(".result__snippet, .snippet").first();
      const href = titleEl.attr("href") || "";

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
          platform: "google",
        });
      }
    });
  }

  console.log(`[DuckDuckGo] Found ${results.length} results (HTML length: ${html.length})`);

  // If still empty, log a portion of HTML for debugging
  if (results.length === 0) {
    console.warn(`[DuckDuckGo] No results parsed. HTML snippet: ${html.substring(0, 500)}`);
  }

  return results;
}
