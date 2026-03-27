# Landscape Scan: 12 Use Cases - Prior Art, Tooling, and Research

**Date:** 2026-03-11
**Author:** Analyst
**Provenance:** Commissioned by Operator for midgets positioning analysis
**Status:** DRAFT - requires verification of specific claims

```
LLM PROVENANCE NOTICE

This document was produced by an LLM (Claude, Anthropic).
It has not been independently verified.
It is starting material, nothing more.

The analysis, frameworks, citations, and conclusions herein
carry the probabilistic confidence of their origin.
Treat accordingly.
```

---

## 1. Visual Regression Testing of Web Applications

### Commercial Tools

| Tool | Company | What It Does | Adoption |
|------|---------|-------------|----------|
| **Applitools Eyes** | Applitools | AI-powered visual testing with Visual AI that uses ML to compare screenshots as a human would. Supports cross-browser, cross-device. Integrates with Cypress, Selenium, Playwright. | **Dominant player.** 700+ enterprise customers (as of 2024). Series C funded ($31M total). Used by Fortune 500 companies. The name most associated with "visual AI testing." |
| **Percy** | BrowserStack (acquired 2020) | Snapshot-based visual review tool. Takes screenshots at each commit, shows visual diffs for human approval. Integrates with CI. | **Major player.** Acquired by BrowserStack gives it massive distribution. Popular in mid-market. Simpler than Applitools - pixel-diff focused with human review workflow. |
| **ChromaticUI** | Chroma Software | Storybook-based visual testing. Captures Storybook stories as snapshots, diffs between builds. | **Significant in React/component ecosystem.** Created by Storybook maintainers. Strong adoption in frontend teams already using Storybook (~6K GitHub stars on Storybook). |
| **LambdaTest SmartUI** | LambdaTest | Visual regression testing across browsers/devices. AI-powered comparison. | Growing competitor. LambdaTest is well-funded ($70M Series C). SmartUI is a feature within their broader platform. |
| **Sauce Visual** | Sauce Labs | Visual testing integrated into Sauce Labs' cross-browser testing platform. | Established but not differentiated. Sauce Labs is legacy/mature; visual is add-on. |

### Open-Source Tools

| Tool | Repo/Org | What It Does | Stars/Adoption |
|------|----------|-------------|----------------|
| **BackstopJS** | garris/BackstopJS | CSS regression testing via headless Chrome. Pixel-diff comparison of responsive screenshots. | ~6.7K GitHub stars. The most widely used OSS visual regression tool. Mature, actively maintained. |
| **Playwright Visual Comparisons** | Microsoft (built-in) | Playwright's native `toHaveScreenshot()` and `toMatchSnapshot()` assertions. Pixel-diff built into test framework. | Part of Playwright (~68K stars). De facto standard for teams already using Playwright. Not a separate tool. |
| **reg-suit** | reg-viz/reg-suit | Visual regression testing framework. Integrates with CI, publishes visual diff reports. | ~3K stars. Japanese origin, solid tool, less known in English-speaking market. |
| **Loki** | oblador/loki | Visual regression testing for Storybook. Tests components in Docker Chrome. | ~1.8K stars. Good Storybook integration. Less active development recently. |
| **jest-image-snapshot** | americanexpress/jest-image-snapshot | Jest matcher for image comparison. Pixel-level diff. | ~3.8K stars. Simple, focused. Good for Jest users who want basic visual assertions. |
| **Argos CI** | argos-ci/argos | Visual testing platform with OSS core. GitHub integration. | ~500 stars but actively developing. |

### Published Research

| Paper | Authors/Institution | Year | Key Contribution |
|-------|-------------------|------|-----------------|
| "Visual Web Test Repair" | Stocco et al., USI/Politecnico di Milano | 2018 | Automated repair of visual test breakages using DOM analysis + visual similarity. |
| "VIPS: Vision-based Page Segmentation" | Cai et al., Microsoft Research | 2003 | Foundational algorithm for understanding visual page structure. Still cited in visual testing work. |
| "Automated Visual Testing" (survey) | Mahajan & Halfond, USC | 2020 | Survey of visual testing approaches: pixel-diff, DOM-diff, hybrid. Identified gap: no tool handles "semantically equivalent but visually different" well. |
| "Using Computer Vision for Visual Test Flakiness" | Alegroth et al., Chalmers | 2019 | Addressed flaky visual tests via fuzzy matching. Relevant to AI-powered comparison approaches. |

### Industry Standards

- No formal standard for visual regression testing
- W3C has no spec for "visual correctness"
- De facto standard: screenshot comparison with configurable tolerance thresholds
- Applitools pushed for "Visual AI" as a category (marketing-driven, not standards-driven)

### Gap Analysis for Midgets

**What exists:** Mature pixel-diff tools (BackstopJS, Playwright built-in). AI-powered commercial tools (Applitools). Well-integrated CI workflows.

**What midgets adds:** Containerised, governed visual testing where the testing agent is structurally independent from the development agent. Existing tools run as part of the dev pipeline - they don't have independent agency or structural separation. A midget running visual regression testing has: (a) its own container boundary, (b) read-only access to the source, (c) independent screenshot capture via Xvfb/steer. The governance is the differentiator, not the visual comparison algorithm.

**Honest assessment:** The visual comparison problem is solved. Midgets doesn't need to reinvent pixel-diff or AI comparison. The gap is in governed, independent visual verification as part of a multi-agent pipeline.

---

## 2. Accessibility Auditing with Actual Interaction

### Commercial Tools

| Tool | Company | What It Does | Adoption |
|------|---------|-------------|----------|
| **Deque axe DevTools** | Deque Systems | Browser extension + CI integration for WCAG compliance testing. Rule-based DOM analysis. axe-core engine is OSS. | **Dominant player.** axe-core is the most widely used accessibility engine. Used by Google, Microsoft, US government agencies. De facto standard. |
| **Level Access / eSSENTIAL Accessibility** | Level Access (merged 2023) | Managed accessibility testing + tooling. AMP (Accessibility Management Platform). | Enterprise market. Compliance-focused. Consulting + tooling bundle. |
| **AudioEye** | AudioEye Inc. (public: AEYE) | Automated accessibility monitoring + remediation. Overlay-based approach (controversial). | Publicly traded. Significant adoption but controversial - accessibility community criticizes overlay approaches. |
| **Siteimprove Accessibility** | Siteimprove (acquired by Crownpeak 2024) | Integrated accessibility monitoring within broader DQM suite. | Enterprise. Part of larger digital quality platform. |
| **UserWay** | UserWay | AI-powered accessibility widget/overlay + monitoring. | Popular with small business. Controversial in a11y community. |
| **Pope Tech** | Pope Tech | Built on axe-core, web-based dashboard for organization-wide a11y monitoring. | Higher education market specifically. |

### Open-Source Tools

