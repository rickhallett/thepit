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

// In-memory set of recently initialized users. Prevents the 5+ DB queries
// in initializeUserSession from running on every single page load for the
// same authenticated user. Entries expire after 1 hour.
const recentlyInitialized = new Map<string, number>();
const INIT_CACHE_TTL_MS = 60 * 60 * 1000;

export async function initializeUserSession(params: {
  userId: string;
  referralCode?: string | null;
}) {
  const now = Date.now();
  const lastInit = recentlyInitialized.get(params.userId);
  if (lastInit && now - lastInit < INIT_CACHE_TTL_MS) {
    return;
  }

  await ensureUserRecord(params.userId);
  await ensureReferralCode(params.userId);

  if (CREDITS_ENABLED) {
    await ensureCreditAccount(params.userId);
    await applySignupBonus(params.userId);

    if (params.referralCode) {
      await applyReferralBonus({
        referredId: params.userId,
        code: params.referralCode,
      });
    }
  }

  recentlyInitialized.set(params.userId, now);

  // Periodic cleanup: remove stale entries to prevent unbounded growth
  if (recentlyInitialized.size > 1000) {
    for (const [uid, ts] of recentlyInitialized) {
      if (now - ts > INIT_CACHE_TTL_MS) {
        recentlyInitialized.delete(uid);
      }
    }
  }
}
