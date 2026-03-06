import { Resend } from "resend";

interface ReportForEmail {
  title: string;
  summary: string;
  content: string;
  sources: { title: string; url: string; platform: string }[];
}

export async function sendReportEmail(
  report: ReportForEmail,
  recipientEmail: string
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  if (!apiKey) {
    console.warn("[Mailer] Resend API key not configured, skipping");
    return false;
  }

  const resend = new Resend(apiKey);

  const sourcesHtml = report.sources
    .map(
      (s) =>
        `<li><a href="${s.url}" style="color:#2563eb;">${s.title}</a> <span style="color:#9ca3af;">(${s.platform})</span></li>`
    )
    .join("");

  const contentHtml = report.content
    .replace(/^### (.*$)/gm, '<h3 style="color:#1e293b;margin:16px 0 8px;">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 style="color:#0f172a;margin:20px 0 10px;">$1</h2>')
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br>");

  const html = `
    <div style="max-width:600px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1e293b;">
      <div style="background:#0f172a;padding:20px 24px;border-radius:8px 8px 0 0;">
        <h1 style="color:#fff;margin:0;font-size:18px;">📋 ${report.title}</h1>
      </div>
      <div style="padding:24px;border:1px solid #e2e8f0;border-top:none;">
        <div style="background:#f0f9ff;padding:12px 16px;border-radius:6px;margin-bottom:20px;">
          <strong style="color:#0369a1;">한줄 요약:</strong> ${report.summary}
        </div>
        <div style="line-height:1.7;">
          ${contentHtml}
        </div>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
        <h3 style="color:#64748b;font-size:14px;">출처</h3>
        <ul style="padding-left:20px;font-size:13px;">${sourcesHtml}</ul>
      </div>
      <div style="background:#f8fafc;padding:16px 24px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0;border-top:none;text-align:center;">
        <span style="color:#94a3b8;font-size:12px;">Auto Search Summary에서 자동 생성된 브리핑입니다.</span>
      </div>
    </div>`;

  try {
    await resend.emails.send({
      from: fromEmail,
      to: recipientEmail,
      subject: `📋 ${report.title}`,
      html,
    });
    return true;
  } catch (err) {
    console.error("[Mailer] Send failed:", err);
    return false;
  }
}
