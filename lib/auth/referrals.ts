/** Referral code generation — nanoid(8), retry on collision */
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { nanoid } from "nanoid";

const MAX_RETRIES = 4;

/**
 * Ensure user has a referral code.
 * Returns existing code if present, generates new one if not.
 * Retries up to 4 times on unique constraint collision.
 */
export async function ensureReferralCode(userId: string): Promise<string> {
  // Check for existing code
  const existing = await db
    .select({ referralCode: users.referralCode })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (existing[0]?.referralCode) {
    return existing[0].referralCode;
  }

  // Generate new code with retry on collision
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const code = nanoid(8);

    try {
      const result = await db
        .update(users)
        .set({ referralCode: code })
        .where(and(eq(users.id, userId), isNull(users.referralCode)))
        .returning({ referralCode: users.referralCode });

      // If update affected a row, we got the code
      if (result[0]?.referralCode) {
        return result[0].referralCode;
      }

      // No rows affected — either user doesn't exist or already has a code
      // Re-check in case of race condition where another process set the code
      const recheck = await db
        .select({ referralCode: users.referralCode })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (recheck[0]?.referralCode) {
        return recheck[0].referralCode;
      }

      // User doesn't exist
      throw new Error(`User ${userId} not found`);
    } catch (error) {
      // Check for unique constraint violation (code collision)
      if (isUniqueViolation(error)) {
        continue; // Retry with new code
      }
      throw error;
    }
  }

  throw new Error(
    `Failed to generate unique referral code after ${MAX_RETRIES} attempts`,
  );
}

function isUniqueViolation(error: unknown): boolean {
  // Postgres unique violation error code is 23505
  return (
    error instanceof Error &&
    "code" in error &&
    (error as { code: string }).code === "23505"
  );
}
