import { requireDb } from '@/db';
import { contactSubmissions } from '@/db/schema';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { log } from '@/lib/logger';
import { withLogging } from '@/lib/api-logging';
import { parseValidBody, rateLimitResponse } from '@/lib/api-utils';
import { contactSchema } from '@/lib/api-schemas';

export const runtime = 'nodejs';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const POST = withLogging(async function POST(req: Request) {
  const clientId = getClientIdentifier(req);
  const rateCheck = checkRateLimit(
    { name: 'contact', maxRequests: 5, windowMs: 60 * 60 * 1000 },
    clientId,
  );
  if (!rateCheck.success) {
    return rateLimitResponse(rateCheck);
  }

  const parsed = await parseValidBody(req, contactSchema);
  if (parsed.error) return parsed.error;
  const { name, email, message } = parsed.data;

  /* Always capture to DB first — this is the durable record */
  const db = requireDb();
  await db.insert(contactSubmissions).values({ name, email, message });

  /* Best-effort email delivery — log failure but do not fail the request */
  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.CONTACT_TO_EMAIL;
  const fromEmail = process.env.CONTACT_FROM_EMAIL ?? 'The Pit <contact@thepit.ai>';

  if (apiKey && toEmail) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10_000),
        body: JSON.stringify({
          from: fromEmail,
          to: [toEmail],
          subject: `The Pit contact — ${name.replace(/[\r\n]+/g, ' ').trim()}`,
          html: `<p><strong>Name:</strong> ${escapeHtml(name)}</p><p><strong>Email:</strong> ${escapeHtml(email)}</p><p>${escapeHtml(message).replace(/\n/g, '<br/>')}</p>`,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        log.warn('Resend API error (contact captured to DB)', { responseText: text });
      }
    } catch (err) {
      log.warn('Resend API fetch failed (contact captured to DB)', { error: String(err) });
    }
  }

  return Response.json({ ok: true });
}, 'contact');
