// OpenAPI 3.1 specification for The Pit's public API.
//
// This spec documents endpoints available to Lab-tier subscribers.
// It is served from GET /api/openapi (gated behind Lab tier auth)
// and rendered by Scalar at /docs/api (public browsing).

export const spec = {
  openapi: '3.1.0',
  info: {
    title: 'The Pit API',
    version: '1.0.0',
    description:
      'Programmatic access to The Pit — run AI debate bouts, create agents, react, and vote. Requires a Pit Lab subscription for authenticated endpoints.',
    contact: {
      url: 'https://thepit.cloud/contact',
    },
  },
  servers: [
    {
      url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://thepit.cloud',
      description: 'Production',
    },
  ],
  paths: {
    '/api/v1/bout': {
      post: {
        operationId: 'runBout',
        summary: 'Run a bout (synchronous)',
        description:
          'Execute a full multi-turn AI debate bout and return the completed transcript as JSON. The bout runs all turns, generates a share line, persists to the database, and settles credits before responding. Long bouts (12 turns, long length) may take 60-90 seconds.',
        tags: ['Bouts'],
        security: [{ clerkAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['boutId', 'presetId'],
                properties: {
                  boutId: {
                    type: 'string',
                    description: 'Unique bout identifier (nanoid, 21 chars). Must be pre-created via the createBout server action or generated client-side.',
                    example: 'V1StGXR8_Z5jdHi6B-myT',
                  },
                  presetId: {
                    type: 'string',
                    description: 'Preset scenario ID (e.g. "darwin-special", "roast-battle") or "arena" for custom lineups.',
                    example: 'darwin-special',
                  },
                  topic: {
                    type: 'string',
                    maxLength: 500,
                    description: 'Optional debate topic. If omitted, agents freestyle.',
                    example: 'Is consciousness an emergent property?',
                  },
                  model: {
                    type: 'string',
                    description: 'Model to use. Options depend on your tier: free tier gets Haiku, Pass gets Sonnet, Lab gets all models including Opus. Use "byok" for your own API key.',
                    example: 'claude-sonnet-4-5-20250929',
                  },
                  length: {
                    type: 'string',
                    enum: ['short', 'standard', 'long'],
                    description: 'Response length per turn. Short: 1-2 sentences. Standard: 3-5 sentences. Long: 1-2 paragraphs.',
                    default: 'standard',
                  },
                  format: {
                    type: 'string',
                    enum: ['plain', 'spaced', 'json'],
                    description: 'Response format. Spaced: paragraphs with spacing (default). Plain: no markup. JSON: structured output.',
                    default: 'spaced',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Bout completed successfully.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/BoutResult',
                },
              },
            },
          },
          '400': { description: 'Invalid request (missing fields, bad format).' },
          '401': { description: 'Authentication required.' },
          '402': { description: 'Insufficient credits or tier restriction.' },
          '403': { description: 'API access requires Pit Lab subscription.' },
          '404': { description: 'Unknown preset.' },
          '409': { description: 'Bout already running or completed.' },
          '429': { description: 'Rate limit exceeded.' },
          '500': { description: 'Internal server error.' },
          '504': { description: 'Bout timed out.' },
        },
      },
    },
    '/api/agents': {
      post: {
        operationId: 'createAgent',
        summary: 'Create a custom agent',
        description:
          'Create a new AI agent with structured personality fields. Agents can be used in arena-mode bouts. The system prompt is generated from the personality fields (archetype, tone, quirks, etc.).',
        tags: ['Agents'],
        security: [{ clerkAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string', maxLength: 80, description: 'Agent display name. No URLs allowed.', example: 'Grumpy Philosopher' },
                  archetype: { type: 'string', maxLength: 200, description: 'Core personality archetype.', example: 'Cynical Stoic' },
                  tone: { type: 'string', maxLength: 200, description: 'Communication style.', example: 'Dry, sardonic' },
                  quirks: { type: 'array', items: { type: 'string', maxLength: 100 }, maxItems: 10, description: 'Personality quirks.' },
                  speechPattern: { type: 'string', maxLength: 200, description: 'How the agent speaks.', example: 'Starts every sentence with "Well actually..."' },
                  openingMove: { type: 'string', maxLength: 500, description: 'How the agent opens debates.' },
                  signatureMove: { type: 'string', maxLength: 500, description: 'A recurring rhetorical strategy.' },
                  weakness: { type: 'string', maxLength: 500, description: 'An exploitable flaw.' },
                  goal: { type: 'string', maxLength: 500, description: 'What the agent is trying to achieve.' },
                  fears: { type: 'string', maxLength: 500, description: 'What the agent wants to avoid.' },
                  customInstructions: { type: 'string', maxLength: 5000, description: 'Freeform additional instructions appended to the generated prompt.' },
                  parentId: { type: 'string', description: 'ID of the agent this is cloned/remixed from.' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Agent created.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    agentId: { type: 'string' },
                    promptHash: { type: 'string' },
                    manifestHash: { type: 'string' },
                    attestationFailed: { type: 'boolean' },
                  },
                },
              },
            },
          },
          '400': { description: 'Validation error.' },
          '401': { description: 'Authentication required.' },
          '402': { description: 'Agent slot limit reached.' },
          '429': { description: 'Rate limit exceeded (10 agents/hour).' },
        },
      },
    },
    '/api/reactions': {
      post: {
        operationId: 'addReaction',
        summary: 'React to a bout turn',
        description: 'Add a heart or fire reaction to a specific turn in a bout. Reactions are deduplicated per user per turn.',
        tags: ['Engagement'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['boutId', 'turnIndex', 'reactionType'],
                properties: {
                  boutId: { type: 'string', description: 'The bout to react to.' },
                  turnIndex: { type: 'integer', description: 'Zero-based turn index.' },
                  reactionType: { type: 'string', enum: ['heart', 'fire'], description: 'Reaction type.' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Reaction recorded.',
            content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' } } } } },
          },
          '400': { description: 'Invalid request.' },
          '429': { description: 'Rate limit exceeded (30/min).' },
        },
      },
    },
    '/api/winner-vote': {
      post: {
        operationId: 'castWinnerVote',
        summary: 'Vote for a bout winner',
        description: 'Cast a winner vote for an agent in a completed bout. One vote per user per bout.',
        tags: ['Engagement'],
        security: [{ clerkAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['boutId', 'agentId'],
                properties: {
                  boutId: { type: 'string' },
                  agentId: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Vote recorded.',
            content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' } } } } },
          },
          '400': { description: 'Invalid request.' },
          '401': { description: 'Authentication required.' },
          '404': { description: 'Bout not found.' },
        },
      },
    },
    '/api/short-links': {
      post: {
        operationId: 'createShortLink',
        summary: 'Create a short link for a bout',
        description: 'Generate a short shareable slug for a bout replay. Idempotent — returns existing slug if one exists.',
        tags: ['Sharing'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['boutId'],
                properties: {
                  boutId: { type: 'string', maxLength: 21 },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Existing short link returned.',
            content: { 'application/json': { schema: { type: 'object', properties: { slug: { type: 'string' }, created: { type: 'boolean' } } } } },
          },
          '201': { description: 'New short link created.' },
          '400': { description: 'Invalid boutId.' },
          '404': { description: 'Bout not found.' },
          '429': { description: 'Rate limit exceeded (30/min).' },
        },
      },
    },
    '/api/feature-requests': {
      get: {
        operationId: 'listFeatureRequests',
        summary: 'List feature requests',
        description: 'List all non-declined feature requests with vote counts, sorted by popularity. If authenticated, includes whether the current user has voted.',
        tags: ['Community'],
        responses: {
          '200': {
            description: 'Feature request list.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    requests: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'integer' },
                          title: { type: 'string' },
                          description: { type: 'string' },
                          category: { type: 'string' },
                          status: { type: 'string' },
                          createdAt: { type: 'string', format: 'date-time' },
                          displayName: { type: 'string' },
                          voteCount: { type: 'integer' },
                          userVoted: { type: 'boolean' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/health': {
      get: {
        operationId: 'healthCheck',
        summary: 'Health check',
        description: 'Lightweight health check returning service status, database connectivity, and enabled feature flags.',
        tags: ['System'],
        responses: {
          '200': {
            description: 'Service healthy.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['ok', 'degraded'] },
                    startedAt: { type: 'string', format: 'date-time' },
                    timestamp: { type: 'string', format: 'date-time' },
                    database: {
                      type: 'object',
                      properties: {
                        status: { type: 'string', enum: ['ok', 'error'] },
                        latencyMs: { type: 'number' },
                      },
                    },
                    features: {
                      type: 'object',
                      properties: {
                        subscriptions: { type: 'boolean' },
                        credits: { type: 'boolean' },
                        byok: { type: 'boolean' },
                        eas: { type: 'boolean' },
                        askThePit: { type: 'boolean' },
                      },
                    },
                  },
                },
              },
            },
          },
          '503': { description: 'Service degraded (database unreachable).' },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      clerkAuth: {
        type: 'http',
        scheme: 'bearer',
        description: 'Clerk session token. Obtain by signing in at thepit.cloud.',
      },
    },
    schemas: {
      TranscriptEntry: {
        type: 'object',
        properties: {
          turn: { type: 'integer', description: 'Zero-based turn index.' },
          agentId: { type: 'string', description: 'Agent identifier.' },
          agentName: { type: 'string', description: 'Agent display name.' },
          text: { type: 'string', description: 'The agent\'s response text for this turn.' },
        },
        required: ['turn', 'agentId', 'agentName', 'text'],
      },
      BoutResult: {
        type: 'object',
        properties: {
          boutId: { type: 'string', description: 'Unique bout identifier.' },
          status: { type: 'string', enum: ['completed'], description: 'Always "completed" on success.' },
          transcript: {
            type: 'array',
            items: { $ref: '#/components/schemas/TranscriptEntry' },
            description: 'Ordered list of all turns in the bout.',
          },
          shareLine: {
            type: ['string', 'null'],
            description: 'AI-generated tweet-length summary of the bout (max 140 chars). Null if generation failed.',
          },
          agents: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
              },
            },
            description: 'Agents that participated in the bout.',
          },
          usage: {
            type: 'object',
            properties: {
              inputTokens: { type: 'integer', description: 'Total input tokens consumed across all turns.' },
              outputTokens: { type: 'integer', description: 'Total output tokens generated across all turns.' },
            },
            description: 'Token usage for the bout.',
          },
        },
        required: ['boutId', 'status', 'transcript', 'agents', 'usage'],
      },
    },
  },
  tags: [
    { name: 'Bouts', description: 'Run AI debate bouts and retrieve results.' },
    { name: 'Agents', description: 'Create and manage custom AI agents.' },
    { name: 'Engagement', description: 'React to turns and vote on bout winners.' },
    { name: 'Sharing', description: 'Create shareable links for bout replays.' },
    { name: 'Community', description: 'Feature requests and community contributions.' },
    { name: 'System', description: 'Health checks and system status.' },
  ],
} as const;
