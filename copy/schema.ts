/**
 * Copy schema — the single source of truth for all user-facing text in The Pit.
 *
 * Every variant JSON file MUST satisfy this interface. The copy resolution
 * runtime validates variant data against this schema at load time. Missing
 * keys in a variant fall back to the control variant via deep merge.
 *
 * Organisation: top-level keys map to pages or cross-cutting concerns.
 * Nested objects group related strings within a section.
 *
 * Immutable sections (e.g. legal) are marked with a JSDoc tag. The LLM
 * generation CLI will pass these through unchanged.
 */

// ---------------------------------------------------------------------------
// Meta — page-level <title> and <meta description> for SEO
// ---------------------------------------------------------------------------

export interface MetaCopy {
  landing: { title: string; description: string };
  arena: { title: string; description: string };
  arenaBuilder: { title: string; description: string };
  bout: { titleSuffix: string; descriptionTemplate: string; notFoundTitle: string };
  shortLink: { titleSuffix: string; descriptionTemplate: string; fallbackDescription: string };
  recent: { title: string; description: string };
  leaderboard: { title: string; description: string };
  agents: { title: string; description: string };
  agentDetail: { title: string };
  agentNew: { title: string; description: string };
  agentClone: { title: string; description: string };
  research: { title: string; description: string };
  citations: { title: string; description: string };
  roadmap: { title: string; description: string };
  developers: { title: string; description: string };
  feedback: { title: string; description: string };
  contact: { title: string; description: string };
  /** @immutable */
  privacy: { title: string };
  /** @immutable */
  terms: { title: string };
  /** @immutable */
  disclaimer: { title: string };
  /** @immutable */
  security: { title: string };
}

// ---------------------------------------------------------------------------
// Landing page (app/page.tsx)
// ---------------------------------------------------------------------------

export interface HeroCopy {
  badge: string;
  headline: string;
  subheadline: string | string[];
  ctaPrimary: string;
  ctaSecondary: string;
  introPool: {
    label: string;
    remaining: string;
    drainRate: string;
    drained: string;
  };
}

export interface HowItWorksCopy {
  label: string;
  title: string;
  steps: Array<{
    title: string;
    heading: string;
    description: string;
  }>;
}

export interface FeaturedPresetsCopy {
  label: string;
  presets: Array<{
    name: string;
    description: string;
    agentCount: number;
    tags: string[];
  }>;
  viewAll: string;
  count: string;
}

export interface ResearchLayerCopy {
  label: string;
  title: string;
  description: string;
  stats: Array<{
    label: string;
    value: string;
    detail: string;
  }>;
  cta: string;
}

export interface PricingCopy {
  label: string;
  title: string;
  description: string;
  plans: Array<{
    name: string;
    cta: string;
    features: string[];
  }>;
  mostPopular: string;
  creditPacks: {
    label: string;
    byokNote: string;
  };
}

// ---------------------------------------------------------------------------
// Arena page (app/arena/page.tsx)
// ---------------------------------------------------------------------------

export interface ArenaCopy {
  title: string;
  description: string;
  reactionsHint: string;
  credits: {
    label: string;
    rateLabel: string;
    addCredits: string;
    signInPrompt: string;
    introPoolLabel: string;
    creditsLeft: string;
    poolDrained: string;
  };
  tier: {
    pitLab: string;
    pitPass: string;
    free: string;
    boutsRemaining: string;
    manageSubscription: string;
    upgradePlan: string;
  };
  customBout: {
    label: string;
    title: string;
    description: string;
    remixHint: string;
    cta: string;
  };
  upgrade: {
    upgradeTitle: string;
    chooseTitle: string;
    signUpToSubscribe: string;
    signUpDescription: string;
    subscribe: string;
    passDescription: string;
    labDescription: string;
  };
  creditPacks: {
    label: string;
  };
  creditHistory: {
    label: string;
    empty: string;
    columns: {
      when: string;
      source: string;
      delta: string;
      reference: string;
    };
  };
  tagline: string;
}

// ---------------------------------------------------------------------------
// Arena builder page (app/arena/custom/page.tsx)
// ---------------------------------------------------------------------------

export interface ArenaBuilderPageCopy {
  label: string;
  titleNew: string;
  titleReroll: string;
  descriptionNew: string;
  descriptionReroll: string;
  footerTagline: string;
  backToPresets: string;
}

// ---------------------------------------------------------------------------
// Arena component (components/arena.tsx)
// ---------------------------------------------------------------------------