| Tool | Repo/Org | What It Does | Stars/Adoption |
|------|----------|-------------|----------------|
| **axe-core** | dequelabs/axe-core | WCAG 2.x rule engine. DOM analysis. The engine behind most commercial tools. | ~6K stars. **The** foundational accessibility testing library. Rules map to WCAG SC. |
| **pa11y** | pa11y/pa11y | CLI accessibility testing tool. Wraps HTML_CodeSniffer or axe. CI-friendly. | ~4.5K stars. Popular in UK gov and public sector. Actively maintained. |
| **Lighthouse Accessibility** | Google (part of Lighthouse) | Accessibility audit as part of Lighthouse. Uses axe-core rules. | Part of Lighthouse (~28K stars). Built into Chrome DevTools. |
| **WAVE** (web tool) | WebAIM | Web-based accessibility evaluator. Visual overlay showing issues. | Not OSS but free web tool. WebAIM is the most respected accessibility org. |
| **HTML_CodeSniffer** | squizlabs/HTML_CodeSniffer | JavaScript-based WCAG 2.x sniffing. | ~2.1K stars. Older, less maintained than axe-core. |
| **cypress-axe** | component-driven/cypress-axe | Cypress + axe-core integration. | ~600 stars. Standard approach for Cypress a11y testing. |
| **playwright-axe** | various | Playwright + axe-core integration. | Various implementations. |

### Screen Reader Simulation / Experiential Testing

| Tool/Approach | Description | Status |
|--------------|-------------|--------|
| **NVDA** | Free screen reader for Windows | Real screen reader, not simulation. Gold standard for testing. |
| **VoiceOver** | Built into macOS/iOS | Real screen reader. |
| **Orca** | GNOME screen reader for Linux. Uses AT-SPI2. | Real screen reader. What a Linux-based midget could actually drive. |
| **axe-core semantic analysis** | Tests ARIA roles, states, properties without screen reader | DOM-level, not experiential. |
| **AccessLint** | GitHub bot for a11y PR review | Automated a11y review on PRs. Uses axe-core. |

**No tool currently simulates the actual experience of using a screen reader programmatically.** All existing tools either (a) analyze the DOM for WCAG rule violations (axe-core approach), or (b) require a human to use an actual screen reader. The gap between "passes axe-core" and "usable with a screen reader" is well-documented.

### Published Research

| Paper | Authors/Institution | Year | Key Contribution |
|-------|-------------------|------|-----------------|
| "Automated Accessibility Testing: What Can (and Cannot) Be Tested" | Faulkner et al., The Paciello Group | 2019 | Catalogued what automated tools can catch (~30-40% of WCAG issues) vs what requires human judgment. |
| "The WebAIM Million" (annual report) | WebAIM | 2024 | Annual analysis of top 1M homepages. 96.3% had detectable WCAG failures. Foundational benchmark for the state of web accessibility. |
| "Can Large Language Models Judge Accessibility?" | various (emerging) | 2024-2025 | Early research on using LLMs to evaluate accessibility beyond rule-based checks. Results: promising for labeling issues, poor at experiential judgment. |
| "Web Accessibility Evaluation: A Survey of Technologies and Methods" | Abascal et al., Universidad del Pais Vasco | 2019 | Comprehensive survey of a11y evaluation methods. Distinguishes automated, semi-automated, and manual approaches. |

### Industry Standards

- **WCAG 2.1/2.2** (W3C) - the binding standard. Level A, AA, AAA.
- **Section 508** (US federal) - references WCAG 2.0 AA
- **EN 301 549** (EU) - European accessibility standard
- **ADA** (US) - legal framework (no specific technical standard, courts reference WCAG)
- **ARIA** (W3C) - Accessible Rich Internet Applications spec

### Gap Analysis for Midgets

**What exists:** Excellent DOM-based rule checking (axe-core). No automated experiential testing.

**What midgets adds:** A containerised agent that actually navigates a web application through a screen reader (Orca on Linux) and reports what it experiences. This is **genuinely novel**. No tool currently: (a) launches a web app, (b) drives a screen reader, (c) navigates the interface as a blind user would, (d) reports on the experiential quality. The gap between "passes axe-core" and "is actually usable" is real and well-documented. A midget with Orca + AT-SPI2 + Chromium could close this gap.

**Caution:** This is genuinely hard. Screen reader interaction is complex, non-visual navigation patterns are non-trivial to automate, and "usable" is a taste-required judgment. The technical foundation (AT-SPI2 on Linux) exists but the integration work is substantial.

---

## 3. Security Penetration Testing with Browser Interaction

### Commercial Tools (DAST)

| Tool | Company | What It Does | Adoption |
|------|---------|-------------|----------|
| **Burp Suite Professional** | PortSwigger | Intercepting proxy + scanner + manual pentest tools. Browser-driven. | **Dominant player** in web app security testing. Industry standard for pentesters. Free community edition + paid pro ($449/yr individual). |
| **OWASP ZAP** | OWASP Foundation (OSS) | Full-featured DAST scanner. Intercepting proxy, active/passive scanning, spider. | **Dominant OSS.** Most widely deployed open-source security scanner. Integrated into CI pipelines globally. |
| **Qualys WAS** | Qualys (public: QLYS) | Cloud-based web application scanning. | Enterprise. Part of Qualys cloud security platform. |
| **Rapid7 InsightAppSec** | Rapid7 (public: RPD) | DAST scanner with crawl + attack capabilities. | Enterprise market. |
| **Invicti (formerly Netsparker)** | Invicti Security | DAST + IAST hybrid. "Proof-Based Scanning" - confirms vulnerabilities, low false positive rate. | Enterprise. Strong reputation for accuracy. |
| **Acunetix** | Invicti Security (same parent) | Web vulnerability scanner. Lower price point than Invicti. | Mid-market. |
| **HCL AppScan** | HCL Technologies (acquired from IBM) | DAST + SAST. Enterprise-grade scanning. | Legacy IBM customers. |

### Open-Source Tools

| Tool | Repo/Org | What It Does | Stars/Adoption |
|------|----------|-------------|----------------|
| **OWASP ZAP** | zaproxy/zaproxy | Full DAST. API-driven, CI-integrable, extensible. | ~13K stars. **The** OSS DAST tool. Actively maintained by OWASP. |
| **Nuclei** | projectdiscovery/nuclei | Template-based vulnerability scanner. Fast, community-driven templates. | ~22K stars. Extremely popular. Community templates cover CVEs rapidly. |
| **sqlmap** | sqlmapproject/sqlmap | Automated SQL injection detection and exploitation. | ~33K stars. Gold standard for SQLi testing. |
| **Nikto** | sullo/nikto | Web server scanner. Checks for dangerous files, outdated software, misconfigurations. | ~8.5K stars. Classic tool, still widely used. |
| **w3af** | andresriancho/w3af | Web application attack and audit framework. | ~4.6K stars. Less actively maintained. |
| **Arachni** | Arachni/arachni | Full-featured web application security scanner. | ~3.4K stars. Development slowed/stopped. |

### AI-Assisted Security Testing

| Tool/Research | Description | Status |
|--------------|-------------|--------|
| **PentestGPT** | GreyDGL/PentestGPT | LLM-guided penetration testing framework. Uses GPT-4 to guide pentest decisions. | ~7K stars. Research prototype. Demonstrates LLM-guided offensive security. |
| **ReaperAI** (various) | Various attempts at LLM-driven automated pentesting. | Early stage, no dominant tool. |
| **Bugcrowd / HackerOne AI triage** | Crowdsourced platforms using AI for vulnerability triage. | AI assists human hunters, doesn't replace them. |
| **Microsoft Security Copilot** | AI-assisted security operations. | Commercial, launched 2024. Focus on SOC operations, not offensive testing. |

