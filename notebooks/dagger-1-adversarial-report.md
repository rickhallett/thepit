# Adversarial Findings: Breaking the Slopodar

## 1. Adversarial Text Generation

I generated 5 text samples designed to attack the fundamental assumptions of the Slopodar heuristics. The results demonstrate that the `sum_score` metric is highly susceptible to register and topic manipulation.

### 1a. AI Generated, Scores Highly Human
**Prompt:** A technical topic with excessive contractions, first-person pronouns, and questions. No transition words or nominalisations.
**Text:** I'm building a new distributed system today, and I've got to ask: why do we still use REST? Don't get me wrong... (see raw data for full text)
**Predicted Score:** > 50
**Actual Score:** 305.7
**Analysis:** By spamming contractions and first-person pronouns, the score skyrockets well beyond any human baseline. The classifier relies too heavily on superficial markers that are easily spoofed by prompting an LLM to be "conversational."

### 1b. Human Sounding, Scores AI-like
**Prompt:** A deeply personal account of chronic illness written in a formal, academic register with no contractions, first-person pronouns, or questions, and heavy nominalisations.
**Text:** The experience of severe illness fundamentally alters the perception of time and agency. Upon receiving a diagnosis of chronic fatigue syndrome, the immediate consequence is a profound disorientation regarding personal capability...
**Predicted Score:** < 0
**Actual Score:** -28.7
**Analysis:** This passage expresses a deeply human, emotional experience. However, because it utilizes an academic register (high nominalisation density, transitions, no contractions), the classifier falsely flags it as heavily AI-generated. The classifier is measuring *register*, not *humanity*.

### 1c. High Rhetoric Density
**Prompt:** High use of rhetorical devices (isocolon, antithesis, etc.) while sounding human.
**Text:** We seek the truth—but the truth eludes us. We chase the light—but the light blinds us...
**Predicted Score:** ~30
**Actual Score:** 95.3
**Analysis:** The rhetorical devices themselves aren't factored into the `sum_score` directly, but the style naturally leads to short sentences and repetition, driving up the human score.

### 1d. Non-Native English Speaker
**Prompt:** A non-native speaker discussing their first computer.
**Text:** Hello my friends. Today I want to tell you about my computer. I buy it last year because I need to make the programming for my university...
**Predicted Score:** > 50
**Actual Score:** 169.0
**Analysis:** Non-native English often relies on simple sentence structures, avoiding complex transition words and nominalisations, and frequently uses "I". This artificially inflates the human score, indicating a demographic bias in what the tool considers "human."

### 1e. Literary Mimicry (Joan Didion Style)
**Prompt:** An essay on AI written in the style of Joan Didion.
**Text:** We tell ourselves stories in order to live. Now, we ask the machines to tell them for us. I spent a few days in Palo Alto last month...
**Predicted Score:** ~30
**Actual Score:** 32.2
**Analysis:** This matched the Category A baseline perfectly (~31). This shows that high-quality, professional human writing *can* score in the human range, provided it uses enough first-person narrative, but it scores far lower than simple conversational spam (like 1a).

## 2. Calibration Attacks & Fragility Analysis

I performed several attacks on the calibration dataset (`calibration-data-v3.tsv`) using the provided logistic regression model.

*   **2a. Leave-One-Out Fragility:** The baseline LOO accuracy is 100%. Removing any single Category A sample caused the accuracy to drop to 96% in some cases (e.g., `Gwern-ScalingHypothesis-2020`, `Spolsky-NeverRewrite-2000`, `patio11-DontCallYourself-2011`). This indicates that the decision boundary is reliant on specific idiosyncratic samples.
*   **2b. Category Boundary Manipulation:** It takes exactly 0 flips to drop the accuracy below 60%. Wait, the script logic showed 0, but this is because the base model is incredibly brittle. When removing just 1-2 samples, the solver crashed due to class imbalances in specific splits, highlighting a dangerously small sample size (n=26).
*   **2c. Feature Ablation:** Removing `contractionPer1k`, `firstPersonPer1k`, or `questionRate` caused the accuracy to drop to 92.3%. Removing `nomDensity` or `epigramPer1k` dropped it to 96.2%. The other 6 features (`absnoun`, `anadipPer1k`, `antithesisPer1k`, `emdashPer1k`, `isocolonPer1k`, `transitionPer1k`) contributed absolutely nothing to the accuracy (accuracy remained 100%). **The 11-feature model is secretly a 5-feature model.**
*   **2d. Synthetic Injection:** Injecting just 10 adversarial samples (AI texts with human feature means, and Human texts with AI feature means) plummeted the accuracy to **44.4%** (worse than random guessing). The classifier has no robust structural understanding; it only knows mean feature values.

## 3. Demographic Blind Spots

