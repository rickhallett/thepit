/** Onboarding orchestrator — first authenticated page load sequence */
import { ensureUserRecord, type UserProfile } from "./users";
import { ensureReferralCode } from "./referrals";

// TODO: Replaced by real implementation in task 10
async function ensureCreditAccount(_userId: string): Promise<void> {
  // Stub — credit account creation implemented in task 10
}

/**
 * Initialize a user session on first authenticated page load.
 * Calls: ensureUserRecord -> ensureReferralCode -> ensureCreditAccount
 * Idempotent: safe to call on every page load.
 */
export async function initializeUserSession(
  clerkUserId: string,
  profile: UserProfile,
): Promise<void> {
  await ensureUserRecord(clerkUserId, profile);
  await ensureReferralCode(clerkUserId);
  await ensureCreditAccount(clerkUserId);
}