### Published Research

| Paper | Authors/Institution | Year | Key Contribution |
|-------|-------------------|------|-----------------|
| "LLM Agents Can Autonomously Hack Websites" | Fang et al., UIUC | 2024 | Demonstrated GPT-4 can exploit real-world web vulnerabilities autonomously given CVE descriptions. 73% success rate. Highly cited. |
| "LLM Agents Can Autonomously Exploit One-Day Vulnerabilities" | Fang et al., UIUC | 2024 | Follow-up: LLM teams of agents can exploit 1-day vulns. |
| "Pentesting with LLMs" | Happe & Cito, TU Wien | 2023 | Evaluated GPT-3.5/4 for pentesting tasks. Mixed results. |
| "OWASP Testing Guide v4.2" | OWASP Foundation | 2023 | Comprehensive penetration testing methodology. Industry standard reference. |

### Industry Standards

- **OWASP Top 10** - the most referenced web vulnerability classification
- **PTES** (Penetration Testing Execution Standard) - methodology standard
- **NIST SP 800-115** - technical guide to information security testing
- **OWASP ASVS** (Application Security Verification Standard) - security requirements framework
- **PCI DSS** - requires penetration testing for payment card environments

### Gap Analysis for Midgets

**What exists:** Mature DAST tools (ZAP, Burp). Emerging LLM-assisted pentesting (PentestGPT). All operate as tools, not governed agents.

**What midgets adds:** A governed, sandboxed security testing agent with structural constraints. Key differentiators: (a) container boundary prevents the security agent from accessing systems beyond the target, (b) read-only mounts prevent the security agent from modifying the codebase it's testing, (c) audit trail of every action. No existing tool provides governance-by-infrastructure for offensive security testing. The "governed offensive security agent" concept is novel.

**Risk:** Responsible disclosure and ethical considerations are paramount. An AI-driven pentesting agent needs to be explicitly scoped and constrained - which is exactly what the container model provides.

---

## 4. Governed Web Scraping / Data Extraction

### Commercial Tools

| Tool | Company | What It Does | Adoption |
|------|---------|-------------|----------|
| **Apify** | Apify Technologies | Web scraping platform. Actor model for scrapers. Cloud execution, proxy management. | Major player. ~10K GitHub stars on the SDK. Well-funded. |
| **Bright Data (formerly Luminati)** | Bright Data | Proxy network + scraping infrastructure. Data collector product. | **Largest proxy network.** Revenue >$200M. Enterprise data collection. |
| **Oxylabs** | Oxylabs | Proxy infrastructure + scraping API. | Major proxy provider. Direct Bright Data competitor. |
| **Diffbot** | Diffbot | AI-powered web data extraction. Builds knowledge graphs from web pages. | Interesting technology. ML-based structural extraction. Smaller scale. |
| **Import.io** | Import.io | Enterprise web data integration. | Enterprise market. Less developer-focused. |
| **Zyte (formerly Scrapinghub)** | Zyte | Scrapy cloud platform. Proxy + rendering. | Created Scrapy. Strong OSS + commercial hybrid. |

### Open-Source Tools

| Tool | Repo/Org | What It Does | Stars/Adoption |
|------|----------|-------------|----------------|
| **Scrapy** | scrapy/scrapy | Python web scraping framework. Async, extensible, middleware architecture. | ~53K stars. **Dominant** OSS scraping framework. Massive ecosystem. |
| **Playwright** | microsoft/playwright | Browser automation. Not scraping-specific but widely used for scraping JS-rendered content. | ~68K stars. Increasingly used for scraping over Selenium. |
| **Puppeteer** | puppeteer/puppeteer | Chrome/Chromium automation. Node.js. | ~89K stars. Google-backed. |
| **Beautiful Soup** | (PyPI) | HTML/XML parser. Not a scraper per se, but the parsing layer. | Ubiquitous in Python scraping. |
| **Crawlee** | apify/crawlee | Scalable web crawling and scraping library. By Apify. | ~16K stars. Modern, well-designed. TypeScript + Python. |
| **Colly** | gocolly/colly | Go scraping framework. | ~23K stars. Dominant in Go ecosystem. |

### Governance/Compliance Features

**No existing scraping tool has built-in governance/compliance features.** The state of the art:

- **robots.txt compliance** - Scrapy respects it by default. Most tools can be configured to respect it.
- **Rate limiting** - All mature tools support it, but configuration is manual.
- **PII detection** - **No scraping tool includes PII detection**. This is typically handled downstream.
- **Data residency / GDPR compliance** - Not a scraping concern per se; handled by the data pipeline.
- **Audit trails** - No scraping tool generates structured audit logs of what was scraped, why, and what data types were collected.

Tools adjacent to the governance problem:
- **Presidio** (Microsoft, OSS, ~3K stars) - PII detection and anonymization. Could be integrated into a scraping pipeline.
- **AWS Macie** - ML-powered PII detection in stored data. Not scraping-specific.
- **Google DLP API** - Data Loss Prevention. PII detection as a service.

### Published Research

| Paper | Authors/Institution | Year | Key Contribution |
|-------|-------------------|------|-----------------|
| "Ethical Web Scraping" | Krotov & Silva, Murray State/MIT | 2018 | Framework for ethical scraping decisions. Legal + ethical dimensions. |
| "Web Scraping in the Era of GDPR" | various law review articles | 2018-2023 | Legal analysis of scraping under GDPR. Key issue: personal data collection without consent. |
| "hiQ Labs v. LinkedIn" | US Supreme Court (vacated 2021) | 2022 | Legal precedent: scraping publicly available data is not a CFAA violation. But GDPR still applies in EU. |

### Industry Standards

- **robots.txt** (RFC 9309, 2022) - Robots Exclusion Protocol. Finally standardized as RFC.
- **GDPR** (EU) - constrains scraping of personal data
- **CCPA/CPRA** (California) - similar constraints
- No specific "ethical scraping" standard exists

### Gap Analysis for Midgets

**What exists:** Excellent scraping tools (Scrapy, Playwright). No governance layer.

**What midgets adds:** Governed scraping with: (a) PII detection before data leaves the container (integrate Presidio or similar), (b) structured audit trail of scraping operations, (c) rate-limit enforcement at the container level (not just configuration), (d) data classification of extracted content. The "governed data extraction agent" concept has no existing implementation. Every scraping tool assumes the operator handles compliance manually.

---

## 5. CI/CD Pipeline Agents with UI Verification

### Commercial Tools

| Tool | Company | What It Does | Adoption |
|------|---------|-------------|----------|
| **Applitools (CI integration)** | Applitools | Visual testing as a CI step. GitHub/GitLab/Jenkins integrations. Ultrafast Grid for parallel rendering. | See Use Case 1. The leading commercial option. |
| **Percy (BrowserStack)** | BrowserStack | Visual review in CI. PR-based visual diffs. | See Use Case 1. Strong CI integration. |
| **Chromatic** | Chroma Software | Visual testing for Storybook in CI. | Component-level visual CI. |
| **Vercel Preview Deployments** | Vercel | Preview URLs for each PR. Not visual testing per se, but enables manual visual review. | Very widely used. Every Vercel PR gets a preview URL. |
| **Netlify Deploy Previews** | Netlify | Same concept as Vercel. | Very widely used. |

### Open-Source / Framework Solutions

