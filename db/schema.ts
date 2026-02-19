// Drizzle ORM schema for THE PIT's PostgreSQL database (Neon serverless).
//
// Key design decisions:
//   - bouts.id uses varchar(21) because nanoid() produces 21-char IDs by default.
//   - credits.balanceMicro is a bigint in micro-credits (1 credit = 100 micro)
//     to avoid floating-point rounding in financial operations.
//   - bouts.agentLineup is JSONB rather than a join table because arena-mode
//     lineups are ephemeral, user-composed, and only read alongside the bout.
//   - agents has both promptHash and manifestHash: promptHash identifies the
//     behaviour (system prompt only), manifestHash identifies the full identity
//     (all fields). Both are used in on-chain EAS attestations.
//   - winnerVotes has a unique index on (boutId, userId) to enforce one vote per
//     user per bout at the database level.

import {
  jsonb,
  pgEnum,
  pgTable,
  serial,
  timestamp,
  varchar,
  bigint,
  text,
  uniqueIndex,
  index,
  boolean,
  integer,
  foreignKey,
} from 'drizzle-orm/pg-core';

export type TranscriptEntry = {
  turn: number;
  agentId: string;
  agentName: string;
  text: string;
};

export type ArenaAgent = {
  id: string;
  name: string;
  systemPrompt: string;
  color?: string;
  avatar?: string;
};

export const boutStatus = pgEnum('bout_status', [
  'running',
  'completed',
  'error',
]);

export const agentTier = pgEnum('agent_tier', ['free', 'premium', 'custom']);

export const userTier = pgEnum('user_tier', ['free', 'pass', 'lab']);

export const bouts = pgTable('bouts', {
  id: varchar('id', { length: 21 }).primaryKey(),
  presetId: varchar('preset_id', { length: 64 }).notNull(),
  status: boutStatus('status').notNull(),
  transcript: jsonb('transcript').$type<TranscriptEntry[]>().notNull(),
  ownerId: varchar('owner_id', { length: 128 }),
  topic: text('topic'),
  responseLength: varchar('response_length', { length: 32 }),
  responseFormat: varchar('response_format', { length: 32 }),
  maxTurns: integer('max_turns'),
  agentLineup: jsonb('agent_lineup').$type<ArenaAgent[]>(),
  shareLine: text('share_line'),
  shareGeneratedAt: timestamp('share_generated_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (table) => ({
  createdAtIdx: index('bouts_created_at_idx').on(table.createdAt),
  statusCreatedAtIdx: index('bouts_status_created_at_idx').on(
    table.status,
    table.createdAt,
  ),
  // FK added via foreignKey() because users is defined after bouts.
  ownerFk: foreignKey({
    columns: [table.ownerId],
    foreignColumns: [users.id],
    name: 'bouts_owner_id_users_id_fk',
  }).onDelete('set null'),
}));

