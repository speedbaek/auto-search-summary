import { SearchResult } from "./types";

export async function searchGoogle(keyword: string): Promise<SearchResult[]> {
  const apiKey = process.env.GOOGLE_API_KEY;
  const cx = process.env.GOOGLE_CX;

  if (!apiKey || !cx) {
    console.warn("[Google] API key or CX not configured, skipping");
    return [];
  }

  const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(keyword)}&num=10&lr=lang_ko&sort=date`;

  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });

  if (!res.ok) {
    throw new Error(`Google API error: ${res.status}`);
  }

  const data = await res.json();

  if (!data.items) return [];

  return data.items.map((item: { title: string; link: string; snippet: string }) => ({
    title: item.title,
    url: item.link,
    snippet: item.snippet || "",
    platform: "google" as const,
  }));
}
