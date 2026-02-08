import { headers } from 'next/headers';
import { eq } from 'drizzle-orm';

import { requireDb } from '@/db';
import { creditTransactions } from '@/db/schema';
import {
  applyCreditDelta,
  ensureCreditAccount,
  toMicroCredits,
} from '@/lib/credits';
import { stripe } from '@/lib/stripe';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return new Response('Stripe webhook not configured.', { status: 500 });
  }

  const body = await req.text();
  const headerList = await headers();
  const signature = headerList.get('stripe-signature');
  if (!signature) {
    return new Response('Missing signature.', { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.warn('Stripe webhook signature failed', error);
    return new Response('Invalid signature.', { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as {
      id: string;
      metadata?: Record<string, string>;
    };
    const userId = session.metadata?.userId;
    const credits = session.metadata?.credits
      ? Number(session.metadata.credits)
      : 0;

    if (userId && credits > 0) {
      const db = requireDb();
      const [existing] = await db
        .select({ id: creditTransactions.id })
        .from(creditTransactions)
        .where(eq(creditTransactions.referenceId, session.id))
        .limit(1);

      if (!existing) {
        await ensureCreditAccount(userId);
        const deltaMicro = toMicroCredits(credits);
        await applyCreditDelta(userId, deltaMicro, 'purchase', {
          referenceId: session.id,
          credits,
        });
      }
    }
  }

  return Response.json({ received: true });
}
