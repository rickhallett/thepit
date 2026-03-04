/** User mirroring — Clerk user ID to local database */
import { db } from "@/db";
import { users } from "@/db/schema";

export interface UserProfile {
  email: string;
  displayName: string | null;
  imageUrl: string | null;
}

/**
 * Ensure user record exists in the database.
 * First write wins — does NOT update existing records on conflict.
 * Idempotent: safe to call multiple times with the same ID.
 */
export async function ensureUserRecord(
  clerkUserId: string,
  profile: UserProfile,
): Promise<void> {
  await db
    .insert(users)
    .values({
      id: clerkUserId,
      email: profile.email,
      displayName: profile.displayName,
      imageUrl: profile.imageUrl,
    })
    .onConflictDoNothing({ target: users.id });
}
