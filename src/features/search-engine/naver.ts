import { SearchResult } from "./types";

interface NaverItem {
  title: string;
  link: string;
  description: string;
  postdate?: string;
  pubDate?: string;
}

async function searchNaverApi(
  keyword: string,
  type: "blog" | "news"
): Promise<SearchResult[]> {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.warn("[Naver] Client ID or Secret not configured, skipping");
    return [];
  }

  const url = `https://openapi.naver.com/v1/search/${type}.json?query=${encodeURIComponent(keyword)}&display=5&sort=date`;

  const res = await fetch(url, {
    headers: {
      "X-Naver-Client-Id": clientId,
      "X-Naver-Client-Secret": clientSecret,
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`Naver ${type} API error: ${res.status}`);
  }

  const data = await res.json();

  return (data.items || []).map((item: NaverItem) => ({
    title: item.title.replace(/<[^>]*>/g, ""),
    url: item.link,
    snippet: item.description.replace(/<[^>]*>/g, ""),
    platform: "naver" as const,
    publishedAt: item.postdate || item.pubDate,
  }));
}

export async function searchNaver(keyword: string): Promise<SearchResult[]> {
  const [blogResults, newsResults] = await Promise.allSettled([
    searchNaverApi(keyword, "blog"),
    searchNaverApi(keyword, "news"),
  ]);

  const results: SearchResult[] = [];

  if (blogResults.status === "fulfilled") {
    results.push(...blogResults.value);
  }
  if (newsResults.status === "fulfilled") {
    results.push(...newsResults.value);
  }

  return results;
}
