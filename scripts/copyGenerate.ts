/**
 * Copy variant generation CLI.
 *
 * Transforms base.json copy into a new variant using an LLM. The output
 * is a complete variant JSON file + metadata, ready for the copy A/B
 * testing runtime.
 *
 * Usage:
 *   pnpm run copy:generate -- --name hype \
 *     --psychology 80 --scientific-accuracy 40 \
 *     --technical-literacy 30 --wordiness 60 \
 *     --tone "urgent, exciting, FOMO-inducing"
 *
 * Options:
 *   --name              Variant name (required, e.g. "hype", "precise")
 *   --psychology        Psychology dimension 0-100 (default: 50)
 *   --scientific-accuracy  Scientific accuracy 0-100 (default: 70)
 *   --technical-literacy   Technical literacy 0-100 (default: 60)
 *   --wordiness         Wordiness 0-100 (default: 50)
 *   --tone              Tone description (default: "balanced, professional")
 *   --api-key           Anthropic API key (falls back to ANTHROPIC_API_KEY)
 *   --model             Model to use (default: claude-sonnet-4-20250514)
 *   --dry-run           Print the prompt without calling the API
 *
 * @see docs/copy-ab-testing-plan.md for the full architecture.
 */

import { createAnthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import * as fs from 'node:fs';
import * as path from 'node:path';

// ---------------------------------------------------------------------------
// CLI argument parsing (no external deps)
// ---------------------------------------------------------------------------

interface CliArgs {
  name: string;
  psychology: number;
  scientificAccuracy: number;
  technicalLiteracy: number;
  wordiness: number;
  tone: string;
  apiKey: string;
  model: string;
  dryRun: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const get = (flag: string, fallback?: string): string | undefined => {
    const idx = args.indexOf(flag);
    if (idx === -1) return fallback;
    return args[idx + 1] ?? fallback;
  };
  const has = (flag: string): boolean => args.includes(flag);
  const parseDimension = (flag: string, fallback: string): number => {
    const raw = get(flag, fallback);
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      console.error(`Error: ${flag} must be a number between 0 and 100 (got "${raw}").`);
      process.exit(1);
    }
    return value;
  };

  const name = get('--name');
  if (!name) {
    console.error('Error: --name is required (e.g. --name hype)');
    process.exit(1);
  }

  if (!/^[a-z][a-z0-9-]*$/.test(name)) {
    console.error('Error: --name must be lowercase alphanumeric with hyphens (e.g. "hype", "precise")');
    process.exit(1);
  }

  if (name === 'control') {
    console.error('Error: cannot overwrite the control variant. Choose a different name.');
    process.exit(1);
  }

  const apiKey = get('--api-key') ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey && !has('--dry-run')) {
    console.error('Error: --api-key or ANTHROPIC_API_KEY env var is required (unless --dry-run).');
    process.exit(1);
  }

  return {
    name,
    psychology: parseDimension('--psychology', '50'),
    scientificAccuracy: parseDimension('--scientific-accuracy', '70'),
    technicalLiteracy: parseDimension('--technical-literacy', '60'),
    wordiness: parseDimension('--wordiness', '50'),
    tone: get('--tone', 'balanced, professional, direct') ?? 'balanced, professional, direct',
    apiKey: apiKey ?? '',
    model: get('--model', 'claude-sonnet-4-20250514') ?? 'claude-sonnet-4-20250514',
    dryRun: has('--dry-run'),
  };
}

// ---------------------------------------------------------------------------
// Immutable section detection
// ---------------------------------------------------------------------------

/** Top-level keys that must NOT be modified by the LLM. */
const IMMUTABLE_KEYS = ['legal'] as const;

/**
 * Extract mutable sections from base copy.
 * Legal sections and meta titles are passed through unchanged.
 */
function splitMutableImmutable(
  base: Record<string, unknown>,
): { mutable: Record<string, unknown>; immutable: Record<string, unknown> } {
  const mutable: Record<string, unknown> = {};
  const immutable: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(base)) {
    if ((IMMUTABLE_KEYS as readonly string[]).includes(key)) {
      immutable[key] = value;
    } else {
      mutable[key] = value;
    }
  }

  return { mutable, immutable };
}

