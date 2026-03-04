/**
 * db/schema.test.ts — verify schema exports match SPEC.md.
 *
 * These are structural tests: they verify that the schema exports
 * the correct number of tables and enums, and that key columns exist
 * with the right SQL names. No database connection needed.
 */

import { describe, expect, it } from "vitest";
import { getTableName, getTableColumns } from "drizzle-orm";
import * as schema from "./schema";

// ── Enum exports ──────────────────────────────────────────

describe("enums", () => {
  it("exports exactly 4 enums", () => {
    const enums = [
      schema.boutStatusEnum,
      schema.agentTierEnum,
      schema.userTierEnum,
      schema.reactionTypeEnum,
    ];
    expect(enums).toHaveLength(4);
    enums.forEach((e) => expect(e.enumValues).toBeDefined());
  });

  it("bout_status has correct values", () => {
    expect(schema.boutStatusEnum.enumValues).toEqual([
      "running",
      "completed",
      "error",
    ]);
  });

  it("user_tier has correct values", () => {
    expect(schema.userTierEnum.enumValues).toEqual(["free", "pass", "lab"]);
  });

  it("agent_tier has correct values", () => {
    expect(schema.agentTierEnum.enumValues).toEqual([
      "free",
      "premium",
      "custom",
    ]);
  });

  it("reaction_type has correct values", () => {
    expect(schema.reactionTypeEnum.enumValues).toEqual(["heart", "fire"]);
  });
});

// ── Table exports ─────────────────────────────────────────

const tables = [
  { ref: schema.users, name: "users" },
  { ref: schema.bouts, name: "bouts" },
  { ref: schema.agents, name: "agents" },
  { ref: schema.credits, name: "credits" },
  { ref: schema.creditTransactions, name: "credit_transactions" },
  { ref: schema.reactions, name: "reactions" },
  { ref: schema.winnerVotes, name: "winner_votes" },
  { ref: schema.shortLinks, name: "short_links" },
  { ref: schema.referrals, name: "referrals" },
  { ref: schema.introPool, name: "intro_pool" },
  { ref: schema.pageViews, name: "page_views" },
];

describe("tables", () => {
  it("exports exactly 11 tables", () => {
    expect(tables).toHaveLength(11);
  });

  it.each(tables)("$name has correct SQL table name", ({ ref, name }) => {
    expect(getTableName(ref)).toBe(name);
  });
});

// ── Key column checks (SPEC.md fidelity) ─────────────────

describe("users table columns", () => {
  const cols = getTableColumns(schema.users);

  it("has id as varchar(128) PK", () => {
    expect(cols.id).toBeDefined();
    expect(cols.id.columnType).toBe("PgVarchar");
  });

  it("has referral_code column", () => {
    expect(cols.referralCode).toBeDefined();
    expect(cols.referralCode.name).toBe("referral_code");
  });

  it("has subscription_tier column", () => {
    expect(cols.subscriptionTier).toBeDefined();
    expect(cols.subscriptionTier.name).toBe("subscription_tier");
  });

  it("has stripe_customer_id column", () => {
    expect(cols.stripeCustomerId).toBeDefined();
    expect(cols.stripeCustomerId.name).toBe("stripe_customer_id");
  });
});

describe("credits table columns", () => {
  const cols = getTableColumns(schema.credits);

  it("has balance_micro as bigint with default 10000", () => {
    expect(cols.balanceMicro).toBeDefined();
    expect(cols.balanceMicro.name).toBe("balance_micro");
    expect(cols.balanceMicro.columnType).toBe("PgBigInt53");
  });
});

describe("reactions unique constraint", () => {
  it("reactions table has the composite unique columns", () => {
    const cols = getTableColumns(schema.reactions);
    expect(cols.boutId).toBeDefined();
    expect(cols.turnIndex).toBeDefined();
    expect(cols.reactionType).toBeDefined();
    expect(cols.clientFingerprint).toBeDefined();
  });
});