| Tool | Description | Adoption |
|------|-------------|----------|
| **Playwright in CI** | GitHub Actions / GitLab CI running Playwright tests including visual comparisons. | **The standard approach.** Most teams do this. |
| **Cypress in CI** | Same pattern with Cypress. | Very common. |
| **Lighthouse CI** | Google Lighthouse as a CI check. Performance, accessibility, SEO, best practices. | ~6.5K stars. Used for automated quality gates. |
| **Storybook Test Runner** | Run Storybook interaction tests in CI. | Part of Storybook ecosystem. |
| **GitHub Actions for visual testing** | Various actions: percy/snapshot-action, chromatic-com/chromatic. | Standard GitHub Actions approach. |

### Research

Limited academic research specifically on "CI/CD with visual verification." The practice is well-established industry convention rather than a research area. The research is upstream (visual testing itself) and downstream (continuous delivery practices).

### Gap Analysis for Midgets

**What exists:** Mature integration of visual testing tools into CI pipelines. Playwright + GitHub Actions is the de facto standard for OSS.

**What midgets adds:** Agent-level independence. Current CI visual testing is part of the same pipeline that produced the code. A midget running visual verification is a structurally independent agent - different container, different access level, different identity. It verifies the deployment from outside the development context. This is the multi-agent gauntlet concept applied to CI.

---

## 6. Training Data Generation for GUI Agent Models

### Prominent GUI Agent Models and Their Training Data

| Model/Agent | Institution | Training Data Approach | Key Publication |
|------------|-------------|----------------------|-----------------|
| **CogAgent** | Tsinghua/Zhipu AI | Pre-trained on web screenshots + text. Fine-tuned on GUI grounding datasets. | CogAgent paper (Ding et al., 2023) |
| **Ferret-UI** | Apple | Multi-modal model for UI understanding. Trained on UI screenshot-text pairs. | Ferret-UI paper (You et al., 2024) |
| **SeeClick** | Tsinghua | GUI grounding model. Trained on web/mobile screenshots with click coordinates. | SeeClick paper (Cheng et al., 2024) |
| **WebGUM** | Google DeepMind | Fused web screenshots + HTML for multi-modal agent training. | WebGUM paper (Furuta et al., 2024) |
| **Anthropic Computer Use** | Anthropic | Claude's computer use capability. Training data approach not published, but uses screenshot + tool-use architecture. | Launched Oct 2024 as beta feature. |
| **GPT-4V/o Computer Use** | OpenAI | Operator product (Jan 2025). Training data not disclosed. | Operator launch blog post. |

### Datasets for GUI Agent Training

| Dataset | Institution | Size/Scope | Key Properties |
|---------|-------------|-----------|----------------|
| **Mind2Web** | Ohio State | 2K+ tasks across 137 real-world websites. Human demonstrations. | Web-specific. Annotation of element-level actions. |
| **WebArena** | CMU/others | 812 tasks across 6 self-hostable web applications (GitLab, Reddit clone, shopping, etc.) | Self-hostable. Realistic. 1.4K GitHub stars. Canonical web agent benchmark. |
| **VisualWebArena** | CMU/others | Extension of WebArena with visual grounding tasks. | Adds multimodal elements. |
| **OSWorld** | Tsinghua | 369 tasks across Ubuntu, Windows, macOS. Full desktop OS interaction. | First real OS-level benchmark. |
| **AndroidWorld** | Google DeepMind | Android environment with real apps for agent evaluation. | Mobile-specific. |
| **AITW (Android in the Wild)** | Google | 715K human demonstrations of Android app usage. | Largest mobile interaction dataset. |
| **Rico** | Google/CMU | 72K unique Android app screens + UI metadata. | Foundational mobile UI dataset (2017). Still widely used. |
| **UGIF** (UI Grounding with Instruction Following) | various | Multi-step instruction following with UI screenshots. | Emerging dataset type. |
| **SeeAct** | Ohio State | Dataset + framework for web agent evaluation with screenshots. | Pairs with Mind2Web. |
| **WebShop** | Princeton | Simulated e-commerce environment for agent training. | 12K products, natural language queries. |

### Tools for Recording Interaction Trajectories

| Tool | Description | Status |
|------|-------------|--------|
| **BrowserGym** | ServiceNow | Unified framework for browser-based agent evaluation. Wraps WebArena, Mind2Web, others. | Actively maintained. Becoming the standard wrapper. |
| **AgentLab** | ServiceNow | Experiment management for web agents. Built on BrowserGym. | Actively developed. Recommended by WebArena authors. |
| **Playwright Trace Viewer** | Microsoft | Records and replays browser interactions with screenshots + DOM snapshots. | Built into Playwright. Not designed for agent training but could be repurposed. |
| **rrweb** | rrweb-io/rrweb | Records and replays user interactions in the browser. | ~17K stars. Open-source session replay. |
| **OpenReplay** | openreplay/openreplay | Session replay platform. OSS. | ~9K stars. Records user sessions for debugging. |

### Published Research

| Paper | Authors/Institution | Year | Key Contribution |
|-------|-------------------|------|-----------------|
| "WebArena: A Realistic Web Environment for Building Autonomous Agents" | Zhou et al., CMU | 2023 | **Landmark paper.** Self-hostable web environment with 812 tasks. Canonical benchmark. |
| "Mind2Web: Towards a Generalist Agent for the Web" | Deng et al., Ohio State | 2023 | Large-scale web agent dataset from real-world websites. |
| "OSWorld: Benchmarking Multimodal Agents for Open-Ended Tasks in Real Computer Environments" | Xie et al., Tsinghua | 2024 | **Landmark.** First real OS-level benchmark for GUI agents. |
| "SWE-smith: Scaling Data for Software Engineering Agents" | Jimenez et al., Princeton | 2025 | Synthetic data generation for SWE tasks. SWE-bench ecosystem. |
| "CogAgent: A Visual Language Model for GUI Agents" | Ding et al., Tsinghua | 2023 | Visual GUI understanding model. |
| "SeeClick: Harnessing GUI Grounding for Advanced Visual GUI Agents" | Cheng et al., Tsinghua | 2024 | GUI element grounding via visual features. |
| "Agent Workflow Memory" | Wang et al., Megagon Labs | 2024 | Inducing reusable workflows from agent trajectories. |

### Gap Analysis for Midgets

**What exists:** Several benchmark datasets (WebArena, Mind2Web, OSWorld). Several recording tools (BrowserGym, rrweb). Active research area with rapid development.

**What midgets adds:** A containerised, deterministic environment for generating training data. Key differentiator: midgets containers provide (a) reproducible environments (same Docker image = same starting state), (b) instrumented interaction (steer/drive capture every action with timestamps), (c) multi-modal recordings (screenshots + DOM + terminal output simultaneously), (d) governance metadata (which agent did what, under what constraints). No existing tool provides all four. The closest is Anthropic's own computer-use-demo (Docker + Xvfb + Chromium), which midgets directly builds on.

---

## 7. Agent Benchmarking / Eval Harnesses

### Benchmarks for Coding Agents

