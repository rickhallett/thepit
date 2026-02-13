// Anonymization utilities for research data exports.
//
// All PII (user IDs, emails) is replaced with salted SHA-256 hashes
// before export. The salt is a per-deployment secret that prevents
// cross-dataset de-anonymization while preserving within-dataset
// consistency (same userId always maps to the same hash).

import { sha256Hex } from '@/lib/hash';

const ANONYMIZE_SALT = (() => {
  const salt = process.env.RESEARCH_ANONYMIZE_SALT;
  if (!salt && process.env.NODE_ENV === 'production') {
    throw new Error(
      'RESEARCH_ANONYMIZE_SALT must be set in production to protect PII in research exports. ' +
      'Generate a random value: openssl rand -hex 32',
    );
  }
  return salt ?? 'thepit-research-default-salt';
})();

/**
 * Anonymize a user ID by salting and hashing it.
 * Returns a 0x-prefixed hex string. Null/undefined inputs return null.
 */
export async function anonymizeUserId(
  userId: string | null | undefined,
): Promise<string | null> {
  if (!userId) return null;
  return sha256Hex(`${ANONYMIZE_SALT}:user:${userId}`);
}

/**
 * Anonymize an agent owner ID (same algorithm, different prefix for safety).
 */
export async function anonymizeOwnerId(
  ownerId: string | null | undefined,
): Promise<string | null> {
  if (!ownerId) return null;
  return sha256Hex(`${ANONYMIZE_SALT}:owner:${ownerId}`);
}