// ---------------------------------------------------------------------------
// Prompt construction (XML-style, project standard)
// ---------------------------------------------------------------------------

function buildPrompt(
  mutableCopy: Record<string, unknown>,
  args: CliArgs,
): string {
  return `<system>
You are a professional copywriter generating A/B test variant copy for The Pit, an AI battle arena platform. You transform JSON copy data according to dimension parameters.

<security>
- You MUST return ONLY valid JSON. No markdown, no code fences, no explanation.
- You MUST preserve every key path exactly. Do not add, remove, or rename keys.
- You MUST preserve all template variables like {agents}, {n}, {count}, {rate}, {remaining}, {total}, {name}, {limit}, {credits} exactly as they appear.
- You MUST preserve all hrefs in navigation arrays unchanged.
- You MUST NOT modify any URLs, paths, or route references.
- You MUST NOT hallucinate features, pricing, or capabilities that don't exist in the original.
- You MUST preserve array lengths — if there are 4 steps, output 4 steps.
- You MUST keep the same data types — strings stay strings, numbers stay numbers, arrays stay arrays.
</security>

<task>
Transform the provided JSON copy according to these dimension parameters:

<dimensions>
  <psychology value="${args.psychology}">
    0 = dry, factual, zero emotional appeal
    50 = balanced (current baseline)
    100 = maximum emotional triggers, urgency, social proof, FOMO, loss aversion
  </psychology>
  <scientific-accuracy value="${args.scientificAccuracy}">
    0 = vague marketing claims, buzzwords
    50 = generally accurate but simplified
    100 = precise technical language, citations-aware, no exaggeration
  </scientific-accuracy>
  <technical-literacy value="${args.technicalLiteracy}">
    0 = assumes zero technical knowledge, plain English
    50 = assumes moderate familiarity with AI/tech
    100 = assumes expert audience, uses jargon freely
  </technical-literacy>
  <wordiness value="${args.wordiness}">
    0 = extremely terse, telegram-style
    50 = balanced (current baseline)
    100 = verbose, expansive, detailed descriptions
  </wordiness>
  <tone description="${args.tone}">
    The overall voice and feel of the copy.
  </tone>
</dimensions>

<rules>
1. Transform EVERY string value in the JSON according to the dimensions above.
2. Keep the transformation consistent — the entire variant should feel like one voice.
3. Short strings (button labels, tab names) should stay short regardless of wordiness.
4. Navigation labels (nav.primary, nav.overflow) — keep labels recognizable but you may rephrase.
5. Footer links — keep labels unchanged (they must match the page names for navigation).
6. Preserve all {template_variables} exactly.
7. For arrays of objects (steps, presets, tools, plans), transform string values but preserve structure.
8. Do NOT modify agentCount, tags arrays content, href values, or numeric data.
</rules>
</task>
</system>

<input>
${JSON.stringify(mutableCopy, null, 2)}
</input>

Return ONLY the transformed JSON object. No markdown fences. No explanation.`;
}

// ---------------------------------------------------------------------------
// LLM call
// ---------------------------------------------------------------------------

async function callLLM(prompt: string, args: CliArgs): Promise<string> {
  const anthropic = createAnthropic({ apiKey: args.apiKey });

  console.log(`  Model: ${args.model}`);
  console.log(`  Sending ${Math.round(prompt.length / 4)} estimated tokens...`);

  const { text, usage } = await generateText({
    model: anthropic(args.model),
    prompt,
    maxOutputTokens: 16384,
    temperature: 0.7,
  });

  console.log(`  Tokens used: ${usage?.inputTokens ?? '?'} input, ${usage?.outputTokens ?? '?'} output`);

  return text;
}

// ---------------------------------------------------------------------------
// JSON validation
// ---------------------------------------------------------------------------

