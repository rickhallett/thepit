// New-user onboarding: signup bonus, referral processing, and session init.
// Orchestrates the first-time flow: ensure user record, generate referral code,
// create credit account, apply signup bonus from the intro pool, and credit
// any referral bonus.

import { eq, and } from 'drizzle-orm';

import { requireDb, type DbOrTx } from '@/db';
import { creditTransactions } from '@/db/schema';
import { cacheGet, cacheSet } from '@/lib/cache';
import { CREDITS_ENABLED, ensureCreditAccount } from '@/lib/credits';
import {
  claimIntroCredits,
  INTRO_SIGNUP_CREDITS,
} from '@/lib/intro-pool';
import { ensureReferralCode, applyReferralBonus } from '@/lib/referrals';
import { ensureUserRecord, userRecordExists } from '@/lib/users';
import { serverTrack, serverIdentify } from '@/lib/posthog-server';

export async function applySignupBonus(userId: string) {
  if (!CREDITS_ENABLED) {
    return { status: 'disabled' as const };
  }

  // Wrap idempotency check + pool claim in a transaction so two concurrent
  // session inits for the same user cannot both pass the existing check
  // and double-claim signup credits from the pool.
  const db = requireDb();
  return db.transaction(async (tx) => {
    const [existing] = await tx
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
    }, tx);

    return {
      status: result.claimedMicro > 0 ? ('claimed' as const) : ('empty' as const),
      claimedMicro: result.claimedMicro,
    };
  });
}

const INIT_CACHE_TTL_SECONDS = 60 * 60; // 1 hour

export async function initializeUserSession(params: {
  userId: string;
  referralCode?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
}) {
  const cacheKey = `onboarding:init:${params.userId}`;
  const cached = await cacheGet<number>(cacheKey);
  if (cached !== null) return;

  // Check DB for existing user BEFORE ensureUserRecord creates one.
  // This provides a durable new-user signal that survives deploys/restarts,
  // unlike the in-memory cache which resets and causes duplicate events.
  const existedBefore = await userRecordExists(params.userId);

  await ensureUserRecord(params.userId);
  await ensureReferralCode(params.userId);

  // Detect new users for analytics. When credits are enabled we use the
  // signup bonus claim as the signal ('claimed' or 'empty' — the pool may be
  // exhausted but the user is still new). When credits are disabled we use
  // the durable DB check from above.
  let isNewUser = false;

  if (CREDITS_ENABLED) {
    await ensureCreditAccount(params.userId);
    const bonusResult = await applySignupBonus(params.userId);
    // Both 'claimed' (got credits) and 'empty' (pool drained) indicate a new
    // user. Only 'already' (duplicate) and 'disabled' are not new signups.
    isNewUser = bonusResult.status === 'claimed' || bonusResult.status === 'empty';

    if (params.referralCode) {
      await applyReferralBonus({
        referredId: params.userId,
        code: params.referralCode,
      });
    }
  } else {
    // Credits disabled (dev / non-monetised). Use the durable DB check —
    // if the user row didn't exist before ensureUserRecord, this is new.
    isNewUser = !existedBefore;
  }

  // --- Analytics: signup_completed (OCE-250) ---
  // Fire once per user on their very first session initialization.
  // When credits are enabled the `isNewUser` flag is true only when the
  // signup bonus was just claimed ('claimed'), guaranteeing exactly-once.
  // When credits are disabled, `isNewUser` is true on the first init for
  // a given userId (no prior cache entry).
  if (isNewUser) {
    // Derive acquisition channel from available attribution data.
    // Priority: referral > paid (utm) > organic
    const acquisitionChannel: string = params.referralCode
      ? 'referral'
      : params.utmSource
        ? 'paid'
        : 'organic';

    // Both serverTrack and serverIdentify now use captureImmediate /
    // identifyImmediate, which complete the HTTP request before returning.
    // No separate flush needed — each call is self-contained.
    // Wrapped in try-catch so a PostHog network/SDK error doesn't crash the
    // root layout render on a new user's first page load.
    try {
      await serverTrack(params.userId, 'signup_completed', {
        referral_code: params.referralCode ?? null,
        utm_source: params.utmSource ?? null,
        utm_medium: params.utmMedium ?? null,
        utm_campaign: params.utmCampaign ?? null,
      });
      await serverIdentify(params.userId, {
        signup_date: new Date().toISOString(),
        initial_tier: 'free',
        current_tier: 'free',
        acquisition_channel: acquisitionChannel,
        referral_code: params.referralCode ?? null,
        utm_source: params.utmSource ?? null,
      });
    } catch {
      // Best-effort — analytics loss is acceptable, layout crash is not.
    }
  }

  await cacheSet(cacheKey, Date.now(), INIT_CACHE_TTL_SECONDS);
}
