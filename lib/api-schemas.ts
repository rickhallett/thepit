// Zod schemas for API request body validation.
//
// Each schema mirrors the manual typeof/trim/length validation that was
// previously inlined in each route handler. Moving to declarative schemas
// provides runtime type safety at trust boundaries, single-source-of-truth
// validation rules, and better error messages.
//
// Usage:
//   import { contactSchema } from '@/lib/api-schemas';
//   const parsed = await parseValidBody(req, contactSchema);
//   if (parsed.error) return parsed.error;
//   const { name, email, message } = parsed.data; // fully typed & validated

import { z } from 'zod/v4';
import { UNSAFE_PATTERN } from '@/lib/validation';

// ---------------------------------------------------------------------------
// Shared refinements
// ---------------------------------------------------------------------------

/** Email regex matching the pattern used across routes. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** String that is trimmed, bounded, and checked against UNSAFE_PATTERN. */
const safeString = (label: string, min: number, max: number) =>
  z.string({ message: `${label} is required.` }).trim()
    .min(min, `${label} must be at least ${min} characters.`)
    .max(max, `${label} must be ${max} characters or fewer.`)
    .refine((s) => !UNSAFE_PATTERN.test(s), `${label} must not contain URLs or scripts.`);

// ---------------------------------------------------------------------------
// Route schemas
// ---------------------------------------------------------------------------

/** POST /api/contact */
export const contactSchema = z.object({
  name: z.string({ message: 'Missing fields.' }).trim().min(1, 'Missing fields.').max(200, 'Input too long.'),
  email: z.string({ message: 'Missing fields.' }).trim()
    .min(1, 'Missing fields.')
    .max(256, 'Input too long.')
    .refine((s) => EMAIL_RE.test(s), 'Invalid email address.'),
  message: z.string({ message: 'Missing fields.' }).trim().min(1, 'Missing fields.').max(5000, 'Input too long.'),
});
export type ContactBody = z.infer<typeof contactSchema>;

