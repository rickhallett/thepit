// User record management, bridging Clerk authentication with the local database.
//
// Clerk is the source of truth for auth; this module syncs profile data
// (email, display name, avatar) into the local users table for use in
// leaderboards, bout ownership, and referral tracking. Profiles are
// refreshed lazily when stale (>24 hours since last sync).

import { auth, clerkClient } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';

import { requireDb } from '@/db';
import { users } from '@/db/schema';

/** How long before we re-fetch a user's Clerk profile (24 hours). */
const PROFILE_REFRESH_MS = 24 * 60 * 60 * 1000;

export const getAuthUserId = async () => {
  const { userId } = await auth();
  return userId ?? null;
};

export const requireUserId = async () => {
  const { userId } = await auth();
  if (!userId) {
    throw new Error('Authentication required.');
  }
  return userId;
};

/**
 * Mask an email address for public display.
 * "kai@oceanheart.ai" -> "k***@oceanheart.ai"
 */
export function maskEmail(email: string): string {
  const atIndex = email.indexOf('@');
  if (atIndex <= 0) return email;
  return `${email[0]}***${email.slice(atIndex)}`;
}

async function fetchClerkProfile(userId: string) {
  const client = await clerkClient();
  const profile = await client.users.getUser(userId);
  return {
    email: profile.emailAddresses[0]?.emailAddress ?? null,
    displayName:
      profile.username ||
      [profile.firstName, profile.lastName].filter(Boolean).join(' ') ||
      null,
    imageUrl: profile.imageUrl ?? null,
  };
}

export async function ensureUserRecord(userId: string) {
  const db = requireDb();
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (existing) {
    const stale =
      !existing.updatedAt ||
      Date.now() - new Date(existing.updatedAt).getTime() > PROFILE_REFRESH_MS;

    if (stale) {
      try {
        const profile = await fetchClerkProfile(userId);
        const [updated] = await db
          .update(users)
          .set({
            email: profile.email,
            displayName: profile.displayName,
            imageUrl: profile.imageUrl,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId))
          .returning();
        return updated;
      } catch (error) {
        console.warn('Failed to refresh Clerk profile for user', userId, error);
      }
    }

    return existing;
  }

  let email: string | null = null;
  let displayName: string | null = null;
  let imageUrl: string | null = null;

  try {
    const profile = await fetchClerkProfile(userId);
    email = profile.email;
    displayName = profile.displayName;
    imageUrl = profile.imageUrl;
  } catch (error) {
    console.warn('Failed to fetch Clerk profile for user', userId, error);
  }

  const [created] = await db
    .insert(users)
    .values({
      id: userId,
      email,
      displayName,
      imageUrl,
    })
    .returning();

  return created;
}

/**
 * Look up a user's display name. Fallback chain:
 * displayName -> masked email -> truncated ID.
 */
export async function getUserDisplayName(userId: string): Promise<string> {
  const db = requireDb();
  const [user] = await db
    .select({ displayName: users.displayName, email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user?.displayName) return user.displayName;
  if (user?.email) return maskEmail(user.email);
  return `${userId.slice(0, 8)}...`;
}
