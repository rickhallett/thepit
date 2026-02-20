import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { log } from '@/lib/logger';
import { withLogging } from '@/lib/api-logging';
import { errorResponse, parseValidBody, rateLimitResponse } from '@/lib/api-utils';
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

  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.CONTACT_TO_EMAIL;
  const fromEmail = process.env.CONTACT_FROM_EMAIL ?? 'The Pit <contact@thepit.ai>';

  if (!apiKey || !toEmail) {
    return errorResponse('Contact email not configured.', 501);
  }

  let res: Response;
  try {
    res = await fetch('https://api.resend.com/emails', {
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
  } catch (err) {
    log.error('Resend API fetch failed', { error: String(err) });
    return errorResponse('Email delivery failed — please try again.', 502);
  }

  if (!res.ok) {
    const text = await res.text();
    log.error('Resend API error', { responseText: text });
    return errorResponse('Email delivery failed.', 500);
  }

  return Response.json({ ok: true });
}, 'contact');