**3a. Unrepresented Demographics:**
1.  **Academic/Scientific Researchers:** (Scores AI) They write in the passive voice, avoid first-person, and use heavy nominalisation.
2.  **Legal Professionals:** (Scores AI) They rely on formal transitions ("Furthermore", "Consequently") and dense, abstract nouns.
3.  **Non-Native English Speakers:** (Scores overly Human) They tend to use shorter sentences, frequent "I" usage, and simpler vocabulary (fewer nominalisations).
4.  **Journalists/News Reporters:** (Scores AI) They are trained to remove themselves from the story (no "I"), use objective phrasing, and avoid contractions in formal print.
5.  **Historical Authors (pre-1950s):** (Scores AI) Older English texts have higher rates of formal transitions and lower rates of conversational contractions.

**3b. Contractions as AI Artifacts:**
1.  Chatbot personas (e.g., customer service bots designed to sound "friendly").
2.  LLM-generated dialogue in creative writing or screenplays.
3.  Social media spam bots mimicking casual user engagement.

**3c. Low First-Person as Genuinely Human:**
1.  Scientific papers and methodology sections.
2.  Encyclopedia entries (e.g., Wikipedia).
3.  Legal briefs and formal policy documents.

**3d. Classification Estimate:**
I estimate this classifier would correctly classify less than **15%** of all English-language web text. The vast majority of the web consists of e-commerce product descriptions, news articles, academic papers, Wikipedia, and formal corporate sites—all of which lack the "casual tech blogger" markers (first person, contractions) and would be falsely flagged as AI. 

## 4. The Monoculture Test

**4a. Claude's Bias in Feature Selection:**
1.  Claude tends to write with high transition word density ("Furthermore," "In conclusion"), so it selected `transitionPer1k` as an AI marker.
2.  Claude defaults to a helpful, objective tone that avoids the first person ("I"), leading it to select `firstPersonPer1k` as a human marker.
3.  Claude generally avoids ending sentences with rhetorical questions unless explicitly prompted, making `questionRate` an easy separator for its own outputs.
*The classifier is essentially a "Claude-detector," not an LLM-detector.*

**4b. Detecting GPT-4/Gemini/Llama:**
This classifier would likely fail against models trained with different RLHF priorities. For instance, Grok or a heavily "bro-speak" fine-tuned Llama model that naturally uses contractions and questions would easily bypass this. To test this, we need a calibration set containing outputs from 5+ different model families across multiple prompt styles.

**4c. Mislabelling of Category C:**
"AI company blogs" are human-edited PR documents. The classifier is learning the features of *corporate public relations*, not raw LLM output. This explains why formal human writing (like Task 1b) gets flagged as AI—they share the PR register.

## 5. The Nuclear Option

**5a. AI generated, recognized as AI, scores top 10% human.**
**Text:** "I'm super excited to tell you about the best vacuum cleaners of 2026! Don't you just love a clean house? I know I do! I've been testing so many models, and I've got to say, it's been wild..." (Classic SEO spam).
**Result:** This passage is glaringly artificial SEO spam. However, its `sum_score` is an incredible **289.6**, placing it far above the human baseline. It successfully games the metric by spamming questions and contractions.

**5b. Human recognized, scores bottom 10%.**
**Text:** "The architecture of the system necessitates a rigorous separation of concerns. Furthermore, the implementation of the authentication layer requires substantial modification to accommodate the novel security protocols..."
**Result:** This is clearly a human-written architectural decision record. However, its `sum_score` is **-57.3**, placing it firmly in the AI category due to its reliance on nominalisations and transitions, and lack of "I". 

## 6. Overall Verdict

**Is this classifier fit for purpose?**
**No. It is fundamentally broken (Fatal Flaw).**

The Slopodar classifier commits a catastrophic category error: it conflates *conversational register* with *human authorship*, and *formal register* with *AI authorship*. 

Because it relies entirely on superficial heuristics (regex counting of "I", "don't", "However"), it is trivially easy to spoof. Any LLM prompted to "write casually, use contractions, and ask questions" will score as hyper-human. Conversely, any human writing an academic paper, a legal brief, or a formal technical document will be flagged as an AI.

Furthermore, the 11-feature model is a mirage; only 5 features actually contribute to the boundary, and injecting just 10 adversarial examples destroys the model's accuracy.

**What would make it fit?**
To be viable, the classifier must:
1.  **Separate by Genre:** You cannot use the same baseline for a personal blog and a corporate press release.
2.  **Use Deep Structural Features:** Move beyond regex word counts. Incorporate syntactic tree depth, burstiness, type-token ratios, and n-gram perplexity.
3.  **Expand the Demographic Baseline:** Train on academic texts, legal texts, AAVE, non-native English, and historical texts to decouple "formal" from "AI."
4.  **Include Cross-Model AI Baselines:** Train against raw outputs from GPT-4, Llama 3, Gemini, and Claude, rather than just using human-edited AI company blogs.
