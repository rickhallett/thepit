import { headers } from 'next/headers';

import { toError } from '@/lib/errors';
import { log } from '@/lib/logger';
import { withLogging } from '@/lib/api-logging';
import { errorResponse, API_ERRORS } from '@/lib/api-utils';
import { stripe } from '@/lib/stripe';
import {
  handleCheckoutCompleted,
  handleSubscriptionCreated,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handleInvoicePaymentFailed,
  handleInvoicePaymentSucceeded,
} from '@/lib/billing';

export const runtime = 'nodejs';

/**
 * Stripe webhook handler - thin transport layer.
 *
 * Responsibilities: verify signature, parse event, dispatch to billing
 * domain functions, return 200. All business logic lives in lib/billing.ts.
 *
 * Idempotency is handled within each billing function via referenceId
 * deduplication. See lib/billing.ts for details.
 */
export const POST = withLogging(async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return errorResponse(API_ERRORS.SERVICE_UNAVAILABLE, 500);
  }

  const body = await req.text();
  const headerList = await headers();
  const signature = headerList.get('stripe-signature');
  if (!signature) {
    return errorResponse(API_ERRORS.MISSING_SIGNATURE, 400);
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    log.warn('Stripe webhook signature failed', toError(error));
    return errorResponse(API_ERRORS.INVALID_SIGNATURE, 400);
  }

  // Stripe SDK event.data.object has union types (e.g. customer: string |
  // Customer | DeletedCustomer). The billing functions use structural types
  // matching the subset of fields they need. The `as` casts here are safe
  // because Stripe webhook payloads always deliver these fields as strings.
  const obj = event.data.object;
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(obj as Parameters<typeof handleCheckoutCompleted>[0]);
      break;

    case 'customer.subscription.created':
      await handleSubscriptionCreated(obj as Parameters<typeof handleSubscriptionCreated>[0]);
      break;

    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(obj as Parameters<typeof handleSubscriptionUpdated>[0]);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(obj as Parameters<typeof handleSubscriptionDeleted>[0]);
      break;

    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(obj as Parameters<typeof handleInvoicePaymentFailed>[0]);
      break;

    case 'invoice.payment_succeeded':
      await handleInvoicePaymentSucceeded(obj as Parameters<typeof handleInvoicePaymentSucceeded>[0]);
      break;
  }

  return Response.json({ received: true });
}, 'credits-webhook');