export interface ArenaComponentCopy {
  statusLabels: {
    idle: string;
    streaming: string;
    done: string;
    error: string;
  };
  header: {
    badge: string;
    estCredits: string;
    copied: string;
    share: string;
  };
  error: {
    defaultMessage: string;
    signIn: string;
    getCredits: string;
    tryAgain: string;
  };
  messages: {
    thinking: string;
    awaitingFirst: string;
    copyLabel: string;
    copiedLabel: string;
  };
  voting: {
    whoWon: string;
    votesLabel: string;
    voteLocked: string;
  };
  reroll: {
    label: string;
    description: string;
    tweakAndRerun: string;
    comingSoonTitle: string;
    comingSoonBody: string;
    roadmapLinkText: string;
  };
  latest: string;
}

// ---------------------------------------------------------------------------
// Navigation (components/site-header.tsx, components/site-footer.tsx)
// ---------------------------------------------------------------------------

export interface NavCopy {
  brand: string;
  primary: Array<{ label: string; href: string }>;
  overflow: Array<{ label: string; href: string }>;
  more: string;
  footer: {
    copyright: string;
    links: Array<{ label: string; href: string }>;
  };
  skipToContent: string;
}

// ---------------------------------------------------------------------------
// Cookie consent (components/cookie-consent.tsx)
// ---------------------------------------------------------------------------

export interface CookieConsentCopy {
  message: string;
  essential: string;
  privacyLink: string;
  decline: string;
  accept: string;
}

// ---------------------------------------------------------------------------
// Newsletter (components/newsletter-signup.tsx)
// ---------------------------------------------------------------------------

export interface NewsletterCopy {
  label: string;
  title: string;
  description: string;
  placeholder: string;
  loading: string;
  submit: string;
  success: string;
  error: string;
}

// ---------------------------------------------------------------------------
// Builder showcase (components/builder-showcase.tsx)
// ---------------------------------------------------------------------------

export interface BuilderShowcaseCopy {
  label: string;
  titleLine1: string;
  titleLine2: string;
  subtitle: string;
  description: string;
  ctaPrimary: string;
  ctaSecondary: string;
}

// ---------------------------------------------------------------------------
// Darwin countdown (components/darwin-countdown.tsx)
// ---------------------------------------------------------------------------

export interface DarwinCountdownCopy {
  label: string;
  liveTitle: string;
  liveDescription: string;
  countdownTitle: string;
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
}

// ---------------------------------------------------------------------------
// Rate limit upgrade prompt (components/rate-limit-upgrade-prompt.tsx)
// ---------------------------------------------------------------------------

export interface RateLimitCopy {
  defaultError: string;
  resetsIn: string;
  signInHint: string;
  signInCta: string;
  wantMore: string;
  tierLabels: {
    anonymous: string;
    free: string;
    pass: string;
    lab: string;
  };
  tierBenefits: {
    pass: string;
    lab: string;
  };
  unlimited: string;
  perHour: string;
  remindLater: string;
  tryAgain: string;
}

// ---------------------------------------------------------------------------
// Preset card (components/preset-card.tsx)
// ---------------------------------------------------------------------------

export interface PresetCardCopy {
  locked: string;
  starting: string;
  enterThePit: string;
  signInToPlay: string;
  premium: string;
  premiumRequired: string;
  topicPlaceholder: string;
  topicLabel: string;
  responseLength: string;
  responseFormat: string;
  model: string;
  byokLabel: string;
  byokPlaceholder: string;
  byokRequired: string;
  byokFailed: string;
  byokPrivacy: string;
  byokModelLabel: string;
  byokModelDefault: string;
  maxTurns: string;
  verify: string;
}

// ---------------------------------------------------------------------------
// Arena builder component (components/arena-builder.tsx)
// ---------------------------------------------------------------------------

export interface ArenaBuilderComponentCopy {
  lineup: string;
  pickPrompt: string;
  topicLabel: string;
  topicPlaceholder: string;
  responseLength: string;
  responseFormat: string;
  model: string;
  byokLabel: string;
  launchBout: string;
  signInToLaunch: string;
  searchPlaceholder: string;
  agentsCount: string;
  custom: string;
  selected: string;
  pick: string;
}

// ---------------------------------------------------------------------------
// Agent builder (components/agent-builder.tsx)
// ---------------------------------------------------------------------------

export interface AgentBuilderCopy {
  tabs: {
    basics: string;
    personality: string;
    tactics: string;
    advanced: string;
  };
  fields: {
    name: string;
    namePlaceholder: string;
    archetype: string;
    archetypePlaceholder: string;
    goal: string;
    goalPlaceholder: string;
    tone: string;
    tonePlaceholder: string;
    speechPattern: string;
    speechPatternPlaceholder: string;
    quirks: string;
    quirksPlaceholder: string;
    openingMove: string;
    openingMovePlaceholder: string;
    signatureMove: string;
    signatureMovePlaceholder: string;
    weakness: string;
    weaknessPlaceholder: string;
    fears: string;
    fearsPlaceholder: string;
    customInstructions: string;
    customInstructionsPlaceholder: string;
    responseLength: string;
    responseFormat: string;
  };
  addButton: string;
  validation: {
    nameRequired: string;
    nameTooLong: string;
    personalityRequired: string;
    invalidInput: string;
  };
  submit: {
    creating: string;
    cloning: string;
    create: string;
    clone: string;
  };
  warnings: {
    cloneLineage: string;
    immutable: string;
  };
  promptPreview: {
    title: string;
    empty: string;
  };
}