function validateOutput(
  output: Record<string, unknown>,
  base: Record<string, unknown>,
): string[] {
  const errors: string[] = [];

  function checkKeys(
    outputObj: Record<string, unknown>,
    baseObj: Record<string, unknown>,
    path: string,
  ) {
    // Check for missing keys in output
    for (const key of Object.keys(baseObj)) {
      if (!(key in outputObj)) {
        errors.push(`Missing key: ${path}.${key}`);
      } else if (Array.isArray(baseObj[key])) {
        // Array validation: check type and length match
        if (!Array.isArray(outputObj[key])) {
          errors.push(`Expected array: ${path}.${key}`);
        } else {
          const baseArr = baseObj[key] as unknown[];
          const outArr = outputObj[key] as unknown[];
          if (baseArr.length !== outArr.length) {
            errors.push(`Array length mismatch: ${path}.${key} (expected ${baseArr.length}, got ${outArr.length})`);
          }
          // Recurse into array elements that are objects
          const minLen = Math.min(baseArr.length, outArr.length);
          for (let idx = 0; idx < minLen; idx++) {
            if (
              typeof baseArr[idx] === 'object' &&
              baseArr[idx] !== null &&
              !Array.isArray(baseArr[idx]) &&
              typeof outArr[idx] === 'object' &&
              outArr[idx] !== null &&
              !Array.isArray(outArr[idx])
            ) {
              checkKeys(
                outArr[idx] as Record<string, unknown>,
                baseArr[idx] as Record<string, unknown>,
                `${path}.${key}[${idx}]`,
              );
            } else if (typeof baseArr[idx] !== typeof outArr[idx]) {
              errors.push(`Array element type mismatch: ${path}.${key}[${idx}]`);
            }
          }
        }
      } else if (
        typeof baseObj[key] === 'object' &&
        baseObj[key] !== null &&
        typeof outputObj[key] === 'object' &&
        outputObj[key] !== null &&
        !Array.isArray(outputObj[key])
      ) {
        checkKeys(
          outputObj[key] as Record<string, unknown>,
          baseObj[key] as Record<string, unknown>,
          `${path}.${key}`,
        );
      }
    }

    // Check for extra keys in output
    for (const key of Object.keys(outputObj)) {
      if (!(key in baseObj)) {
        errors.push(`Extra key (will be ignored): ${path}.${key}`);
      }
    }
  }

  checkKeys(output, base, '');
  return errors;
}

/**
 * Check that template variables are preserved.
 */