/** POST /api/newsletter */
export const newsletterSchema = z.object({
  email: z.string({ message: 'Email required.' }).trim()
    .min(1, 'Email required.')
    .max(256, 'Invalid email address.')
    .refine((s) => EMAIL_RE.test(s), 'Invalid email address.')
    .refine((s) => !/[<>"']/.test(s), 'Invalid email address.'),
});
export type NewsletterBody = z.infer<typeof newsletterSchema>;

/** POST /api/ask-the-pit */
export const askThePitSchema = z.object({
  message: z.string({ message: 'Missing message.' }).trim()
    .min(1, 'Missing message.')
    .max(2000, 'Message must be 2000 characters or fewer.'),
});
export type AskThePitBody = z.infer<typeof askThePitSchema>;

/** POST /api/reactions */
export const reactionSchema = z.object({
  boutId: z.string({ message: 'Missing boutId or turnIndex.' }).trim()
    .refine((s) => /^[\w-]{10,30}$/.test(s), 'Invalid boutId format.'),
  turnIndex: z.number({ message: 'Missing boutId or turnIndex.' })
    .int('turnIndex must be a non-negative integer.')
    .refine((n) => n >= 0, 'turnIndex must be a non-negative integer.'),
  reactionType: z.enum(['heart', 'fire'], { message: 'Invalid reaction type.' }),
});
export type ReactionBody = z.infer<typeof reactionSchema>;

/** POST /api/short-links */
export const shortLinkSchema = z.object({
  boutId: z.string({ message: 'Valid boutId required.' }).trim()
    .min(1, 'Valid boutId required.')
    .max(21, 'Valid boutId required.'),
});
export type ShortLinkBody = z.infer<typeof shortLinkSchema>;

/** POST /api/winner-vote */
export const winnerVoteSchema = z.object({
  boutId: z.string({ message: 'Missing boutId or agentId.' }).trim().min(1, 'Missing boutId or agentId.'),
  agentId: z.string({ message: 'Missing boutId or agentId.' }).trim().min(1, 'Missing boutId or agentId.'),
});
export type WinnerVoteBody = z.infer<typeof winnerVoteSchema>;

/** POST /api/feature-requests/vote */
export const featureRequestVoteSchema = z.object({
  featureRequestId: z.number({ message: 'Missing or invalid featureRequestId.' })
    .int('Missing or invalid featureRequestId.'),
});
export type FeatureRequestVoteBody = z.infer<typeof featureRequestVoteSchema>;

/** POST /api/byok-stash */
export const byokStashSchema = z.object({
  key: z.string({ message: 'Missing key.' }).trim()
    .min(1, 'Missing key.')
    .max(256, 'Key too long.'),
  model: z.string().trim().optional(),
});
export type ByokStashBody = z.infer<typeof byokStashSchema>;

/** POST /api/feature-requests */
const VALID_FR_CATEGORIES = ['agents', 'arena', 'presets', 'research', 'ui', 'other'] as const;
export const featureRequestSchema = z.object({
  title: safeString('Title', 5, 200),
  description: safeString('Description', 20, 3000),
  category: z.enum(VALID_FR_CATEGORIES, { message: 'Invalid category.' }),
});
export type FeatureRequestBody = z.infer<typeof featureRequestSchema>;

/** POST /api/paper-submissions */
const VALID_PAPER_AREAS = [
  'agent-interaction', 'evaluation', 'persona',
  'context-windows', 'prompt-engineering', 'other',
] as const;
export const paperSubmissionSchema = z.object({
  arxivUrl: z.string({ message: 'arXiv URL required.' }).trim().min(1, 'arXiv URL required.'),
  justification: safeString('Justification', 50, 2000),
  relevanceArea: z.enum(VALID_PAPER_AREAS, { message: 'Invalid relevance area.' }),
});
export type PaperSubmissionBody = z.infer<typeof paperSubmissionSchema>;

/** POST /api/admin/research-export */
export const researchExportSchema = z.object({
  version: z.string({ message: 'version required (max 16 chars).' }).trim()
    .min(1, 'version required (max 16 chars).')
    .max(16, 'version required (max 16 chars).'),
});
export type ResearchExportBody = z.infer<typeof researchExportSchema>;

/** POST /api/pv (page view — internal endpoint) */
export const pageViewSchema = z.object({
  path: z.string({ message: 'Missing path or sessionId.' }).min(1, 'Missing path or sessionId.'),
  sessionId: z.string({ message: 'Missing path or sessionId.' }).min(1, 'Missing path or sessionId.'),
  clientIp: z.string().optional(),
  referrer: z.string().optional(),
  userAgent: z.string().optional(),
  country: z.string().optional(),
  utm: z.string().optional(),
  userId: z.string().optional(),
  copyVariant: z.string().optional(),
  visitNumber: z.number().optional(),
  daysSinceLastVisit: z.number().nullable().optional(),
  isNewSession: z.boolean().optional(),
  referralCode: z.string().optional(),
});
export type PageViewBody = z.infer<typeof pageViewSchema>;

/** POST /api/agents — structured agent creation. */
export const agentCreateSchema = z.object({
  name: z.string({ message: 'Missing name.' }).trim()
    .min(1, 'Missing name.')
    .max(80, 'Name must be 80 characters or fewer.')
    .refine((s) => !UNSAFE_PATTERN.test(s), 'Name must not contain URLs or scripts.'),
  systemPrompt: z.string().optional(),
  presetId: z.string().optional(),
  tier: z.enum(['free', 'premium', 'custom']).optional(),
  model: z.string().optional(),
  responseLength: z.string().optional(),
  responseFormat: z.string().optional(),
  parentId: z.string().optional(),
  archetype: z.string().max(200, 'Archetype must be 200 characters or fewer.').optional(),
  tone: z.string().max(200, 'Tone must be 200 characters or fewer.').optional(),
  quirks: z.array(z.string()).optional(),
  speechPattern: z.string().max(200, 'Speech pattern must be 200 characters or fewer.').optional(),
  openingMove: z.string().max(500, 'Opening move must be 500 characters or fewer.').optional(),
  signatureMove: z.string().max(500, 'Signature move must be 500 characters or fewer.').optional(),
  weakness: z.string().max(500, 'Weakness must be 500 characters or fewer.').optional(),
  goal: z.string().max(500, 'Goal must be 500 characters or fewer.').optional(),
  fears: z.string().max(500, 'Fears must be 500 characters or fewer.').optional(),
  customInstructions: z.string().max(5000, 'Custom instructions must be 5000 characters or fewer.').optional(),
  clientManifestHash: z.string().optional(),
});
export type AgentCreateBody = z.infer<typeof agentCreateSchema>;