export const users = pgTable('users', {
  id: varchar('id', { length: 128 }).primaryKey(),
  email: varchar('email', { length: 256 }),
  displayName: varchar('display_name', { length: 128 }),
  imageUrl: varchar('image_url', { length: 512 }),
  referralCode: varchar('referral_code', { length: 32 }),
  subscriptionTier: userTier('subscription_tier').notNull().default('free'),
  subscriptionStatus: varchar('subscription_status', { length: 32 }),
  subscriptionId: varchar('subscription_id', { length: 128 }),
  subscriptionCurrentPeriodEnd: timestamp('subscription_current_period_end', {
    withTimezone: true,
  }),
  stripeCustomerId: varchar('stripe_customer_id', { length: 128 }),
  freeBoutsUsed: integer('free_bouts_used').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (table) => ({
  referralCodeIdx: uniqueIndex('users_referral_code_idx').on(
    table.referralCode,
  ),
}));

export const credits = pgTable('credits', {
  userId: varchar('user_id', { length: 128 }).primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  balanceMicro: bigint('balance_micro', { mode: 'number' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const creditTransactions = pgTable('credit_transactions', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 128 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  deltaMicro: bigint('delta_micro', { mode: 'number' }).notNull(),
  source: varchar('source', { length: 64 }).notNull(),
  referenceId: varchar('reference_id', { length: 128 }),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (table) => ({
  userCreatedIdx: index('credit_txn_user_created_idx').on(
    table.userId,
    table.createdAt,
  ),
  referenceIdIdx: index('credit_txn_reference_id_idx').on(table.referenceId),
}));

export const introPool = pgTable('intro_pool', {
  id: serial('id').primaryKey(),
  initialMicro: bigint('initial_micro', { mode: 'number' }).notNull(),
  claimedMicro: bigint('claimed_micro', { mode: 'number' }).notNull(),
  drainRateMicroPerMinute: bigint('drain_rate_micro_per_minute', {
    mode: 'number',
  }).notNull(),
  startedAt: timestamp('started_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const referrals = pgTable('referrals', {
  id: serial('id').primaryKey(),
  referrerId: varchar('referrer_id', { length: 128 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  referredId: varchar('referred_id', { length: 128 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  code: varchar('code', { length: 32 }).notNull(),
  credited: boolean('credited').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const reactions = pgTable('reactions', {
  id: serial('id').primaryKey(),
  boutId: varchar('bout_id', { length: 21 }).notNull().references(() => bouts.id, { onDelete: 'cascade' }),
  turnIndex: integer('turn_index').notNull(),
  reactionType: varchar('reaction_type', { length: 32 }).notNull(),
  userId: varchar('user_id', { length: 128 }).references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (table) => ({
  boutIdIdx: index('reactions_bout_id_idx').on(table.boutId),
  uniqueReaction: uniqueIndex('reactions_unique_idx').on(
    table.boutId,
    table.turnIndex,
    table.reactionType,
    table.userId,
  ),
}));

export const winnerVotes = pgTable(
  'winner_votes',
  {
    id: serial('id').primaryKey(),
    boutId: varchar('bout_id', { length: 21 }).notNull().references(() => bouts.id, { onDelete: 'cascade' }),
    agentId: varchar('agent_id', { length: 128 }).notNull(),
    userId: varchar('user_id', { length: 128 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    uniqueVote: uniqueIndex('winner_votes_unique').on(
      table.boutId,
      table.userId,
    ),
    createdAtIdx: index('winner_votes_created_at_idx').on(table.createdAt),
  }),
);

export const newsletterSignups = pgTable('newsletter_signups', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 256 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (table) => ({
  emailIdx: uniqueIndex('newsletter_signups_email_idx').on(table.email),
}));

export const agents = pgTable('agents', {
  id: varchar('id', { length: 128 }).primaryKey(),
  name: varchar('name', { length: 128 }).notNull(),
  systemPrompt: text('system_prompt').notNull(),
  presetId: varchar('preset_id', { length: 64 }),
  tier: agentTier('tier').notNull(),
  model: varchar('model', { length: 128 }),
  responseLength: varchar('response_length', { length: 32 }).notNull(),
  responseFormat: varchar('response_format', { length: 32 }).notNull(),
  archetype: text('archetype'),
  tone: text('tone'),
  quirks: jsonb('quirks').$type<string[]>(),
  speechPattern: text('speech_pattern'),
  openingMove: text('opening_move'),
  signatureMove: text('signature_move'),
  weakness: text('weakness'),
  goal: text('goal'),
  fears: text('fears'),
  customInstructions: text('custom_instructions'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  ownerId: varchar('owner_id', { length: 128 }).references(() => users.id, { onDelete: 'set null' }),
  parentId: varchar('parent_id', { length: 128 }),
  promptHash: varchar('prompt_hash', { length: 66 }).notNull(),
  manifestHash: varchar('manifest_hash', { length: 66 }).notNull(),
  attestationUid: varchar('attestation_uid', { length: 128 }),
  attestationTxHash: varchar('attestation_tx_hash', { length: 66 }),
  attestedAt: timestamp('attested_at', { withTimezone: true }),
  archived: boolean('archived').notNull().default(false),
}, (table) => ({
  archivedCreatedIdx: index('agents_archived_created_idx').on(
    table.archived,
    table.createdAt,
  ),
  parentFk: foreignKey({
    columns: [table.parentId],
    foreignColumns: [table.id],
    name: 'agents_parent_id_agents_id_fk',
  }).onDelete('set null'),
}));

export const freeBoutPool = pgTable('free_bout_pool', {
  id: serial('id').primaryKey(),
  date: varchar('date', { length: 10 }).notNull(),
  used: integer('used').notNull().default(0),
  maxDaily: integer('max_daily').notNull(),
  /** Cumulative platform spend (micro-credits) on free-tier bouts today. */
  spendMicro: bigint('spend_micro', { mode: 'number' }).notNull().default(0),
  /** Daily spend cap (micro-credits). Default £20 = 200,000 micro. */
  spendCapMicro: bigint('spend_cap_micro', { mode: 'number' }).notNull().default(200_000),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (table) => ({
  dateIdx: uniqueIndex('free_bout_pool_date_idx').on(table.date),
}));

export const agentFlags = pgTable(
  'agent_flags',
  {
    id: serial('id').primaryKey(),
    agentId: varchar('agent_id', { length: 128 }).notNull().references(() => agents.id, { onDelete: 'cascade' }),
    userId: varchar('user_id', { length: 128 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
    reason: varchar('reason', { length: 32 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    uniqueFlag: uniqueIndex('agent_flags_unique').on(
      table.agentId,
      table.userId,
    ),
  }),
);

export const paperSubmissions = pgTable(
  'paper_submissions',
  {
    id: serial('id').primaryKey(),
    userId: varchar('user_id', { length: 128 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
    arxivId: varchar('arxiv_id', { length: 32 }).notNull(),
    arxivUrl: varchar('arxiv_url', { length: 512 }).notNull(),
    title: varchar('title', { length: 500 }).notNull(),
    authors: varchar('authors', { length: 1000 }).notNull(),
    abstract: text('abstract'),
    justification: text('justification').notNull(),
    relevanceArea: varchar('relevance_area', { length: 64 }).notNull(),
    status: varchar('status', { length: 16 }).notNull().default('pending'),
    adminNotes: text('admin_notes'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdx: index('paper_submissions_user_idx').on(table.userId),
    uniqueSubmission: uniqueIndex('paper_submissions_unique').on(
      table.userId,
      table.arxivId,
    ),
  }),
);

export const featureRequests = pgTable(
  'feature_requests',
  {
    id: serial('id').primaryKey(),
    userId: varchar('user_id', { length: 128 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 200 }).notNull(),
    description: text('description').notNull(),
    category: varchar('category', { length: 64 }).notNull(),
    status: varchar('status', { length: 16 }).notNull().default('pending'),
    adminNotes: text('admin_notes'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    createdAtIdx: index('feature_requests_created_at_idx').on(table.createdAt),
  }),
);

export const featureRequestVotes = pgTable(
  'feature_request_votes',
  {
    id: serial('id').primaryKey(),
    featureRequestId: integer('feature_request_id').notNull().references(() => featureRequests.id, { onDelete: 'cascade' }),
    userId: varchar('user_id', { length: 128 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    uniqueVote: uniqueIndex('feature_request_votes_unique').on(
      table.featureRequestId,
      table.userId,
    ),
  }),
);

// ---------------------------------------------------------------------------
// Page views – server-side analytics for all non-API page loads
// ---------------------------------------------------------------------------

export const pageViews = pgTable('page_views', {
  id: serial('id').primaryKey(),
  path: varchar('path', { length: 512 }).notNull(),
  userId: varchar('user_id', { length: 128 }),
  sessionId: varchar('session_id', { length: 32 }).notNull(),
  referrer: varchar('referrer', { length: 1024 }),
  userAgent: varchar('user_agent', { length: 512 }),
  ipHash: varchar('ip_hash', { length: 66 }),
  utmSource: varchar('utm_source', { length: 128 }),
  utmMedium: varchar('utm_medium', { length: 128 }),
  utmCampaign: varchar('utm_campaign', { length: 128 }),
  utmTerm: varchar('utm_term', { length: 128 }),
  utmContent: varchar('utm_content', { length: 128 }),
  country: varchar('country', { length: 2 }),
  /** Active copy A/B test variant for this page view (e.g. 'control', 'hype'). */
  copyVariant: varchar('copy_variant', { length: 32 }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (table) => ({
  pathCreatedIdx: index('page_views_path_created_idx').on(
    table.path,
    table.createdAt,
  ),
  sessionIdx: index('page_views_session_idx').on(table.sessionId),
  createdAtIdx: index('page_views_created_at_idx').on(table.createdAt),
}));

// ---------------------------------------------------------------------------
// Short links – shareable slugs that resolve to a bout
// ---------------------------------------------------------------------------

export const shortLinks = pgTable('short_links', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 32 }).notNull(),
  boutId: varchar('bout_id', { length: 21 }).notNull().references(() => bouts.id, { onDelete: 'cascade' }),
  createdByUserId: varchar('created_by_user_id', { length: 128 }).references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (table) => ({
  boutIdIdx: uniqueIndex('short_links_bout_id_idx').on(table.boutId),
  slugIdx: uniqueIndex('short_links_slug_idx').on(table.slug),
}));

// ---------------------------------------------------------------------------
// Short link clicks – analytics for each short-link resolution
// ---------------------------------------------------------------------------

export const shortLinkClicks = pgTable('short_link_clicks', {
  id: serial('id').primaryKey(),
  shortLinkId: integer('short_link_id').notNull(),
  boutId: varchar('bout_id', { length: 21 }).notNull().references(() => bouts.id, { onDelete: 'cascade' }),
  sharerId: varchar('sharer_id', { length: 128 }).references(() => users.id, { onDelete: 'set null' }),
  refCode: varchar('ref_code', { length: 64 }),
  utmSource: varchar('utm_source', { length: 128 }),
  utmMedium: varchar('utm_medium', { length: 128 }),
  utmCampaign: varchar('utm_campaign', { length: 128 }),
  utmTerm: varchar('utm_term', { length: 128 }),
  utmContent: varchar('utm_content', { length: 128 }),
  referer: text('referer'),
  userAgent: text('user_agent'),
  ipHash: varchar('ip_hash', { length: 66 }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (table) => ({
  shortLinkFk: foreignKey({
    columns: [table.shortLinkId],
    foreignColumns: [shortLinks.id],
    name: 'short_link_clicks_short_link_id_short_links_id_fk',
  }),
}));

// ---------------------------------------------------------------------------
// Remix events – tracks agent remix/clone lineage and reward payouts
// ---------------------------------------------------------------------------

export const remixEvents = pgTable('remix_events', {
  id: serial('id').primaryKey(),
  sourceAgentId: varchar('source_agent_id', { length: 128 }).notNull().references(() => agents.id),
  remixedAgentId: varchar('remixed_agent_id', { length: 128 }).references(() => agents.id, { onDelete: 'set null' }),
  remixerUserId: varchar('remixer_user_id', { length: 128 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  sourceOwnerId: varchar('source_owner_id', { length: 128 }).references(() => users.id, { onDelete: 'set null' }),
  outcome: varchar('outcome', { length: 32 }).notNull(),
  reason: varchar('reason', { length: 64 }),
  rewardRemixerMicro: bigint('reward_remixer_micro', { mode: 'number' })
    .notNull()
    .default(0),
  rewardSourceOwnerMicro: bigint('reward_source_owner_micro', {
    mode: 'number',
  })
    .notNull()
    .default(0),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ---------------------------------------------------------------------------
// Research exports – snapshot payloads for research dataset downloads
// ---------------------------------------------------------------------------

export const researchExports = pgTable('research_exports', {
  id: serial('id').primaryKey(),
  version: varchar('version', { length: 16 }).notNull(),
  generatedAt: timestamp('generated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  boutCount: integer('bout_count').notNull(),
  reactionCount: integer('reaction_count').notNull(),
  voteCount: integer('vote_count').notNull(),
  agentCount: integer('agent_count').notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
});
