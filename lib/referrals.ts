import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';

import { requireDb } from '@/db';
import { referrals, users } from '@/db/schema';
import { claimIntroCredits, INTRO_REFERRAL_CREDITS } from '@/lib/intro-pool';

export async function ensureReferralCode(userId: string) {
  const db = requireDb();
  const [existing] = await db
    .select({ referralCode: users.referralCode })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (existing?.referralCode) {
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

  await db.insert(referrals).values({
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
  });

  if (result.claimedMicro > 0) {
    await db
      .update(referrals)
      .set({ credited: true })
      .where(eq(referrals.referredId, params.referredId));
    return { status: 'credited' as const, referrerId: referrer.id };
  }

  return { status: 'empty' as const, referrerId: referrer.id };
}