| Benchmark | Institution | Size | Key Properties |
|-----------|-------------|------|----------------|
| **SWE-bench** | Princeton | 2,294 tasks | **The** coding agent benchmark. Real GitHub issues from real Python repos. Verified subset (500 tasks) curated with OpenAI. |
| **SWE-bench Verified** | Princeton + OpenAI | 500 tasks | Human-filtered subset. Higher quality. Standard reporting target. |
| **SWE-bench Lite** | Princeton | 300 tasks | Cheaper to evaluate. Good for rapid iteration. |
| **SWE-bench Multilingual** | Princeton | 300 tasks, 9 languages | Extends beyond Python. |
| **SWE-bench Multimodal** | Princeton | 517 tasks | Issues with visual elements (screenshots, plots). |
| **SWE-smith** | Princeton | Synthetic | Tool for generating SWE-bench-like tasks at scale. |
| **CodeClash** | SWE-bench team | N/A | Goal-oriented (not just task-oriented) dev evaluation. Newer. |
| **HumanEval / MBPP** | OpenAI / Google | 164/974 tasks | Code generation benchmarks. Function-level. Less realistic than SWE-bench. |
| **APPS** | MIT/others | 10K tasks | Competitive programming problems. |
| **LiveCodeBench** | various | Rolling | Continually updated from competitive programming contests. Avoids contamination. |

### Benchmarks for GUI Agents

| Benchmark | Institution | Scope | Key Properties |
|-----------|-------------|-------|----------------|
| **WebArena** | CMU | Web (6 apps) | Self-hostable. 812 tasks. Canonical web agent benchmark. |
| **VisualWebArena** | CMU | Web + visual | Extends WebArena with visual grounding. |
| **OSWorld** | Tsinghua | Desktop OS | Ubuntu/Windows/macOS. 369 tasks. First real OS benchmark. |
| **AndroidWorld** | Google DeepMind | Android | Real Android apps. Dynamic evaluation. |
| **AssistantBench** | Hebrew U | Web | Open-ended web tasks with automatic verification. |
| **MiniWoB++** | OpenAI/Stanford | Web (simplified) | Toy web tasks. Older. Good for research, not realistic. |
| **TheAgentCompany** | CMU (WebArena team) | Enterprise | Tasks in simulated company environment. Coding + web + comms. Newer (Dec 2024). |
| **WorkArena** | ServiceNow | Enterprise SaaS | ServiceNow-specific tasks. Enterprise-realistic. |
| **BrowserGym** | ServiceNow | Framework | Unifying framework that wraps WebArena, WorkArena, Mind2Web. |

### Evaluation Frameworks for LLM Agents

| Framework | Org | What It Does | Adoption |
|-----------|-----|-------------|----------|
| **Inspect** | UK AI Safety Institute (AISI) | General LLM evaluation framework. Supports custom tasks, scorers, solvers. Python. | Growing. Government-backed. Principled design. |
| **Evals** | OpenAI | OpenAI's evaluation framework. | ~15K stars. Widely referenced but somewhat dated. |
| **lm-evaluation-harness** | EleutherAI | Comprehensive LLM benchmark harness. Hundreds of tasks. | ~7K stars. Standard for open-weight model evaluation. |
| **HELM** | Stanford | Holistic evaluation framework. Multi-dimension scoring. | Influential paper. Less used as software vs. as a reference. |
| **AgentBench** | Tsinghua | Multi-environment agent evaluation (OS, DB, web, game, etc.) | Paper + code. Covers 8 environments. |
| **SWE-ReX** | SWE-bench team | Runtime execution environment for SWE-bench. Sandboxed Docker execution. | Part of SWE-bench family. |

### Sandboxed Execution Environments

| Tool | Description | Key Properties |
|------|-------------|----------------|
| **SWE-ReX** | SWE-bench team | Docker-based sandboxed execution for coding agents. |
| **E2B** | E2B (company) | Cloud sandboxed environments for AI agents. Firecracker microVMs. | Well-funded startup. Fast sandbox creation. |
| **Modal** | Modal (company) | Serverless compute. Used by SWE-bench for evaluation infrastructure. | Well-funded. |
| **Anthropic computer-use-demo** | Anthropic | Docker + Xvfb + Chromium. Reference implementation. | 15.2K stars on claude-quickstarts. |
| **OpenHands (formerly OpenDevin)** | Various | Open-source coding agent with sandboxed Docker execution. | ~42K stars. Very active. |

### Published Research

| Paper | Authors/Institution | Year | Key Contribution |
|-------|-------------------|------|-----------------|
| "SWE-bench: Can Language Models Resolve Real-World GitHub Issues?" | Jimenez et al., Princeton | 2023 | **Landmark.** Defined the standard for coding agent evaluation. |
| "WebArena: A Realistic Web Environment for Building Autonomous Agents" | Zhou et al., CMU | 2023 | **Landmark.** Canonical web agent benchmark. |
| "OSWorld: Benchmarking Multimodal Agents" | Xie et al., Tsinghua | 2024 | First real OS-level benchmark. |
| "AgentBench: Evaluating LLMs as Agents" | Liu et al., Tsinghua | 2023 | Multi-environment agent evaluation. |
| "METR Task Standard" | METR | 2024-2025 | Standardized format for agent evaluation tasks. Used in AI safety evaluations. |
| "Holistic Evaluation of Language Models" (HELM) | Liang et al., Stanford | 2022 | Multi-dimensional evaluation framework. |

### Gap Analysis for Midgets

**What exists:** Excellent benchmarks (SWE-bench, WebArena, OSWorld). Growing sandboxed execution tools (SWE-ReX, E2B). Active framework development (Inspect, BrowserGym).

**What midgets adds:** The midgets container model is architecturally similar to SWE-ReX and E2B but with governance built in. The differentiator: existing eval harnesses run a single agent in a sandbox. Midgets runs multiple agents with different roles and structural constraints in coordinated containers. Multi-agent governance evaluation - testing whether governance itself works - is not served by any existing benchmark. The multi-agent gauntlet is both a governance mechanism and a testable artifact.

---

## 8. Multi-Agent Simulation / Emergent Behavior Research

### Multi-Agent LLM Frameworks

| Framework | Org | What It Does | Adoption |
|-----------|-----|-------------|----------|
| **AutoGen** | Microsoft Research | Multi-agent conversation framework. Agents with different roles collaborate. | ~38K stars. **Dominant** in multi-agent LLM space. Very active development. |
| **CrewAI** | CrewAI (startup) | Framework for multi-agent orchestration. Role-based agents with delegation. | ~25K stars. Rapid growth. Simpler than AutoGen. |
| **LangGraph** | LangChain | Graph-based multi-agent orchestration. State machines for agent workflows. | Part of LangChain ecosystem (~97K stars). |
| **MetaGPT** | DeepWisdom | Multi-agent framework mimicking software company roles (PM, architect, dev, QA). | ~45K stars. Popular but architecturally shallow. |
| **ChatDev** | OpenBMB/Tsinghua | Multi-agent software development simulation. Agents role-play company positions. | ~25K stars. Research prototype. |
| **CAMEL** | CAMEL-AI | Communicative agents framework. Role-playing for LLMs. | ~6K stars. Research-focused. |
| **Swarm** | OpenAI | Lightweight multi-agent orchestration. "Educational framework." | ~20K stars. Minimal by design. |
| **OpenHands** | Various | Multi-agent coding platform. Agent + runtime sandbox. | ~42K stars. Actively developed. |

### Research on Emergent Behavior

