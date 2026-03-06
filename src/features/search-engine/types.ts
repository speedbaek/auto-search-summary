export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  platform: "google" | "naver" | "youtube";
  publishedAt?: string;
}
