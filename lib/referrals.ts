// Referral system: users share a unique code, and both referrer and referred
// user receive bonus credits from the community intro pool. Codes are 8-char
// nanoid strings stored on the user record and retried on collision.

import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';

import { requireDb, type DbOrTx } from '@/db';
import { referrals, users } from '@/db/schema';
import { claimIntroCredits, INTRO_REFERRAL_CREDITS } from '@/lib/intro-pool';
import { log } from '@/lib/logger';

export async function ensureReferralCode(userId: string) {
  const db = requireDb();
  const [existing] = await db
    .select({ referralCode: users.referralCode })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!existing) {
    log.error('referral code generation failed: user not found', { userId });
    throw new Error('User not found');
  }

  if (existing.referralCode) {
    return existing.referralCode;
  }

  let code = nanoid(8);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      await db
        .update(users)
        .set({ referralCode: code, updatedAt: new Date() })
        .where(eq(users.id, userId));
      return code;
    } catch {
      code = nanoid(8);
    }
  }

  return code;
}

export async function applyReferralBonus(params: {
  referredId: string;
  code: string;
}) {
  const db = requireDb();

  // Pre-transaction reads: idempotency check and referrer lookup.
  // These don't need to be inside the transaction because they're
  // read-only guards that produce early returns.
  const [existing] = await db
    .select()
    .from(referrals)
    .where(eq(referrals.referredId, params.referredId))
    .limit(1);

  if (existing) {
    return { status: 'already' as const, referrerId: existing.referrerId };
  }

  const [referrer] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.referralCode, params.code))
    .limit(1);

  if (!referrer || referrer.id === params.referredId) {
    return { status: 'invalid' as const };
  }

  // Wrap insert + claim + credited update in a single transaction.
  // Without this, a failure between claimIntroCredits and the credited
  // update leaves an uncredited referral that retries would skip (the
  // existing check above returns 'already'), permanently losing the grant.
  return db.transaction(async (tx) => {
    await tx.insert(referrals).values({
      referrerId: referrer.id,
      referredId: params.referredId,
      code: params.code,
      credited: false,
    });

    const result = await claimIntroCredits({
      userId: referrer.id,
      credits: INTRO_REFERRAL_CREDITS,
      source: 'referral',
      referenceId: params.referredId,
      metadata: { referredId: params.referredId },
    }, tx);

    if (result.claimedMicro > 0) {
      await tx
        .update(referrals)
        .set({ credited: true })
        .where(eq(referrals.referredId, params.referredId));
      return { status: 'credited' as const, referrerId: referrer.id };
    }

    return { status: 'empty' as const, referrerId: referrer.id };
  });
}