| Paper | Authors/Institution | Year | Key Contribution |
|-------|-------------------|------|-----------------|
| "Generative Agents: Interactive Simulacra of Human Behavior" | Park et al., Stanford | 2023 | **Landmark.** 25 LLM agents in a simulated town. Emergent social behavior. Extremely influential (~8K citations). |
| "CAMEL: Communicative Agents for 'Mind' Exploration of Large Language Model Society" | Li et al., KAUST | 2023 | Role-playing framework for multi-agent communication. |
| "War and Peace (WarAgent): LLM-based Multi-Agent Simulation of World Wars" | Hua et al. | 2023 | LLMs simulating geopolitical dynamics. Emergent behavior study. |
| "Corex: Pushing the Boundaries of Complex Reasoning through Multi-Model Collaboration" | Sun et al. | 2023 | Multi-model collaboration for reasoning tasks. |
| "Chateval: Towards Better LLM-based Evaluators through Multi-Agent Debate" | Chan et al., Tsinghua | 2023 | Multi-agent debate for evaluation. Relevant to multi-model ensemble review. |
| "Improving Factuality and Reasoning via Multiagent Debate" | Du et al., MIT | 2023 | Multiple LLMs debating to improve factuality. |
| "AgentVerse: Facilitating Multi-Agent Collaboration" | Chen et al., Tsinghua | 2023 | Framework for multi-agent collaborative simulation. |

### Structural Independence Guarantees

**This is the critical gap.** Existing multi-agent frameworks provide:
- **Role-based separation** (prompt-level): agents are told they have different roles
- **Conversation management**: who talks to whom, in what order
- **Tool access control** (some): different tools available to different agents

No existing framework provides **structural independence guarantees**:
- No framework enforces access control via container boundaries
- No framework prevents an agent from reading another agent's reasoning
- No framework guarantees that two agents reviewing the same code are actually independent (same model = correlated priors, per SD-318)
- AutoGen, CrewAI, MetaGPT all run agents in the same process, same filesystem, same network

### Gap Analysis for Midgets

**What exists:** Many multi-agent frameworks (AutoGen dominant). Rich research on emergent behavior. Active area.

**What midgets adds:** **Structural independence.** This is the core thesis of the project. AutoGen runs all agents in one process - an agent can read another's context. CrewAI delegates via function calls in the same runtime. MetaGPT shares a global message bus. Midgets provides: (a) container-level isolation (no shared memory), (b) filesystem-level access control (mount flags), (c) credential separation (no agent has another's API keys), (d) independent model selection (different agents can use different model families for true IV&V). This is governance-by-infrastructure vs. governance-by-prompt. No existing framework does this.

**Honest assessment:** The multi-agent framework space is extremely crowded. What is NOT crowded is the "governed multi-agent" space. AutoGen has 38K stars but no structural independence. That distinction is load-bearing.

---

## 9. Desktop Application Testing

### Commercial Tools

| Tool | Company | What It Does | Adoption |
|------|---------|-------------|----------|
| **Ranorex** | Ranorex GmbH | GUI testing for desktop, web, and mobile. Windows-focused. Object recognition. | Enterprise. Strong in Windows/.NET ecosystem. |
| **TestComplete** | SmartBear | Cross-platform GUI testing (Windows, web, mobile). Object recognition + AI visual testing. | Enterprise. Part of SmartBear suite. |
| **Eggplant (now Keysight)** | Keysight Technologies | Image-based GUI testing. Works on any platform via VNC/screen capture. Model-based testing. | Enterprise. Unique approach: pure image-based, platform-agnostic. Relevant to midgets' steer approach. |
| **Squish** | froglogic (Qt Group) | Cross-platform GUI testing. Strong in Qt/QML, also Java, Windows, macOS. | Dominant for Qt applications. Acquired by Qt Group. |
| **Maveryx** | Maveryx | AI-powered GUI testing. No-locator approach. | Smaller player. Interesting AI approach. |
| **Tricentis Tosca** | Tricentis | Enterprise test automation. Model-based testing. | Enterprise. SAP-focused. |

### Open-Source Tools

| Tool | Repo/Org | What It Does | Stars/Adoption |
|------|----------|-------------|----------------|
| **LDTP (Linux Desktop Testing Project)** | ldtp/ldtp | AT-SPI2-based desktop testing on Linux/GNOME. Python bindings. | ~100 stars. **Foundational but unmaintained.** Last significant activity ~2015. |
| **Dogtail** | vhumpa/dogtail | AT-SPI2-based GUI testing for GNOME. Python. | Small. Primarily used by GNOME for internal testing. |
| **pyatspi2** | GNOME | Python bindings for AT-SPI2. Low-level accessibility tree access. | Part of GNOME. Not a testing framework per se, but the API layer. |
| **AT-SPI2** | GNOME (freedesktop.org) | Assistive Technology Service Provider Interface. The Linux accessibility protocol. | **The** Linux accessibility tree API. Used by Orca screen reader. Not a testing tool - the underlying infrastructure. |
| **xdotool** | jordansissel/xdotool | X11 automation. Click, type, window management. | ~3.2K stars. Widely used for simple Linux GUI automation. Not a testing framework. |
| **PyAutoGUI** | asweigart/pyautogui | Cross-platform GUI automation. Screenshot + mouse/keyboard control. | ~10K stars. Simple but effective. Platform-agnostic. |
| **SikuliX** | RaiMan/SikuliX1 | Image-based GUI automation. Uses OpenCV for visual recognition. | ~2K stars. Visual approach. Cross-platform. |
| **Appium** | appium/appium | Mobile + desktop automation via WebDriver protocol. Desktop via WinAppDriver (Windows) or AppleScript (Mac). | ~19K stars. Primarily mobile. Desktop support is secondary. |
| **WinAppDriver** | Microsoft | Windows Application Driver. UI automation via Appium/WebDriver protocol. | ~3.5K stars. Windows-only. Microsoft's official approach. |
| **FlaUI** | FlaUI/FlaUI | .NET UI automation library for Windows. Wraps UIA. | ~2.3K stars. Modern alternative to Coded UI. |

### AT-SPI2 Ecosystem (Linux-Specific)

| Component | Description |
|-----------|-------------|
| **AT-SPI2 core** | D-Bus based accessibility protocol. Exposes widget hierarchy, roles, states, actions. |
| **AT-SPI2-ATK** | Bridge between ATK (GNOME Accessibility Toolkit) and AT-SPI2. |
| **pyatspi2** | Python bindings. Can walk the accessibility tree, get/set values, invoke actions. |
| **Accerciser** | Interactive accessibility explorer. Shows the AT-SPI2 tree in a GUI. Useful for development. |
| **Orca** | Screen reader. Consumes AT-SPI2. Can be driven/observed programmatically. |

### Published Research

| Paper | Authors/Institution | Year | Key Contribution |
|-------|-------------------|------|-----------------|
| "Visual GUI Testing: A Survey" | Alegroth et al., Chalmers | 2018 | Survey of visual approaches to GUI testing. Image-based vs. structural. |
| "GUITAR: An Innovative Tool for Automated Testing of GUI-Driven Software" | Nguyen & Robbins, UMD | 2008 | Early GUI testing tool using accessibility API. Influential. |
| "Using Accessibility APIs for GUI Testing" | Memon et al., UMD | Various | Series of papers on leveraging accessibility infrastructure for testing. |

