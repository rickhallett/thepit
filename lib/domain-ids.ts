// Branded (nominal) types for domain identifiers.
//
// TypeScript's structural type system treats all `string` types as
// interchangeable. This means a `userId` can be accidentally passed where
// a `boutId` is expected, and the compiler won't catch it. Branded types
// add a phantom property that exists only at the type level, making each
// ID type incompatible with the others while remaining a plain string at
// runtime.
//
// Usage:
//   import { BoutId, asBoutId } from '@/lib/domain-ids';
//   const id: BoutId = asBoutId('abc123');    // explicit branding
//   const id: BoutId = 'abc123';              // compile error
//   function load(boutId: BoutId) { ... }
//   load(asBoutId(rawInput));                 // brand at trust boundary
//   load(userId);                             // compile error — wrong type

// ─── Brand utility ──────────────────────────────────────────────────────────

/** Phantom brand marker — never exists at runtime. */
declare const __brand: unique symbol;

/** Generic branded type constructor. */
type Brand<T, B extends string> = T & { readonly [__brand]: B };

// ─── Domain ID types ────────────────────────────────────────────────────────

/** Bout identifier — 21-char nanoid. */
export type BoutId = Brand<string, 'BoutId'>;

/** User identifier — Clerk user ID (up to 128 chars). */
export type UserId = Brand<string, 'UserId'>;

/** Agent identifier — preset composite or custom nanoid. */
export type AgentId = Brand<string, 'AgentId'>;

/** Micro-credit amount — 1 credit = 100 micro. */
export type MicroCredits = Brand<number, 'MicroCredits'>;

// ─── Brand constructors ─────────────────────────────────────────────────────
//
// These cast raw values to branded types. Use them at trust boundaries:
//   - API request parsing (Zod schemas)
//   - Database query results
//   - Authentication providers (Clerk)
//   - ID generation (nanoid)
//
// Do NOT scatter these throughout business logic. The point is that once
// a value is branded at the boundary, it flows through the system without
// needing re-branding.

/** Brand a raw string as a BoutId. */
export function asBoutId(raw: string): BoutId {
  return raw as BoutId;
}

/** Brand a raw string as a UserId. */
export function asUserId(raw: string): UserId {
  return raw as UserId;
}

/** Brand a raw string as an AgentId. */
export function asAgentId(raw: string): AgentId {
  return raw as AgentId;
}

/** Brand a raw number as MicroCredits. */
export function asMicroCredits(raw: number): MicroCredits {
  return raw as MicroCredits;
}

// ─── Type guards ────────────────────────────────────────────────────────────
//
// For cases where you have a union type and need to narrow, these
// provide runtime + type-level narrowing. The runtime check is a no-op
// (branded types are phantom), so these always return true for non-empty
// strings / finite numbers. They exist for code clarity, not runtime safety.

/** Narrow a string to BoutId (validates non-empty). */
export function isBoutId(val: string): val is BoutId {
  return val.length > 0;
}

/** Narrow a string to UserId (validates non-empty). */
export function isUserId(val: string): val is UserId {
  return val.length > 0;
}

/** Narrow a string to AgentId (validates non-empty). */
export function isAgentId(val: string): val is AgentId {
  return val.length > 0;
}

/** Narrow a number to MicroCredits (validates finite). */
export function isMicroCredits(val: number): val is MicroCredits {
  return Number.isFinite(val);
}