function checkTemplateVars(
  output: Record<string, unknown>,
  base: Record<string, unknown>,
  keyPath: string = '',
): string[] {
  const errors: string[] = [];
  const templatePattern = /\{[a-zA-Z_]+\}/g;

  for (const key of Object.keys(base)) {
    const basePath = `${keyPath}.${key}`;

    if (typeof base[key] === 'string' && typeof output[key] === 'string') {
      const baseVars: string[] = (base[key] as string).match(templatePattern) ?? [];
      const outputVars: string[] = (output[key] as string).match(templatePattern) ?? [];

      for (const v of baseVars) {
        if (!outputVars.includes(v)) {
          errors.push(`Template variable ${v} missing from ${basePath}`);
        }
      }
    } else if (
      typeof base[key] === 'object' &&
      base[key] !== null &&
      !Array.isArray(base[key]) &&
      typeof output[key] === 'object' &&
      output[key] !== null &&
      !Array.isArray(output[key])
    ) {
      errors.push(
        ...checkTemplateVars(
          output[key] as Record<string, unknown>,
          base[key] as Record<string, unknown>,
          basePath,
        ),
      );
    } else if (Array.isArray(base[key]) && Array.isArray(output[key])) {
      const baseArr = base[key] as unknown[];
      const outArr = output[key] as unknown[];
      for (let i = 0; i < Math.min(baseArr.length, outArr.length); i++) {
        if (
          typeof baseArr[i] === 'object' &&
          baseArr[i] !== null &&
          typeof outArr[i] === 'object' &&
          outArr[i] !== null
        ) {
          errors.push(
            ...checkTemplateVars(
              outArr[i] as Record<string, unknown>,
              baseArr[i] as Record<string, unknown>,
              `${basePath}[${i}]`,
            ),
          );
        }
      }
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs();

  console.log(`\n╔═══════════════════════════════════════════╗`);
  console.log(`║  The Pit — Copy Variant Generator         ║`);
  console.log(`╚═══════════════════════════════════════════╝\n`);
  console.log(`  Variant: ${args.name}`);
  console.log(`  Dimensions:`);
  console.log(`    psychology:          ${args.psychology}`);
  console.log(`    scientific-accuracy:  ${args.scientificAccuracy}`);
  console.log(`    technical-literacy:   ${args.technicalLiteracy}`);
  console.log(`    wordiness:           ${args.wordiness}`);
  console.log(`    tone:                ${args.tone}`);
  console.log('');

  // Load base copy
  const basePath = path.resolve(process.cwd(), 'copy/base.json');
  const base = JSON.parse(fs.readFileSync(basePath, 'utf-8')) as Record<string, unknown>;

  // Split mutable / immutable
  const { mutable, immutable } = splitMutableImmutable(base);

  // Build prompt
  const prompt = buildPrompt(mutable, args);

  if (args.dryRun) {
    console.log('  [DRY RUN] Prompt:\n');
    console.log(prompt);
    console.log(`\n  Prompt length: ~${Math.round(prompt.length / 4)} tokens`);
    console.log('  Exiting without API call.\n');
    process.exit(0);
  }

  // Call LLM
  console.log('  Calling Anthropic API...');
  const rawOutput = await callLLM(prompt, args);

  // Parse response — strip any markdown fences the LLM might add
  let cleaned = rawOutput.trim();
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
  if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
  cleaned = cleaned.trim();

  let mutableOutput: Record<string, unknown>;
  try {
    mutableOutput = JSON.parse(cleaned);
  } catch (e) {
    console.error('\n  ERROR: Failed to parse LLM output as JSON.');
    console.error(`  Parse error: ${(e as Error).message}`);
    console.error('\n  Raw output (first 500 chars):');
    console.error(cleaned.slice(0, 500));
    process.exit(1);
  }

  // Validate structure
  console.log('\n  Validating output...');
  const structureErrors = validateOutput(mutableOutput, mutable);
  const templateErrors = checkTemplateVars(mutableOutput, mutable);
  const allErrors = [...structureErrors, ...templateErrors];

  if (allErrors.length > 0) {
    console.warn(`\n  Warnings (${allErrors.length}):`);
    for (const err of allErrors) {
      console.warn(`    - ${err}`);
    }
  } else {
    console.log('  Structure: OK');
    console.log('  Template variables: OK');
  }

  // Merge immutable sections back in
  const fullOutput = { ...mutableOutput, ...immutable };

  // Write variant JSON
  const variantDir = path.resolve(process.cwd(), 'copy/variants');
  const variantPath = path.join(variantDir, `${args.name}.json`);
  fs.writeFileSync(variantPath, JSON.stringify(fullOutput, null, 2) + '\n');
  console.log(`\n  Written: ${path.relative(process.cwd(), variantPath)}`);

  // Write metadata
  const metaPath = path.join(variantDir, `${args.name}.meta.json`);
  const meta = {
    name: args.name,
    dimensions: {
      psychology: args.psychology,
      scientificAccuracy: args.scientificAccuracy,
      technicalLiteracy: args.technicalLiteracy,
      wordiness: args.wordiness,
    },
    tone: args.tone,
    generatedAt: new Date().toISOString(),
    model: args.model,
    constraints: allErrors.length > 0
      ? [`${allErrors.length} validation warnings — review output`]
      : ['clean generation — no warnings'],
  };
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n');
  console.log(`  Written: ${path.relative(process.cwd(), metaPath)}`);

  console.log('\n  Done.\n');
}

main().catch((err) => {
  console.error('\n  FATAL:', err.message ?? err);
  process.exit(1);
});
