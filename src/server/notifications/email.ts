import "server-only";
import { Resend } from "resend";
import { env } from "@/lib/env";

export function emailConfigured(): boolean {
  return Boolean(env.RESEND_API_KEY);
}

export type EmailResult = { ok: true; id: string | null } | { ok: false; skipped?: true; error: string };

/** Send one transactional email through Resend. Never throws. */
export async function sendEmail(input: { to: string; subject: string; html: string; text: string }): Promise<EmailResult> {
  if (!env.RESEND_API_KEY) return { ok: false, skipped: true, error: "RESEND_API_KEY not set" };
  try {
    const resend = new Resend(env.RESEND_API_KEY);
    const r = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    if (r.error) return { ok: false, error: r.error.message };
    return { ok: true, id: r.data?.id ?? null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Minimal branded wrapper — dark card, gold accent, one button. */
export function emailLayout(opts: { heading: string; lines: string[]; ctaLabel: string; ctaUrl: string }): { html: string; text: string } {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const html = `<!doctype html><html><body style="margin:0;background:#0a0a0f;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#f3ead9">
<div style="max-width:560px;margin:0 auto;padding:32px 20px">
  <div style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#c69437;margin-bottom:12px">EmberOS</div>
  <h1 style="font-size:22px;margin:0 0 16px;color:#f3ead9">${esc(opts.heading)}</h1>
  ${opts.lines.map((l) => `<p style="font-size:15px;line-height:1.5;margin:0 0 10px;color:#d9cfbd">${esc(l)}</p>`).join("")}
  <p style="margin:24px 0"><a href="${opts.ctaUrl}" style="display:inline-block;background:#c69437;color:#0a0a0f;text-decoration:none;font-weight:600;padding:12px 18px;border-radius:8px">${esc(opts.ctaLabel)}</a></p>
  <p style="font-size:12px;color:#8a8170">Heaven's Leaf · EmberOS notifications</p>
</div></body></html>`;
  const text = `${opts.heading}\n\n${opts.lines.join("\n")}\n\n${opts.ctaLabel}: ${opts.ctaUrl}`;
  return { html, text };
}
