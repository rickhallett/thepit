import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { log } from '@/lib/logger';
import { withLogging } from '@/lib/api-logging';
import { errorResponse, parseJsonBody, rateLimitResponse } from '@/lib/api-utils';

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

  const parsed = await parseJsonBody<{ name?: string; email?: string; message?: string }>(req);
  if (parsed.error) return parsed.error;
  const payload = parsed.data;

  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  const email = typeof payload.email === 'string' ? payload.email.trim() : '';
  const message =
    typeof payload.message === 'string' ? payload.message.trim() : '';

  if (!name || !email || !message) {
    return errorResponse('Missing fields.', 400);
  }

  if (name.length > 200 || email.length > 256 || message.length > 5000) {
    return errorResponse('Input too long.', 400);
  }

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!EMAIL_RE.test(email)) {
    return errorResponse('Invalid email address.', 400);
  }

  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.CONTACT_TO_EMAIL;
  const fromEmail = process.env.CONTACT_FROM_EMAIL ?? 'The Pit <contact@thepit.ai>';

  if (!apiKey || !toEmail) {
    return errorResponse('Contact email not configured.', 501);
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [toEmail],
      subject: `The Pit contact — ${name.replace(/[\r\n]+/g, ' ').trim()}`,
      html: `<p><strong>Name:</strong> ${escapeHtml(name)}</p><p><strong>Email:</strong> ${escapeHtml(email)}</p><p>${escapeHtml(message).replace(/\n/g, '<br/>')}</p>`,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    log.error('Resend API error', { responseText: text });
    return errorResponse('Email delivery failed.', 500);
  }

  log.info('contact.submitted', {
    messageLength: message.length,
  });

  return Response.json({ ok: true });
}, 'contact');
