import * as cheerio from "cheerio";
import pLimit from "p-limit";
import { SearchResult } from "../search-engine/types";

export interface CrawledContent {
  url: string;
  title: string;
  platform: string;
  text: string;
  success: boolean;
  error?: string;
}

const MAX_TEXT_LENGTH = 8000;
const CRAWL_TIMEOUT = 10000;
const CONCURRENCY = 5;

async function crawlPage(result: SearchResult): Promise<CrawledContent> {
  // YouTube: don't crawl, use search snippet directly
  if (result.platform === "youtube") {
    return {
      url: result.url,
      title: result.title,
      platform: result.platform,
      text: `[YouTube] ${result.title}\n${result.snippet}`,
      success: true,
    };
  }

  try {
    const res = await fetch(result.url, {
      signal: AbortSignal.timeout(CRAWL_TIMEOUT),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; AutoSearchBot/1.0; +research)",
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    // Remove noise elements
    $("script, style, nav, footer, header, aside, iframe, noscript").remove();

    // Try to extract main content in priority order
    let text = "";

    const selectors = [
      "article",
      "main",
      ".post-content",
      ".article-content",
      ".entry-content",
      "#content",
      ".content",
      '[role="main"]',
    ];

    for (const selector of selectors) {
      const el = $(selector);
      if (el.length && el.text().trim().length > 100) {
        text = el.text();
        break;
      }
    }

    // Fallback: collect all <p> tags
    if (!text) {
      text = $("p")
        .map((_, el) => $(el).text().trim())
        .get()
        .filter((t) => t.length > 20)
        .join("\n");
    }

    // Last fallback: meta description + snippet
    if (!text || text.trim().length < 50) {
      const metaDesc =
        $('meta[name="description"]').attr("content") ||
        $('meta[property="og:description"]').attr("content") ||
        "";
      text = [metaDesc, result.snippet].filter(Boolean).join("\n");
    }

    // Clean up whitespace and truncate
    text = text.replace(/\s+/g, " ").trim().slice(0, MAX_TEXT_LENGTH);

    return {
      url: result.url,
      title: result.title,
      platform: result.platform,
      text,
      success: true,
    };
  } catch (err) {
    return {
      url: result.url,
      title: result.title,
      platform: result.platform,
      text: result.snippet || "",
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function crawlUrls(
  results: SearchResult[]
): Promise<CrawledContent[]> {
  const limit = pLimit(CONCURRENCY);

  const settled = await Promise.allSettled(
    results.map((result) => limit(() => crawlPage(result)))
  );

  return settled
    .filter(
      (r): r is PromiseFulfilledResult<CrawledContent> =>
        r.status === "fulfilled"
    )
    .map((r) => r.value);
}
