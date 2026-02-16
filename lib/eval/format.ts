// Format compliance evaluator for LangSmith evaluation pipelines.
//
// Checks whether an agent response conforms to the configured response
// format (plain text, spaced text, or JSON). Pure heuristic — no LLM calls.

import type { EvalScore, FormatEvalInput } from './types';

/**
 * Check if text is valid JSON with the expected shape.
 */
function isValidJsonResponse(text: string): boolean {
  try {
    const parsed = JSON.parse(text.trim());
    return typeof parsed === 'object' && parsed !== null && 'text' in parsed;
  } catch {
    return false;
  }
}

/**
 * Check if text contains markdown formatting.
 * Detects: headers, bold (**word**), inline code (`code`), list items,
 * links, fenced code blocks, and tables.
 */
function containsMarkdown(text: string): boolean {
  return /^#{1,6}\s|\*\*[^*]+\*\*|`[^`]+`|^\- |\[.*\]\(.*\)|```|^\|/m.test(text);
}

/**
 * Evaluate whether an agent response complies with the configured format.
 *
 * Returns score 1 for compliant, 0 for non-compliant.
 *
 * @example
 * ```ts
 * evaluateFormat({ text: '{"text":"hello"}', formatId: 'json' })
 * // { key: 'format_compliance', score: 1 }
 *
 * evaluateFormat({ text: '# Hello\n**bold**', formatId: 'plain' })
 * // { key: 'format_compliance', score: 0, comment: 'Contains markdown in plain format' }
 * ```
 */
export function evaluateFormat(input: FormatEvalInput): EvalScore {
  const { text, formatId } = input;
  const trimmed = text.trim();

  if (!trimmed) {
    return {
      key: 'format_compliance',
      score: 0,
      comment: 'Empty response',
    };
  }

  switch (formatId) {
    case 'json': {
      const valid = isValidJsonResponse(trimmed);
      return {
        key: 'format_compliance',
        score: valid ? 1 : 0,
        comment: valid ? undefined : 'Expected JSON object with "text" field',
      };
    }

    case 'plain': {
      const hasMarkdown = containsMarkdown(trimmed);
      return {
        key: 'format_compliance',
        score: hasMarkdown ? 0 : 1,
        comment: hasMarkdown ? 'Contains markdown in plain format' : undefined,
      };
    }

    case 'spaced': {
      // Spaced format: should have blank lines between paragraphs
      // and should not contain markdown
      const hasMarkdown = containsMarkdown(trimmed);
      if (hasMarkdown) {
        return {
          key: 'format_compliance',
          score: 0,
          comment: 'Contains markdown in spaced format',
        };
      }
      // Check for paragraph spacing (at least one blank line in multi-paragraph text)
      const lines = trimmed.split('\n');
      const hasMultipleParagraphs = lines.length > 3;
      const hasBlankLines = /\n\s*\n/.test(trimmed);
      if (hasMultipleParagraphs && !hasBlankLines) {
        return {
          key: 'format_compliance',
          score: 0,
          comment: 'Multi-paragraph response without blank line spacing',
        };
      }
      return { key: 'format_compliance', score: 1 };
    }

    default:
      return {
        key: 'format_compliance',
        score: 0,
        comment: `Unknown format: ${formatId as string}`,
      };
  }
}
