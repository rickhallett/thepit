// Stripe client for one-time credit pack purchases (GBP currency).
//
// Lazily initialized to avoid startup crashes when STRIPE_SECRET_KEY is not
// configured (e.g. in dev without payments). Throws eagerly on first use
// if the key is missing — error messages from an empty-key client could leak
// configuration state.

import Stripe from 'stripe';

import { env } from '@/lib/env';

let _stripe: Stripe | null = null;

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    if (!_stripe) {
      const key = env.STRIPE_SECRET_KEY;
      if (!key) {
        throw new Error('STRIPE_SECRET_KEY is not configured.');
      }
      _stripe = new Stripe(key, {
        apiVersion: '2023-10-16',
      });
    }
    return (_stripe as unknown as Record<string | symbol, unknown>)[prop];
  },
});