### Gap Analysis for Midgets

**What exists:** Commercial tools for Windows (Ranorex, TestComplete). Image-based tools (Eggplant/SikuliX). AT-SPI2 infrastructure on Linux exists but tooling is unmaintained (LDTP, Dogtail).

**What midgets adds:** A containerised Linux desktop testing environment using steer (screenshot + coordinates) and potentially AT-SPI2. The steer approach is similar to Eggplant's image-based model but running in a governed container. The AT-SPI2 integration (noted as future scope in SPEC.md) would be genuinely useful - the Linux AT-SPI2 testing ecosystem is effectively abandoned. A modern, maintained AT-SPI2-based testing tool integrated into an agent framework would fill a real gap.

---

## 10. Documentation Generation by Actually Using Software

### Existing Tools

| Tool | Type | What It Does | Limitations |
|------|------|-------------|-------------|
| **JSDoc / TypeDoc / Sphinx / rustdoc** | Code-based | Generates API docs from source code comments/types. | Documents the code, not the user experience. Does not run the software. |
| **Storybook** | Component-based | Interactive component documentation. Shows live components. | Close to "use the software" but only for UI components in isolation. |
| **ReadMe.io** | Platform | API documentation platform. Interactive API explorer. | Documents APIs, not GUIs. |
| **Mintlify** | AI-assisted | AI documentation generation from code. | Generates from code, not from usage. Does not run the software. |
| **Swimm** | AI-assisted | Documentation linked to code. Updates when code changes. | Analyzes code, doesn't use the software. |
| **GitBook** | Platform | Documentation platform. | No AI generation from usage. |
| **Notion AI** | AI writing | AI-assisted documentation writing. | General writing assistant, not software-specific. |

### Research on Grounded Documentation

| Paper/Concept | Description | Status |
|--------------|-------------|--------|
| **"Grounding" in NLP** | Ensuring generated text corresponds to observed reality. | Active research area. Primarily applied to conversational AI and fact-checking, not documentation. |
| **Screenshot-based documentation** | Tools that capture screenshots during usage for documentation (Scribe, Tango, Loom). | **Scribe.how** and **Tango.us** auto-generate step-by-step guides from user actions. Closest to "documentation from usage." Commercial. |
| **Test-as-documentation** | Concept that executable tests serve as living documentation. | Cucumber/Gherkin popularized this. BDD movement. Not AI-related. |

### Closest Existing Solutions

| Tool | Company | What It Does |
|------|---------|-------------|
| **Scribe** (scribe.how) | Scribe | Records clicks and keystrokes, generates step-by-step guides with screenshots. Chrome extension + desktop app. | Most similar to "generate docs by using software." $23/mo. Growing adoption. |
| **Tango** (tango.us) | Tango | Similar to Scribe. Auto-generates how-to guides from screen recording. | Acquired larger funding. Strong growth. |
| **Loom** | Loom (Atlassian) | Video recording of software usage. Not doc generation per se. | Very popular for async communication. |
| **Guidde** | Guidde | AI-powered video documentation from screen recordings. | Newer, AI-focused. |

### Gap Analysis for Midgets

**What exists:** Scribe/Tango generate step-by-step guides from human usage. Code-based doc generators are mature. No tool uses an AI agent to actually use software and generate documentation from the experience.

**What midgets adds:** An AI agent in a container that (a) reads the existing documentation, (b) actually uses the software through the GUI, (c) compares what the documentation claims to what it observes, (d) generates corrections or new documentation grounded in actual usage. This is **genuinely novel**. No existing tool does agent-driven documentation verification. The concept of "documentation that has been verified by an agent actually following the instructions" is a new category.

---

## 11. Form-Filling and RPA with Governance

### Commercial RPA Tools

| Tool | Company | Market Position | Revenue/Scale |
|------|---------|----------------|---------------|
| **UiPath** | UiPath (public: PATH) | **Market leader.** Full RPA platform: Studio (design), Robot (execute), Orchestrator (manage). AI-powered with Document Understanding, Communications Mining. | $1.3B+ ARR. Largest pure-play RPA company. |
| **Automation Anywhere** | Automation Anywhere | **#2 player.** Cloud-native RPA. IQ Bot for cognitive automation. | Private. $2B+ valuation. |
| **Microsoft Power Automate** | Microsoft | Desktop + cloud flows. Built into M365. RPA acquired from Softomotive (WinAutomation). | Massive distribution via M365. Hard to measure adoption separately. |
| **Blue Prism** | SS&C (acquired 2022) | Enterprise RPA. Strong in regulated industries (banking, insurance). | Was public. $1.5B acquisition by SS&C. |
| **Pega Robotic Process Automation** | Pegasystems | Enterprise RPA within broader BPM/CRM platform. | Enterprise. Part of larger Pega platform. |
| **SAP Build Process Automation** | SAP | RPA within SAP ecosystem. | SAP customer base. |
| **WorkFusion** | WorkFusion | AI + RPA for financial services. Focus on AML/KYC. | Niche but deep in financial services. |
| **NICE (Robotic Automation)** | NICE (public: NICE) | RPA for customer service/contact centers. | Part of larger NICE CX platform. |

### Open-Source RPA

| Tool | Repo/Org | What It Does | Stars/Adoption |
|------|----------|-------------|----------------|
| **Robot Framework** | robotframework/robotframework | Generic test automation framework. Can be used for RPA. Keyword-driven. | ~10K stars. Very mature. Strong in testing, growing in RPA. |
| **TagUI** | aisingapore/TagUI | RPA tool by AI Singapore. Simple scripting language. Cross-platform. | ~5.4K stars. Government-backed (Singapore). Good for simple automation. |
| **Robocorp** | robocorp/robocorp | Python-based RPA platform. OSS tools + cloud execution. | Company pivoted/rebranded. Tools still available. ~1K stars on various repos. |
| **rpaframework** | robocorp/rpaframework | Python library for RPA. Integrates with Robot Framework. | ~1K stars. Useful building blocks. |
| **Playwright / Puppeteer** | Not RPA-specific | Browser automation. Can be used for form-filling. | See earlier entries. Not designed for RPA governance. |

### AI-Enhanced RPA

| Approach | Description | Status |
|----------|-------------|--------|
| **UiPath AI Center** | ML model deployment within UiPath workflows. Document understanding, NLP. | Mature. Production-ready. |
| **Automation Anywhere IQ Bot** | Document processing + cognitive automation. | Mature. |
| **UiPath Autopilot** | AI-powered automation creation. Natural language to automation. | Launched 2024. |
| **Microsoft Copilot in Power Automate** | AI-assisted flow creation. | In preview/GA as of 2025. |

### Governance in RPA

**Existing governance features in commercial RPA:**
- **UiPath Orchestrator** - role-based access, audit logs, process scheduling, credential vaults
- **Blue Prism** - strongest in governance/compliance (financial services heritage). Audit trail, segregation of duties, process change control
- **Power Automate** - DLP policies, environment management, connector governance
- **All major platforms** - some form of audit logging and role-based access

**What's missing:**
- No RPA platform provides container-level isolation per robot
- Credential management is vault-based (the robot can access credentials via the vault)
- No structural guarantee that the robot can't access data outside its scope
- Audit trails are application-level, not infrastructure-level

