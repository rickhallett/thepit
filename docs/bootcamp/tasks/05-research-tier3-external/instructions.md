# Task 05: Research - Tier 3 External References (Steps 8-11)

**Type:** Research (read-only, web fetch)
**Parallelizable with:** Tasks 01, 02, 03, 04
**Blocks:** Tasks 13, 14, 15, 16 (write tasks for Steps 8-11)
**Output:** `docs/bootcamp/tasks/05-research-tier3-external/findings.md`

---

## Objective

Research and verify external references for Steps 8-11 (enterprise operation tier).
Mixed maturity: Steps 8-9 are FRONTIER, Steps 10-11 are EMERGING. Research must
verify citations, extract key points, and map the field coverage for each topic.

## Step 8 References to Research

**Topic:** Multi-model verification strategies (FRONTIER)

1. **Avizienis, "N-Version Programming" (1985)**
   - Verify paper, get correct citation
   - Extract: the N-version programming concept, when independent implementations
     provide safety vs when they don't (common mode failures)
   - The limitation: shared specification = shared bugs

2. **General research:**
   - Current state of multi-model evaluation in practice
   - Any published multi-model review pipelines (academic or industry)
   - The "unanimous chorus" problem - any published work on same-model agreement
     being uninformative?
   - IV&V (Independent Verification and Validation) as practiced in systems
     engineering - which standards/frameworks are current?
   - Training data overlap between model families - how independent are they really?

## Step 9 References to Research

**Topic:** Failure modes and recovery (FRONTIER)

1. **Bainbridge, "Ironies of Automation" (1983)** (same as Step 7, different extraction)
   - Extract specifically: the deskilling irony as it manifests across months,
     not within sessions
   - The "keeping the human in the loop" paradox

2. **WAL (Write-Ahead Log) pattern**
   - Standard database recovery reference
   - Extract: the principle (write intent before action, recover from last committed
     state) and how it maps to agentic session recovery

3. **General research:**
   - Published incident response patterns from SRE (Google SRE book references)
   - Session boundary management in long-running AI interactions - any published work?
   - "Governance recursion" - any parallel concept in organisational theory?
   - The "rerun vs fix in place" question - any software engineering literature
     on when to debug vs discard and retry?

## Step 10 References to Research

**Topic:** Governance, process, and enterprise integration (EMERGING)

1. **Helmreich, CRM publications (1999)** (same as Step 7, different extraction)
   - Extract specifically: readback protocol as applied to human-agent communication
   - Authority gradients in team settings

2. **Womack & Jones, "Lean Thinking" (1996)**
   - Verify reference
   - Extract: value stream concept, pull-based systems, relevance to agent workflows

3. **Nygard, "Documenting Architecture Decisions" (2011)**
   - Verify reference (blog post)
   - Extract: the ADR format, why lightweight decision records work, how they
     map to the session decision chain pattern

4. **General research:**
   - Current state of enterprise AI governance frameworks
   - How are enterprises managing agent-generated PRs and commits?
   - Audit trail requirements in regulated industries for AI-generated code
   - The "atomic commit" principle - standard git workflow references
   - Definition of Done evolution for AI-assisted development

## Step 11 References to Research

**Topic:** Cost, security, legal, and compliance (EMERGING)

1. **OWASP, "Top 10 for LLM Applications" (2023, updated 2024)**
   - Verify current version and URL
   - Extract: the top 10 list, which entries are most relevant to enterprise
     agent deployments (prompt injection, data leakage, excessive agency)
   - Any 2025 updates?

2. **Anthropic security and compliance documentation**
   - Current enterprise security features
   - Data handling policies, SOC 2, etc.

3. **OpenAI enterprise security documentation**
   - Current enterprise security features
   - Data handling, compliance certifications

4. **General research:**
   - Current legal status of AI-generated code IP ownership (US, UK, EU)
   - Copyright Office guidance on AI works (current as of 2025-2026)
   - Token pricing comparison across major providers (current)
   - Prompt caching economics - cache hit rates in practice
   - Prompt injection defence state of the art
   - Data residency requirements for enterprise AI (GDPR, sector-specific)
   - Any published case studies of enterprise agent deployment governance?

## Output Format

For each reference:
```
### [Reference Name]
- **Status:** verified/not-found/moved/outdated
- **URL/Citation:** (current URL or full academic citation)
- **Key Extraction:** (2-5 bullet points of what's pedagogically useful)
- **Best Quote/Passage:** (if applicable)
- **Enterprise Angle:** (what specifically matters for enterprise adoption)
- **Caveat:** (anything changed, disputed, needs updating)
```

Group by step. For the legal/compliance section (Step 11), clearly date-stamp any
legal information - this field moves fast and content will need periodic review.
