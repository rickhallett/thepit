// Stripe customer resolution with database persistence.
//
// Moved from app/actions.ts to establish a proper data access layer
// boundary. Separated from lib/users.ts to avoid breaking existing
// test mocks that mock @/lib/users with a subset of exports.

import { eq } from 'drizzle-orm';

import { requireDb } from '@/db';
import { users } from '@/db/schema';

/**
 * Get or create a Stripe customer for a user.
 *
 * Resolves in this order to avoid duplicate customers under concurrency:
 *   1. Return stripeCustomerId from the users table if already stored.
 *   2. Search Stripe for an existing customer with matching userId metadata.
 *   3. Create a new Stripe customer and persist the ID.
 */
export async function getOrCreateStripeCustomer(
  userId: string,
  stripeClient: {
    customers: {
      search: (params: { query: string; limit: number }) => Promise<{ data: { id: string }[] }>;
      create: (params: { metadata: { userId: string }; email?: string }) => Promise<{ id: string }>;
    };
  },
): Promise<string> {
  const db = requireDb();
  const [user] = await db
    .select({
      stripeCustomerId: users.stripeCustomerId,
      email: users.email,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user?.stripeCustomerId) return user.stripeCustomerId;

  // Guard against race conditions: check Stripe for an existing customer
  // created by a concurrent request before our DB write completed.
  const existing = await stripeClient.customers.search({
    query: `metadata["userId"]:"${userId}"`,
    limit: 1,
  });

  if (existing.data.length > 0) {
    const customerId = existing.data[0]!.id;
    await db
      .update(users)
      .set({ stripeCustomerId: customerId, updatedAt: new Date() })
      .where(eq(users.id, userId));
    return customerId;
  }

  const customer = await stripeClient.customers.create({
    metadata: { userId },
    ...(user?.email ? { email: user.email } : {}),
  });

  await db
    .update(users)
    .set({ stripeCustomerId: customer.id, updatedAt: new Date() })
    .where(eq(users.id, userId));

  return customer.id;
}
