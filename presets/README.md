[← Root](../README.md)

# presets/

JSON preset definitions for THE PIT's debate scenarios. Each preset defines a cast of AI agents with personas, a turn structure, and optional user input requirements.

## Contents

| File | Type | Description |
|------|------|-------------|
| `index.json` | Index | Master preset index (unused at runtime — presets are imported directly) |
| `darwin-special.json` | Free | Darwin Day special scenario |
| `last-supper.json` | Free | Last Supper debate |
| `roast-battle.json` | Free | Roast battle format |
| `shark-pit.json` | Free | Shark Tank-style pitches |
| `on-the-couch.json` | Free | Therapy couch scenario |
| `gloves-off.json` | Free | No-holds-barred debate |
| `first-contact.json` | Free | First alien contact |
| `writers-room.json` | Free | TV writers room |
| `mansion.json` | Free | Murder mystery mansion |
| `summit.json` | Free | Diplomatic summit |
| `flatshare.json` | Free | Flatmate conflicts |
| `special-guest-hal.json` | Free (dormant) | HAL 9000 guest appearance — exists on disk but is not imported by `lib/presets.ts` at runtime |
| `presets-top5.json` | Premium | Top 5 premium pack (5 presets) |
| `presets-remaining6.json` | Premium | Remaining 6 premium pack (6 presets) |

**Total: 10 active free presets (+1 dormant on disk) + 11 premium presets = 21 active scenarios (22 on disk).**

## JSON Format

### Free Presets (snake_case)

```json
{
  "preset_id": "roast-battle",
  "name": "Roast Battle",
  "description": "Pure chaos. Insult comic vs...",
  "max_turns": { "standard": 12 },
  "turn_order": "sequential",
  "agents": [
    {
      "id": "insult-comic",
      "name": "The Insult Comic",
      "system_prompt": "<persona><instructions>...</instructions></persona>",
      "color": "#FF0000",
      "avatar": "mic"
    }
  ]
}
```

### Premium Presets (camelCase — alternate format)

```json
{
  "id": "debate-club",
  "name": "Debate Club",
  "premise": "A formal Oxford-style debate...",
  "tone": "formal",
  "botCount": 4,
  "maxMessages": 12,
  "msgMaxLength": 500,
  "agents": [
    {
      "name": "The Proposer",
      "role": "lead-proposer",
      "systemPrompt": "You are the lead proposer..."
    }
  ]
}
```

## Loading Pipeline

```
presets/*.json
     │
     ▼
lib/presets.ts
     │
     ├── RAW_PRESETS (11 free) → normalizePreset() → FREE_PRESETS
     ├── presetsTop5 (5 premium) → normalizePackPreset() → PREMIUM_PRESETS
     ├── presetsRemaining6 (6 premium) → normalizePackPreset() → ↗
     │
     ▼
ALL_PRESETS (22 total)
     │
     ▼
PRESET_BY_ID: Map<string, Preset>   ← O(1) lookup
```

`normalizePreset()` converts snake_case JSON keys to camelCase TypeScript types. `normalizePackPreset()` handles the alternate premium format, assigning colors from a palette and generating slugified agent IDs.

## Adding a New Preset

1. Create `presets/your-preset.json` following the free preset format above
2. Import it in `lib/presets.ts` and add to the `RAW_PRESETS` array
3. The preset is automatically included in `ALL_PRESETS` and `PRESET_BY_ID`
4. To seed the agents into the database, hit `POST /api/admin/seed-agents`

For premium presets, add to one of the pack JSON files or create a new pack file and import it in `lib/presets.ts`.

---

[← Root](../README.md) · [Lib](../lib/README.md) · [App](../app/README.md)