// ---------------------------------------------------------------------------
// Agent pages
// ---------------------------------------------------------------------------

export interface AgentsCopy {
  title: string;
  pageTitle: string;
  description: string;
  reactionsHint: string;
  createAgent: string;
  searchPlaceholder: string;
  presetFilter: string;
  tierFilter: { all: string; free: string; premium: string; custom: string };
  noMatch: string;
  agentsCount: string;
}

export interface AgentDetailCopy {
  dnaTitle: string;
  cloneRemix: string;
  archiveAgent: string;
  restoreAgent: string;
  archivedNotice: string;
  fields: {
    tier: string;
    length: string;
    format: string;
    created: string;
    owner: string;
  };
  lineage: string;
  remixImpact: string;
  remixCount: string;
  creditsEarned: string;
  promptDna: string;
  structuredDna: string;
  onChainIdentity: {
    title: string;
    description: string;
    promptHash: string;
    manifestHash: string;
    attestation: string;
    viewOnchain: string;
    pending: string;
  };
}

export interface AgentNewCopy {
  label: string;
  title: string;
  description: string;
}

export interface AgentCloneCopy {
  label: string;
  title: string;
  descriptionTemplate: string;
  source: string;
  preset: string;
  lineagePreserved: string;
}

// ---------------------------------------------------------------------------
// Recent bouts (app/recent/page.tsx)
// ---------------------------------------------------------------------------

export interface RecentBoutsCopy {
  title: string;
  description: string;
  empty: string;
  showing: string;
}

// ---------------------------------------------------------------------------
// Leaderboard
// ---------------------------------------------------------------------------

export interface LeaderboardCopy {
  label: string;
  title: string;
  description: string;
  tabs: { pit: string; player: string };
  ranges: { allTime: string; thisWeek: string; today: string };
  search: string;
  presetFilter: string;
  sourceFilter: { all: string; preset: string; custom: string };
  ranked: string;
  empty: string;
  columns: {
    agent: string;
    preset: string;
    bouts: string;
    wins: string;
    winRate: string;
    votes: string;
    bestBout: string;
  };
  replay: string;
}

// ---------------------------------------------------------------------------
// Research pages
// ---------------------------------------------------------------------------

export interface ResearchPageCopy {
  label: string;
  title: string;
  subtitle: string;
  whatWeStudy: {
    title: string;
    bullets: string[];
  };
  dataHandling: {
    title: string;
    description: string;
  };
  litReview: {
    title: string;
    subtitle: string;
    description: string;
    cta: string;
  };
  onChain: {
    title: string;
    subtitle: string;
    bullets: string[];
  };
  datasets: {
    title: string;
    subtitle: string;
    description: string;
    downloadCta: string;
    empty: string;
  };
  collaborate: {
    title: string;
    cta: string;
  };
  backToThePit: string;
}

// ---------------------------------------------------------------------------
// Developers page (app/developers/page.tsx)
// ---------------------------------------------------------------------------

export interface DevelopersCopy {
  label: string;
  title: string;
  description: string[];
  tools: Array<{
    name: string;
    tagline: string;
    description: string;
  }>;
  workflow: {
    title: string;
    steps: Array<{
      label: string;
      title: string;
      description: string;
    }>;
  };
  cta: {
    title: string;
    primary: string;
    secondary: string;
  };
}

// ---------------------------------------------------------------------------
// Roadmap page (app/roadmap/page.tsx)
// ---------------------------------------------------------------------------

export interface RoadmapCopy {
  label: string;
  title: string;
  description: string;
  statusLabels: {
    shipped: string;
    building: string;
    planned: string;
  };
  closingCta: string;
  enterArena: string;
  getInTouch: string;
  backToThePit: string;
}

// ---------------------------------------------------------------------------
// Feedback page (app/feedback/page.tsx)
// ---------------------------------------------------------------------------

export interface FeedbackCopy {
  label: string;
  title: string;
  description: string;
  submitSection: {
    title: string;
    placeholder: string;
  };
  communitySection: {
    title: string;
    subtitle: string;
    description: string;
  };
  backToThePit: string;
}

// ---------------------------------------------------------------------------
// Contact page (app/contact/page.tsx)
// ---------------------------------------------------------------------------

