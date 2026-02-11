import { timingSafeEqual } from 'crypto';

import { withLogging } from '@/lib/api-logging';
import { generateResearchExport } from '@/lib/research-exports';

export const runtime = 'nodejs';

function requireAdmin(req: Request) {
  const token = req.headers.get('x-admin-token');
  const expected = process.env.ADMIN_SEED_TOKEN;
  if (!expected) throw new Error('Not configured.');
  if (!token) throw new Error('Unauthorized');
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) throw new Error('Unauthorized');
  if (!timingSafeEqual(a, b)) throw new Error('Unauthorized');
}

export const POST = withLogging(async function POST(req: Request) {
  try {
    requireAdmin(req);
  } catch {
    return new Response('Unauthorized.', { status: 401 });
  }

  let payload: { version?: string };
  try {
    payload = await req.json();
  } catch {
    return new Response('Invalid JSON.', { status: 400 });
  }

  const version =
    typeof payload.version === 'string' ? payload.version.trim() : '';
  if (!version || version.length > 16) {
    return new Response('version required (max 16 chars).', { status: 400 });
  }

  const result = await generateResearchExport(version);

  return Response.json(result, { status: 201 });
}, 'admin-research-export');
