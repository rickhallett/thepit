import { auth, clerkClient } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';

import { requireDb } from '@/db';
import { users } from '@/db/schema';

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

export async function ensureUserRecord(userId: string) {
  const db = requireDb();
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (existing) {
    return existing;
  }

  let email: string | null = null;
  let displayName: string | null = null;
  let imageUrl: string | null = null;

  try {
    const profile = await clerkClient.users.getUser(userId);
    email = profile.emailAddresses[0]?.emailAddress ?? null;
    displayName =
      profile.username ??
      [profile.firstName, profile.lastName].filter(Boolean).join(' ') ??
      null;
    imageUrl = profile.imageUrl ?? null;
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
