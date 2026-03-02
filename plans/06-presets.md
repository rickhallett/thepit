# 06-presets

## Context
depends_on: [05]
produces: [lib/bouts/presets.ts, lib/bouts/presets.test.ts, presets/darwin-special.json, presets/philosophers-club.json, presets/startup-pitch.json, presets/history-debate.json]
domain: lib/bouts/
gate: typecheck + lint + test:unit

## References
Read these files before implementing:
- SPEC.md (Bout Flow section, Tier Configuration section)
- lib/bouts/DOMAIN.md
- lib/common/types.ts (AgentId)

## Task

### 1. Preset JSON schema

Each preset JSON file follows this structure:
```json
{
  "id": "darwin-special",
  "name": "Darwin Special",
  "description": "Evolution meets creationism in a cage match of ideas",
  "agents": [
    {
      "id": "darwin",
      "name": "Charles Darwin",
      "systemPrompt": "You are Charles Darwin. Argue from the perspective of natural selection and evolutionary biology. Be empirical, methodical, and patient. Reference your observations from the Beagle voyage.",
      "color": "#4CAF50"
    },
    {
      "id": "paley",
      "name": "William Paley",
      "systemPrompt": "You are William Paley. Argue from the watchmaker analogy and natural theology. Be eloquent and appeal to design in nature. Reference your work Natural Theology.",
      "color": "#FF5722"
    }
  ],
  "maxTurns": 6,
  "defaultModel": "claude-haiku",
  "tier": "free"
}
```

### 2. Create 4 preset files

Create in the `presets/` directory:

**presets/darwin-special.json** — Darwin vs Paley (evolution vs design). 2 agents, 6 turns, free tier.

**presets/philosophers-club.json** — Socrates vs Nietzsche vs Simone de Beauvoir (meaning of life). 3 agents, 6 turns, free tier.

**presets/startup-pitch.json** — Optimistic Founder vs Skeptical VC (startup viability). 2 agents, 4 turns, free tier.

**presets/history-debate.json** — Caesar vs Genghis Khan (empire building strategy). 2 agents, 6 turns, free tier.

Each agent systemPrompt should be 2-3 sentences establishing persona, argument style, and references. Keep them punchy. Set defaultModel to `"claude-haiku"` for all free-tier presets.

### 3. Preset loading module

Create `lib/bouts/presets.ts`:

```typescript
import { z } from "zod";

const PresetAgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  systemPrompt: z.string(),
  color: z.string(),
});

const PresetSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  agents: z.array(PresetAgentSchema).min(2),
  maxTurns: z.number().int().min(2).max(20),
  defaultModel: z.string(),
  tier: z.enum(["free", "premium"]),
});

export type Preset = z.infer<typeof PresetSchema>;
export type PresetAgent = z.infer<typeof PresetAgentSchema>;
```

Implement:
```typescript
export function getAllPresets(): Preset[]
// Load all JSON files from presets/ directory, validate each with PresetSchema
// Cache after first load (module-level variable)

export function getPresetById(id: string): Preset | null
// Find by id from getAllPresets()
```

Use `fs.readFileSync` + `JSON.parse` for loading (these run server-side only). Resolve the presets directory path relative to `process.cwd()`.

### 4. Unit tests

Create `lib/bouts/presets.test.ts`:
- Test getAllPresets returns an array with length >= 4
- Test each preset passes PresetSchema validation
- Test getPresetById returns correct preset for known ID
- Test getPresetById returns null for unknown ID
- Test all presets have at least 2 agents
- Test all preset IDs are unique

### Do NOT
- Create a database table for presets — they are static JSON files
- Add a preset creation API — presets are developer-authored
- Build a UI for presets — that comes in task 16
- Add premium presets — all are free tier for now

## Verification
After implementing, verify:
- `pnpm run typecheck` exits 0
- `pnpm run lint` exits 0
- `pnpm run test:unit` exits 0 — preset tests pass
- 4 JSON files exist in `presets/` directory
- Each JSON file is valid JSON and matches the schema
- `getPresetById("darwin-special")` returns a valid preset
