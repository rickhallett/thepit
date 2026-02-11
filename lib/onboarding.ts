// New-user onboarding: signup bonus, referral processing, and session init.
// Orchestrates the first-time flow: ensure user record, generate referral code,
// create credit account, apply signup bonus from the intro pool, and credit
// any referral bonus.

import { eq, and } from 'drizzle-orm';

import { requireDb } from '@/db';
import { creditTransactions } from '@/db/schema';
import { CREDITS_ENABLED, ensureCreditAccount } from '@/lib/credits';
import {
  claimIntroCredits,
  INTRO_SIGNUP_CREDITS,
} from '@/lib/intro-pool';
import { ensureReferralCode, applyReferralBonus } from '@/lib/referrals';
import { ensureUserRecord } from '@/lib/users';

export async function applySignupBonus(userId: string) {
  if (!CREDITS_ENABLED) {
    return { status: 'disabled' as const };
  }
  const db = requireDb();
  const [existing] = await db
    .select({ id: creditTransactions.id })
    .from(creditTransactions)
    .where(
      and(
        eq(creditTransactions.userId, userId),
        eq(creditTransactions.source, 'signup'),
      ),
    )
    .limit(1);

  if (existing) {
    return { status: 'already' as const };
  }

  const result = await claimIntroCredits({
    userId,
    credits: INTRO_SIGNUP_CREDITS,
    source: 'signup',
    referenceId: userId,
  });

  return {
    status: result.claimedMicro > 0 ? ('claimed' as const) : ('empty' as const),
    claimedMicro: result.claimedMicro,
  };
}

export async function initializeUserSession(params: {
  userId: string;
  referralCode?: string | null;
}) {
  await ensureUserRecord(params.userId);
  await ensureReferralCode(params.userId);

  if (!CREDITS_ENABLED) {
    return;
  }

  await ensureCreditAccount(params.userId);
  await applySignupBonus(params.userId);

  if (params.referralCode) {
    await applyReferralBonus({
      referredId: params.userId,
      code: params.referralCode,
    });
  }
}
