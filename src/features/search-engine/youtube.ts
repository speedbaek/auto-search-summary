import { SearchResult } from "./types";

interface YouTubeItem {
  id: { videoId: string };
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
  };
}

export async function searchYoutube(keyword: string): Promise<SearchResult[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    console.warn("[YouTube] API key not configured, skipping");
    return [];
  }

  const url = `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&q=${encodeURIComponent(keyword)}&part=snippet&type=video&maxResults=5&relevanceLanguage=ko&order=date`;

  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });

  if (!res.ok) {
    throw new Error(`YouTube API error: ${res.status}`);
  }

  const data = await res.json();

  return (data.items || []).map((item: YouTubeItem) => ({
    title: item.snippet.title,
    url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    snippet: item.snippet.description,
    platform: "youtube" as const,
    publishedAt: item.snippet.publishedAt,
  }));
}
