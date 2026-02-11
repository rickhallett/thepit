// Stripe client for one-time credit pack purchases (GBP currency).

import Stripe from 'stripe';

const key = process.env.STRIPE_SECRET_KEY ?? '';

export const stripe = new Stripe(key, {
  apiVersion: '2023-10-16',
});
