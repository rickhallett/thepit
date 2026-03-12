# Task 13: Write - Step 8: Cost Modeling for API-Based Systems

**Type:** Write
**Parallelizable with:** Tasks 09, 10, 11, 12, 14, 15 (Tier 2/3 steps)
**Depends on:** Task 01 (format), Task 02 (data sources), Task 03 (pandas APIs)
**Output:** `docs/bootcamp/bootcamp3-08-cost-modeling.md`

---

## Objective

Write the full instructional content for Bootcamp III Step 8: Cost Modeling for
API-Based Systems. This is a Tier 3 applied step. It teaches the reader to turn token
counts into budget forecasts and make cost-aware decisions about agent architectures.

## Prime Context

Load these files before writing:

- `docs/bootcamp/tasks/01-research-format/findings.md` - format template
- `docs/bootcamp/tasks/02-research-data-sources/findings.md` - real data schemas
- `docs/bootcamp/tasks/03-research-python-analytics/findings.md` - pandas APIs
- `docs/bootcamp/BOOTCAMP-III-OUTLINE.md` lines 612-685 - the outline for this step

## Content Specification

From the outline, this step covers 6 topics:

1. Token counting and pricing (input vs output, providers, cached vs uncached)
2. Cost per task (decomposing multi-step workflows)
3. Cost trend analysis (time series applied to cost data)
4. Marginal cost analysis (pairing with triangulate's marginal value metric)
5. Cost optimization patterns (caching, model selection, early termination)
6. Budget forecasting (linear projection, scenario modeling)

Plus 4 exercises and an agentic grounding section.

## Writing Requirements

### Structure

Follow the Bootcamp I format template. Title: `# Step 8: Cost Modeling for API-Based
Systems`

### Field Maturity: Emerging

This topic's maturity rating is "Emerging" - early practices forming, tooling exists
but conventions are not settled. Acknowledge this. The pricing landscape changes
frequently. Teach the analytical framework (cost per task, marginal cost per unit of
value) rather than specific price points, which will be outdated.

### The Marginal Analysis Connection

The project's triangulate script already computes marginal value (the number of unique
findings each successive model adds). This step pairs marginal value with marginal cost.
This connection is load-bearing - it is the primary operational decision this step
enables: "Is the Nth model worth its cost?"

Use the lexicon term "marginal analysis" from AGENTS.md explicitly.

### Concrete Numbers

Use realistic but clearly labeled as illustrative pricing:
- Claude Sonnet: ~$3/$15 per million input/output tokens (illustrative)
- GPT-4o: ~$5/$15 per million tokens (illustrative)
- Include a note that actual pricing should be checked at the provider's current page

### Prerequisites Build On

This step assumes Step 1 (tabular data) and Step 5 (time series). The cost trend
analysis section should explicitly reference time series techniques (moving averages,
trend detection) and note they were covered in Step 5.

### Code Examples

- Token counting: show how to extract token counts from API response metadata
- Cost computation: `df['cost'] = df['input_tokens'] * price_in + df['output_tokens'] * price_out`
- Budget burn curve: cumulative sum of daily costs plotted against monthly budget line
- Marginal cost: `cost_per_unique_finding = model_cost / unique_findings_count`
- Scenario modeling: simple pandas what-if with parameter changes

### Voice and Target Length

- Direct, technical, no filler, no emojis, no em-dashes
- 700-1000 lines. This is a 3-4 hour step with 6 topics.
- Frame as engineering economics, not financial analysis

## Quality Gate

- Pricing must be clearly labeled as illustrative, not current
- The marginal value/cost connection must be explicit and use project terminology
- Budget forecasting must show at least one scenario model
- Cost optimization patterns must be concrete (not just "use caching" but how to
  estimate caching savings from token overlap data)
- No emojis, no em-dashes
