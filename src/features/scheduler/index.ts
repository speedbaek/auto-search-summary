import { prisma } from "@/lib/prisma";
import { searchAll } from "../search-engine";
import { crawlUrls } from "../crawler";
import { summarize } from "../summarizer";
import { sendReportEmail } from "../mailer";

interface RunResult {
  topicId: string;
  keyword: string;
  status: "completed" | "failed";
  reportId?: string;
  error?: string;
}

export async function executeSearch(topicId: string, existingRunId?: string): Promise<RunResult> {
  const topic = await prisma.topic.findUnique({ where: { id: topicId } });
  if (!topic) throw new Error("Topic not found");

  // Use existing run or create new one
  const searchRun = existingRunId
    ? await prisma.searchRun.findUniqueOrThrow({ where: { id: existingRunId } })
    : await prisma.searchRun.create({ data: { topicId, status: "searching" } });

  try {
    // Step 1: Search
    await prisma.searchRun.update({
      where: { id: searchRun.id },
      data: { status: "searching" },
    });

    const sources: string[] = JSON.parse(topic.sources);
    const searchResults = await searchAll(topic.keyword, sources);

    if (searchResults.length === 0) {
      throw new Error("No search results found");
    }

    // Step 2: Crawl
    await prisma.searchRun.update({
      where: { id: searchRun.id },
      data: { status: "crawling" },
    });

    const crawled = await crawlUrls(searchResults);

    await prisma.searchRun.update({
      where: { id: searchRun.id },
      data: { crawledCount: crawled.filter((c) => c.success).length },
    });

    // Step 3: Summarize
    await prisma.searchRun.update({
      where: { id: searchRun.id },
      data: { status: "summarizing" },
    });

    const summary = await summarize(topic.keyword, crawled);

    // Step 4: Save report
    const report = await prisma.report.create({
      data: {
        topicId,
        searchRunId: searchRun.id,
        title: summary.title,
        summary: summary.summary,
        content: summary.content,
        sources: JSON.stringify(summary.sources),
      },
    });

    // Step 5: Update search run & topic
    await prisma.searchRun.update({
      where: { id: searchRun.id },
      data: { status: "completed", completedAt: new Date() },
    });

    await prisma.topic.update({
      where: { id: topicId },
      data: { lastRunAt: new Date() },
    });

    return {
      topicId,
      keyword: topic.keyword,
      status: "completed",
      reportId: report.id,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";

    await prisma.searchRun.update({
      where: { id: searchRun.id },
      data: {
        status: "failed",
        completedAt: new Date(),
        errorLog: JSON.stringify({ error: errorMessage }),
      },
    });

    return {
      topicId,
      keyword: topic.keyword,
      status: "failed",
      error: errorMessage,
    };
  }
}

export async function runScheduledTopics(): Promise<RunResult[]> {
  const topics = await prisma.topic.findMany({
    where: { isScheduled: true, isActive: true },
  });

  const results: RunResult[] = [];

  // Run sequentially to respect Vercel function timeout
  for (const topic of topics) {
    const result = await executeSearch(topic.id);
    results.push(result);

    // Send email for completed reports
    if (result.status === "completed" && result.reportId) {
      const recipientEmail = process.env.ALLOWED_EMAIL;
      if (recipientEmail) {
        const report = await prisma.report.findUnique({
          where: { id: result.reportId },
        });
        if (report) {
          const emailed = await sendReportEmail(
            {
              title: report.title,
              summary: report.summary,
              content: report.content,
              sources: JSON.parse(report.sources) as { title: string; url: string; platform: string }[],
            },
            recipientEmail
          );
          if (emailed) {
            await prisma.report.update({
              where: { id: report.id },
              data: { isEmailed: true },
            });
          }
        }
      }
    }
  }

  return results;
}
