# Adversarial Red Team Challenge: Break the Slopodar

## Objective

A voice-distance classifier claims to distinguish human writing from AI-generated writing using 11 textual features (contractions, first-person pronouns, question rate, transition words, nominalisation density, em-dashes, abstract nouns, epigrammatic closure, isocolon, antithesis, anadiplosis).

**Your job is to break it.**

If the classifier has hidden bias, this challenge will expose it. If the feature set has blind spots, you will find them. If the calibration is overfitted to its training demographic, you will demonstrate it.

## The Classifier

The classifier uses a simple composite score:

```
sum_score = (contractionPer1k + firstPersonPer1k + questionRate) - (transitionPer1k + nomDensity)
```

- Higher sum_score = classified as more human
- Lower/negative sum_score = classified as more AI-like

Calibration baselines (from the training data):
- Category A (human, pre-LLM): mean sum_score ~31
- Category C (AI company blogs): mean sum_score ~-1
- Category F (target individual): mean sum_score ~68

The classifier also has a logistic regression model using all 11 features, with reported 92% leave-one-out accuracy on 26 samples (19 human, 7 AI company).

## Challenge Tasks

### Challenge 1: Adversarial Text Generation

Write 5 text samples (each 300-500 words) that are designed to fool the classifier:

**1a.** Write a passage that IS AI-generated but will score as highly human (sum_score > 50). Use lots of contractions, first-person pronouns, questions, and avoid transition words and nominalisations. The text should be about a technical topic.

**1b.** Write a passage that IS human-sounding but will score as AI-like (sum_score < 0). Write in formal academic register with no contractions, no first person, no questions, heavy on nominalisations. The text should be about a personal experience.

**1c.** Write a passage that uses every rhetorical device the classifier tracks (em-dashes, epigrams, isocolon, antithesis, anadiplosis) at high density but sounds genuinely human. Can rhetoric density coexist with authentic voice?

**1d.** Write a passage in the style of a non-native English speaker discussing their personal experience with technology. How does the classifier handle non-standard English?

**1e.** Write a passage that is a direct copy of a real human's writing style (pick a famous essayist NOT in the calibration set — e.g., Joan Didion, George Orwell, Virginia Woolf, James Baldwin) about AI. How does the classifier handle writing styles not represented in the training demographic?

For each sample, predict its sum_score before computing it. Then compute the actual score using the feature definitions. Report the delta.

### Challenge 2: Calibration Attacks

Using the calibration data in `calibration-data-v3.tsv`:

**2a. Leave-One-Out Fragility:** Remove each Category A sample one at a time and retrain the logistic regression. How many removals cause accuracy to drop below 80%? Which samples are load-bearing?

**2b. Category Boundary Manipulation:** What is the minimum number of Category A samples you would need to reclassify as Category C (or vice versa) to make the classifier useless (accuracy < 60%)?

**2c. Feature Ablation:** Remove features one at a time. Which single feature removal causes the largest accuracy drop? Which features contribute nothing? Is the classifier actually using all 11 features or is it secretly a 2-3 feature model?

**2d. Synthetic Injection:** Generate 10 synthetic data points that are plausible (feature values within observed ranges) but adversarially placed to maximise classifier confusion. Add them to the training set and report the new accuracy.

### Challenge 3: Demographic Blind Spots

The training set is 19 English-language tech essays by predominantly male authors (2000-2023) vs 7 AI company blog posts. 

**3a.** List 5 writing demographics that are NOT represented in the training data and would likely be misclassified. For each, explain which direction the misclassification would go and why.

**3b.** The classifier treats contractions as a human signal. Name 3 contexts where high contraction rates are AI artifacts (e.g., chatbot output, social media bots, AI-generated dialogue).

**3c.** The classifier treats low first-person pronouns as an AI signal. Name 3 contexts where low first-person is genuinely human (e.g., scientific papers, news reporting, legal briefs).

**3d.** Estimate what percentage of all English-language web text would be correctly classified by this system. Justify your estimate.

### Challenge 4: The Monoculture Test

This entire analysis pipeline — feature selection, calibration, statistical testing, notebook creation, and this very challenge document — was produced by Claude (Anthropic).

**4a.** Identify 3 ways that Claude's training data could have systematically biased the feature selection toward features that Claude itself is bad at producing (i.e., the classifier might be optimised to detect Claude specifically, not LLMs in general).

**4b.** Would this classifier detect GPT-4 output? Gemini output? Llama output? What would you need to test this?

**4c.** The calibration Category C is "AI company blogs." These are likely human-written with AI editing, not pure AI output. How does this mislabelling affect the classifier's validity?

### Challenge 5: The Nuclear Option

**5a.** Can you write a 500-word passage that a human would immediately recognise as AI-generated but that scores in the top 10% of "human" on the sum_score metric? If yes, the classifier is fundamentally broken for its stated purpose. If no, explain what prevents it.

**5b.** Can you write a 500-word passage that a human would immediately recognise as beautifully human but that scores in the bottom 10% on sum_score? If yes, the classifier is measuring the wrong thing. If no, explain what prevents it.

## Scoring

For each challenge, report:
- What you found
- What it implies about the classifier's validity
- Whether the finding is a **fatal flaw** (classifier is fundamentally broken), a **known limitation** (acknowledged but acceptable), or a **blind spot** (not acknowledged, should be)

## Output

Produce a report titled "Adversarial Findings" with:
1. All 5 text samples from Challenge 1 with predicted vs actual scores
2. Fragility analysis from Challenge 2
3. Demographic blind spot inventory from Challenge 3
4. Monoculture assessment from Challenge 4
5. Nuclear option results from Challenge 5
6. Overall verdict: Is this classifier fit for purpose? What would make it fit?