export interface ContactCopy {
  label: string;
  title: string;
  description: string;
  form: {
    name: string;
    email: string;
    message: string;
    sending: string;
    send: string;
    error: string;
  };
  success: {
    title: string;
    subtitle: string;
    description: string;
  };
  backToThePit: string;
}

// ---------------------------------------------------------------------------
// Bout card (components/bout-card.tsx)
// ---------------------------------------------------------------------------

export interface BoutCardCopy {
  timeAgo: {
    justNow: string;
    minutesAgo: string;
    hoursAgo: string;
    daysAgo: string;
  };
  topic: string;
  turns: string;
  watchReplay: string;
}

// ---------------------------------------------------------------------------
// Auth controls (components/auth-controls.tsx)
// ---------------------------------------------------------------------------

export interface AuthControlsCopy {
  signIn: string;
  signUp: string;
  manageSubscription: string;
}

// ---------------------------------------------------------------------------
// Feature request components
// ---------------------------------------------------------------------------

export interface FeatureRequestCopy {
  form: {
    categories: Record<string, string>;
    success: string;
    successDescription: string;
    submitAnother: string;
    signInPrompt: string;
    fields: {
      title: string;
      category: string;
      categoryPlaceholder: string;
      description: string;
    };
    submitting: string;
    submit: string;
    error: string;
  };
  list: {
    statusLabels: {
      planned: string;
      shipped: string;
      reviewed: string;
    };
    loading: string;
    empty: string;
  };
}

// ---------------------------------------------------------------------------
// Paper submission (components/paper-submission-form.tsx)
// ---------------------------------------------------------------------------

export interface PaperSubmissionCopy {
  relevanceAreas: Record<string, string>;
  success: string;
  successDescription: string;
  submitAnother: string;
  signInPrompt: string;
  fields: {
    arxivUrl: string;
    relevanceArea: string;
    areaPlaceholder: string;
    whyItMatters: string;
  };
  validating: string;
  submit: string;
}

// ---------------------------------------------------------------------------
// Checkout components
// ---------------------------------------------------------------------------

export interface CheckoutCopy {
  creditsAdded: string;
  checkoutCancelled: string;
  processing: string;
  buyCredits: string;
}

// ---------------------------------------------------------------------------
// Common / shared strings
// ---------------------------------------------------------------------------

export interface CommonCopy {
  backToThePit: string;
  signIn: string;
  signUp: string;
  loading: string;
  error: string;
  agents: string;
  /** Fallback error message */
  unknownError: string;
}

// ---------------------------------------------------------------------------
// Legal pages — immutable, not A/B tested
// ---------------------------------------------------------------------------

/**
 * @immutable
 * Legal pages are externalized for central management but are
 * never transformed by the LLM variant generator.
 */
export interface LegalCopy {
  privacy: {
    label: string;
    title: string;
    content: string;
  };
  terms: {
    label: string;
    title: string;
    content: string;
  };
  disclaimer: {
    label: string;
    title: string;
    content: string;
  };
  security: {
    label: string;
    title: string;
    content: string;
  };
}

// ---------------------------------------------------------------------------
// Root copy schema
// ---------------------------------------------------------------------------

/**
 * Complete copy schema for The Pit.
 *
 * Every variant JSON must satisfy this interface. The copy resolution
 * runtime validates and deep-merges variants against the control baseline.
 */
export interface CopySchema {
  meta: MetaCopy;
  hero: HeroCopy;
  howItWorks: HowItWorksCopy;
  featuredPresets: FeaturedPresetsCopy;
  researchLayer: ResearchLayerCopy;
  pricing: PricingCopy;
  arena: ArenaCopy;
  arenaBuilderPage: ArenaBuilderPageCopy;
  arenaComponent: ArenaComponentCopy;
  nav: NavCopy;
  cookieConsent: CookieConsentCopy;
  newsletter: NewsletterCopy;
  builderShowcase: BuilderShowcaseCopy;
  darwinCountdown: DarwinCountdownCopy;
  rateLimit: RateLimitCopy;
  presetCard: PresetCardCopy;
  arenaBuilderComponent: ArenaBuilderComponentCopy;
  agentBuilder: AgentBuilderCopy;
  agents: AgentsCopy;
  agentDetail: AgentDetailCopy;
  agentNew: AgentNewCopy;
  agentClone: AgentCloneCopy;
  recentBouts: RecentBoutsCopy;
  leaderboard: LeaderboardCopy;
  researchPage: ResearchPageCopy;
  developers: DevelopersCopy;
  roadmap: RoadmapCopy;
  feedback: FeedbackCopy;
  contact: ContactCopy;
  boutCard: BoutCardCopy;
  authControls: AuthControlsCopy;
  featureRequest: FeatureRequestCopy;
  paperSubmission: PaperSubmissionCopy;
  checkout: CheckoutCopy;
  common: CommonCopy;
  legal: LegalCopy;
}