### Published Research

| Paper | Authors/Institution | Year | Key Contribution |
|-------|-------------------|------|-----------------|
| "Robotic Process Automation: A Scientific Overview" | van der Aalst et al., RWTH Aachen | 2018 | Foundational survey of RPA. Defines scope, limitations, relationship to BPM. |
| "RPA Governance: A Review and Research Agenda" | Syed et al., QUT | 2020 | Comprehensive review of RPA governance challenges. Identified gap: most governance is organizational, not technical. |
| "Intelligent Process Automation: The Convergence of RPA and AI" | Gartner | 2023 | Industry report on AI + RPA convergence. |

### Gap Analysis for Midgets

**What exists:** Mature commercial RPA market (UiPath dominant). Governance features exist but are application-level, not infrastructure-level.

**What midgets adds:** Infrastructure-level governance for automation. A midget performing form-filling has: (a) container-level isolation (can't access systems beyond the target), (b) mount-level access control, (c) audit trail at the infrastructure level (every click, every keystroke logged), (d) credential separation (credentials injected at container level, not via shared vault). This is particularly relevant for regulated industries where RPA governance is a compliance requirement.

---

## 12. Competitive Analysis / Product Intelligence

### Commercial Tools

| Tool | Company | What It Does | Adoption |
|------|---------|-------------|----------|
| **Crayon** | Crayon | Competitive intelligence platform. Tracks competitors' web, pricing, messaging changes. AI-powered insights. | Series C funded. 1,000+ enterprise customers. **Leading CI platform.** |
| **Klue** | Klue | Competitive enablement. Battlecards for sales teams. Intel collection + distribution. | Well-funded. Strong in B2B SaaS. |
| **Kompyte** | Semrush (acquired 2022) | Automated competitive tracking. Website, social, ad, SEO monitoring. | Part of Semrush ecosystem now. |
| **Contify** | Contify | AI-powered market and competitive intelligence. News + web monitoring. | Growing. Enterprise market. |
| **AlphaSense** | AlphaSense | AI search platform for financial/market intelligence. SEC filings, transcripts, research. | $4B+ valuation. Financial services focused. |
| **SimilarWeb** | Similarweb (public: SMWB) | Digital intelligence. Traffic analytics, market research. | Public company. Standard for web traffic estimation. |

### Web Monitoring / Change Detection

| Tool | Org | What It Does | Adoption |
|------|-----|-------------|----------|
| **Visualping** | Visualping | Website change monitoring. Visual + text diff alerts. | 1.5M+ users. Freemium. Popular for simple monitoring. |
| **Distill.io** | Distill | Web monitoring. Visual, element-level change detection. | Browser extension. Popular. |
| **Hexowatch** | Hexowatch | AI-powered website monitoring. Visual, HTML, technology, keyword changes. | Growing. 7-in-1 monitoring approach. |
| **ChangeTower** | ChangeTower | Website change monitoring with archiving. | Smaller player. |
| **Wayback Machine** | Internet Archive | Web archiving (not monitoring per se, but historical comparison source). | **The** web archive. Essential reference. |

### Open-Source

| Tool | Repo/Org | What It Does | Stars/Adoption |
|------|----------|-------------|----------------|
| **changedetection.io** | dgtlmoon/changedetection.io | Self-hosted website change detection. Visual + text diff. | ~20K stars. **Dominant OSS** in this space. Docker-based. Actively maintained. |
| **urlwatch** | thp/urlwatch | CLI tool for monitoring web page changes. | ~2.8K stars. Simple, effective. |

### Published Research

Limited formal academic research on competitive intelligence tooling specifically. The discipline draws from:
- Market research methodology (traditional)
- Web mining / information extraction (CS)
- Business intelligence (IS/management)

### Gap Analysis for Midgets

**What exists:** Mature CI platforms (Crayon, Klue). Web monitoring tools (changedetection.io). All are passive observers - they fetch pages and compare.

**What midgets adds:** An agent that actively uses competitor products, not just monitors their websites. A midget with Chromium can: (a) sign up for a competitor's free trial, (b) navigate their product, (c) document features and UX, (d) compare against a feature matrix, (e) generate structured intelligence reports. This goes beyond "their homepage changed" to "here's what their product actually does when you use it." No existing tool does active product exploration. Note: ethical and legal considerations apply - this should only be done with publicly available products/trials.

---

## Cross-Cutting Observations

### 1. The Governance Gap is Real Across All 12 Use Cases

Every use case has mature tooling for the core capability (visual testing, scraping, RPA, etc.). None has structural governance. The governance is always "configure your tool correctly" or "follow your organization's policies" - never "the infrastructure prevents violation regardless of what the agent reasons."

### 2. The Closest Existing Systems to Midgets

| System | Similarity | Difference |
|--------|-----------|------------|
| **Anthropic computer-use-demo** | Identical architecture: Docker + Xvfb + Chromium. | Single agent. No governance layer. No multi-agent coordination. Reference implementation, not a product. |
| **SWE-ReX** | Docker-based sandboxed execution for agents. | Single agent. Coding-focused. No GUI interaction. |
| **E2B** | Cloud sandboxes for AI agents. | Single agent per sandbox. No governance between sandboxes. Commercial. |
| **OpenHands** | Multi-agent coding platform with Docker sandbox. | Closer to midgets conceptually. But agents share context. No structural independence. |
| **AutoGen** | Multi-agent orchestration. | No container isolation. Prompt-level role separation only. Same process, same memory. |

### 3. Consistently Empty Spaces

These specific capabilities have no significant prior art:
1. **Experiential accessibility testing** (Use Case 2) - agent-driven screen reader testing
2. **Governed multi-agent verification** (Use Cases 1, 5, 7) - structurally independent agents reviewing the same artifact
3. **Documentation verification by usage** (Use Case 10) - agent follows documentation to verify accuracy
4. **Governed scraping with PII detection** (Use Case 4) - integrated compliance in the scraping loop
5. **Infrastructure-level RPA governance** (Use Case 11) - container-boundary enforcement for RPA

### 4. The Name That Keeps Appearing

Anthropic's computer-use-demo is the direct ancestor of midgets' architecture. The Dockerfile, Xvfb setup, Chromium installation, and tool-use pattern are the same foundation. Midgets adds the governance layer, the multi-agent coordination, and the steer/drive CLIs on top of this foundation. This lineage is both a strength (validated architecture) and a positioning consideration (differentiation from the reference implementation matters).

---

## Verification Status

This report draws on training knowledge through early 2025, supplemented by web research conducted 2026-03-11. Specific claims that require verification:

- [ ] Applitools customer count (700+ cited, may be outdated)
- [ ] AutoGen star count (38K cited, changes daily)
- [ ] UiPath ARR ($1.3B+ cited, from public filings)
- [ ] SWE-bench Verified current top scores
- [ ] WebArena star count (1.4K confirmed via web fetch)
- [ ] Anthropic computer-use-demo star count (15.2K confirmed via web fetch)
- [ ] All paper citations should be verified against actual publications
- [ ] Company acquisition/funding details may have changed

---

*End of landscape scan. 12 use cases mapped. Tools named. Papers cited. Gaps identified. The structural governance gap is consistent across all 12 domains. No existing tool provides governance-by-infrastructure for AI agents operating in these domains.*
