// evaluate — multi-LLM variant evaluation and voting engine.
//
// Two-phase pipeline:
//
//	Phase 1 (generate): Feed XML prompts to target LLMs, collect variant outputs.
//	Phase 2 (judge):    Each LLM independently evaluates all variants, votes with
//	                    structured rationale. Cluster rationale convergence/divergence.
//
// Usage:
//
//	# Phase 1: generate variants from XML prompts (run from pitstorm/)
//	go run ./cmd/evaluate --phase generate
//
//	# Phase 2: judge variants (reads from variants/ dir or --variants flag)
//	go run ./cmd/evaluate --phase judge --variants results/evaluate/variants.json
//
//	# Full pipeline (run from pitstorm/)
//	go run ./cmd/evaluate
//
// Environment:
//
//	ANTHROPIC_API_KEY  — required for Claude
//	GEMINI_API_KEY     — required for Gemini
//	OPENAI_API_KEY     — required for GPT-4o
package main

import (
	"bytes"
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/rickhallett/thepit/shared/config"
	"github.com/rickhallett/thepit/shared/theme"
)

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// VariantOutput is the structured output from feeding an XML prompt to an LLM.
type VariantOutput struct {
	VariantID   string `json:"variantId"`   // "A", "B", "C"
	VariantName string `json:"variantName"` // "Technical", "Narrative", "Provocative"
	Model       string `json:"model"`       // model that generated it
	HNTitle     string `json:"hnTitle"`
	HNBody      string `json:"hnBody"`
	Narrative   string `json:"narrative"` // research page narrative
	Tweets      string `json:"tweets"`
	RawResponse string `json:"rawResponse"` // full LLM response
	GeneratedAt string `json:"generatedAt"`
}

// JudgeBallot is one judge's evaluation of all variants.
type JudgeBallot struct {
	JudgeModel string        `json:"judgeModel"`
	Ranking    []string      `json:"ranking"` // variant IDs in preference order
	Scores     []JudgeScore  `json:"scores"`  // per-variant scores
	Rationale  string        `json:"rationale"`
	Criteria   []CriteriaSet `json:"criteria"` // per-variant criteria breakdown
	JudgedAt   string        `json:"judgedAt"`
}

// JudgeScore pairs a variant with an overall score.
type JudgeScore struct {
	VariantID string  `json:"variantId"`
	Score     float64 `json:"score"` // 0-10
}

// CriteriaSet is the per-variant criteria breakdown from one judge.
type CriteriaSet struct {
	VariantID            string  `json:"variantId"`
	TechnicalCredibility float64 `json:"technicalCredibility"` // 1-10
	Specificity          float64 `json:"specificity"`          // 1-10
	EngagementHook       float64 `json:"engagementHook"`       // 1-10
	HonestyLimitations   float64 `json:"honestyLimitations"`   // 1-10
	SignalToNoise        float64 `json:"signalToNoise"`        // 1-10
	HNSurvivability      float64 `json:"hnSurvivability"`      // 1-10
}

// EvalReport is the final output.
type EvalReport struct {
	RunAt           string          `json:"runAt"`
	Variants        []VariantOutput `json:"variants"`
	Ballots         []JudgeBallot   `json:"ballots"`
	Consensus       ConsensusResult `json:"consensus"`
	ConvergenceMap  []ClusterPoint  `json:"convergenceMap"`
	DivergenceNotes []string        `json:"divergenceNotes"`
}

// ConsensusResult aggregates votes.
type ConsensusResult struct {
	Winner        string                 `json:"winner"`
	MeanScores    map[string]float64     `json:"meanScores"`
	RankDistrib   map[string][]int       `json:"rankDistribution"` // variant -> [count_rank1, count_rank2, count_rank3]
	CriteriaMeans map[string]CriteriaSet `json:"criteriaMeans"`
	Agreement     float64                `json:"agreement"` // 0-1 (1 = all judges agree on ranking)
}

// ClusterPoint is a convergence/divergence observation.
type ClusterPoint struct {
	Criterion string   `json:"criterion"`
	Type      string   `json:"type"` // "convergence" or "divergence"
	Detail    string   `json:"detail"`
	Judges    []string `json:"judges"`
}

// ---------------------------------------------------------------------------
// API clients
// ---------------------------------------------------------------------------

type llmClient struct {
	name   string
	model  string
	apiKey string
	call   func(ctx context.Context, apiKey, model, prompt string) (string, error)
}

func anthropicCall(ctx context.Context, apiKey, model, prompt string) (string, error) {
	body := map[string]interface{}{
		"model":      model,
		"max_tokens": 4096,
		"messages": []map[string]string{
			{"role": "user", "content": prompt},
		},
	}
	data, err := json.Marshal(body)
	if err != nil {
		return "", err
	}
	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.anthropic.com/v1/messages", bytes.NewReader(data))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	respData, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	if resp.StatusCode != 200 {
		return "", fmt.Errorf("anthropic %d: %s", resp.StatusCode, string(respData))
	}
	var result struct {
		Content []struct {
			Text string `json:"text"`
		} `json:"content"`
	}
	if err := json.Unmarshal(respData, &result); err != nil {
		return "", err
	}
	if len(result.Content) == 0 {
		return "", fmt.Errorf("empty response from anthropic")
	}
	return result.Content[0].Text, nil
}

func geminiCall(ctx context.Context, apiKey, model, prompt string) (string, error) {
	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent", model)
	body := map[string]interface{}{
		"contents": []map[string]interface{}{
			{
				"parts": []map[string]string{
					{"text": prompt},
				},
			},
		},
		"generationConfig": map[string]interface{}{
			"maxOutputTokens": 4096,
		},
	}
	data, err := json.Marshal(body)
	if err != nil {
		return "", err
	}
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(data))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-goog-api-key", apiKey)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	respData, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	if resp.StatusCode != 200 {
		return "", fmt.Errorf("gemini %d: %s", resp.StatusCode, string(respData))
	}
	var result struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}
	if err := json.Unmarshal(respData, &result); err != nil {
		return "", err
	}
	if len(result.Candidates) == 0 || len(result.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("empty response from gemini")
	}
	return result.Candidates[0].Content.Parts[0].Text, nil
}

func openaiCall(ctx context.Context, apiKey, model, prompt string) (string, error) {
	body := map[string]interface{}{
		"model":      model,
		"max_tokens": 4096,
		"messages": []map[string]string{
			{"role": "user", "content": prompt},
		},
	}
	data, err := json.Marshal(body)
	if err != nil {
		return "", err
	}
	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.openai.com/v1/chat/completions", bytes.NewReader(data))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	respData, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	if resp.StatusCode != 200 {
		return "", fmt.Errorf("openai %d: %s", resp.StatusCode, string(respData))
	}
	var result struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.Unmarshal(respData, &result); err != nil {
		return "", err
	}
	if len(result.Choices) == 0 {
		return "", fmt.Errorf("empty response from openai")
	}
	return result.Choices[0].Message.Content, nil
}

// ---------------------------------------------------------------------------
// Phase 1: Generate
// ---------------------------------------------------------------------------

type promptSpec struct {
	variantID   string
	variantName string
	filename    string
	targetLLM   string // "anthropic", "openai", "gemini"
	model       string
}

var defaultPromptSpecs = []promptSpec{
	{"A", "Technical", "variant-a-technical.xml", "anthropic", "claude-sonnet-4-20250514"},
	{"B", "Narrative", "variant-b-narrative.xml", "openai", "gpt-4o"},
	{"C", "Provocative", "variant-c-provocative.xml", "gemini", "gemini-2.0-flash"},
}

func runGenerate(ctx context.Context, promptsDir string, clients map[string]*llmClient) ([]VariantOutput, error) {
	var variants []VariantOutput

	for _, spec := range defaultPromptSpecs {
		path := filepath.Join(promptsDir, spec.filename)
		promptData, err := os.ReadFile(path)
		if err != nil {
			return nil, fmt.Errorf("reading %s: %w", path, err)
		}

		client, ok := clients[spec.targetLLM]
		if !ok {
			fmt.Fprintf(os.Stderr, "  SKIP %s: no %s API key\n", spec.variantID, spec.targetLLM)
			continue
		}

		fmt.Fprintf(os.Stderr, "  [%s] generating via %s (%s)...", spec.variantID, client.name, client.model)

		start := time.Now()
		resp, err := client.call(ctx, client.apiKey, client.model, string(promptData))
		elapsed := time.Since(start)

		if err != nil {
			fmt.Fprintf(os.Stderr, " ERROR: %v\n", err)
			continue
		}

		fmt.Fprintf(os.Stderr, " OK (%s, %d chars)\n", elapsed.Round(time.Second), len(resp))

		variants = append(variants, VariantOutput{
			VariantID:   spec.variantID,
			VariantName: spec.variantName,
			Model:       client.model,
			RawResponse: resp,
			GeneratedAt: time.Now().UTC().Format(time.RFC3339),
		})
	}

	return variants, nil
}

// ---------------------------------------------------------------------------
// Phase 2: Judge
// ---------------------------------------------------------------------------

func buildJudgePrompt(variants []VariantOutput) string {
	var b strings.Builder
	b.WriteString(`You are an expert evaluator assessing HN Show HN post variants for a multi-agent AI debate arena.

You will be shown three variant outputs (A, B, C). Each variant was generated by a different LLM from a tailored prompt. Your job is to evaluate them as a Hacker News reader would.

Score each variant on six criteria (1-10 scale):
1. Technical credibility — does it demonstrate real engineering/research depth?
2. Specificity — are claims backed by concrete numbers and findings?
3. Engagement hook — would you click through? Would you read to the end?
4. Honesty about limitations — does it acknowledge what it can't claim?
5. Signal-to-noise — is every sentence doing work? No filler?
6. HN survivability — would this survive HN comments without getting torn apart?

Then rank the variants 1-3 (best to worst) and provide a rationale explaining your ranking.

IMPORTANT: Respond ONLY with valid JSON in this exact structure:
{
  "ranking": ["A", "B", "C"],
  "scores": [
    {"variantId": "A", "score": 7.5},
    {"variantId": "B", "score": 8.0},
    {"variantId": "C", "score": 6.5}
  ],
  "criteria": [
    {
      "variantId": "A",
      "technicalCredibility": 8,
      "specificity": 9,
      "engagementHook": 6,
      "honestyLimitations": 8,
      "signalToNoise": 7,
      "hnSurvivability": 8
    },
    {
      "variantId": "B",
      "technicalCredibility": 7,
      "specificity": 8,
      "engagementHook": 9,
      "honestyLimitations": 7,
      "signalToNoise": 8,
      "hnSurvivability": 7
    },
    {
      "variantId": "C",
      "technicalCredibility": 8,
      "specificity": 7,
      "engagementHook": 8,
      "honestyLimitations": 6,
      "signalToNoise": 6,
      "hnSurvivability": 7
    }
  ],
  "rationale": "Variant B leads because... Variant A is strong on... Variant C struggles with..."
}

Here are the three variants:

`)

	for _, v := range variants {
		fmt.Fprintf(&b, "=== VARIANT %s (%s) ===\n", v.VariantID, v.VariantName)
		fmt.Fprintf(&b, "Model: %s\n\n", v.Model)
		fmt.Fprintf(&b, "%s\n\n", v.RawResponse)
	}

	b.WriteString("Now evaluate. Respond with JSON only, no markdown fences.")
	return b.String()
}

func parseJudgeBallot(raw string, model string) (JudgeBallot, error) {
	// Strip markdown fences if present.
	cleaned := raw
	if idx := strings.Index(cleaned, "{"); idx >= 0 {
		cleaned = cleaned[idx:]
	}
	if idx := strings.LastIndex(cleaned, "}"); idx >= 0 {
		cleaned = cleaned[:idx+1]
	}

	var ballot JudgeBallot
	if err := json.Unmarshal([]byte(cleaned), &ballot); err != nil {
		return ballot, fmt.Errorf("parsing ballot from %s: %w\nraw: %s", model, err, raw[:min(len(raw), 500)])
	}
	ballot.JudgeModel = model
	ballot.JudgedAt = time.Now().UTC().Format(time.RFC3339)
	return ballot, nil
}

func runJudge(ctx context.Context, variants []VariantOutput, clients map[string]*llmClient) ([]JudgeBallot, error) {
	prompt := buildJudgePrompt(variants)
	var ballots []JudgeBallot

	// All available clients vote.
	judgeModels := []struct {
		key   string
		model string
	}{
		{"anthropic", "claude-sonnet-4-20250514"},
		{"openai", "gpt-4o"},
		{"gemini", "gemini-2.0-flash"},
	}

	firstCall := true
	for _, jm := range judgeModels {
		client, ok := clients[jm.key]
		if !ok {
			fmt.Fprintf(os.Stderr, "  SKIP judge %s: no API key\n", jm.key)
			continue
		}

		// Rate-limit delay between sequential LLM calls.
		if !firstCall {
			time.Sleep(2 * time.Second)
		}
		firstCall = false

		fmt.Fprintf(os.Stderr, "  [JUDGE] %s (%s)...", client.name, jm.model)

		start := time.Now()
		resp, err := client.call(ctx, client.apiKey, jm.model, prompt)
		elapsed := time.Since(start)

		if err != nil {
			fmt.Fprintf(os.Stderr, " ERROR: %v\n", err)
			continue
		}

		fmt.Fprintf(os.Stderr, " OK (%s)\n", elapsed.Round(time.Second))

		ballot, err := parseJudgeBallot(resp, jm.model)
		if err != nil {
			fmt.Fprintf(os.Stderr, "  WARN: %v\n", err)
			// Store raw as fallback.
			ballots = append(ballots, JudgeBallot{
				JudgeModel: jm.model,
				Rationale:  "PARSE_ERROR: " + resp,
				JudgedAt:   time.Now().UTC().Format(time.RFC3339),
			})
			continue
		}

		ballots = append(ballots, ballot)
	}

	return ballots, nil
}

// ---------------------------------------------------------------------------
// Phase 3: Cluster
// ---------------------------------------------------------------------------

func computeConsensus(ballots []JudgeBallot, variantIDs []string) ConsensusResult {
	meanScores := make(map[string]float64)
	scoreCounts := make(map[string]int)
	rankDistrib := make(map[string][]int)

	for _, vid := range variantIDs {
		rankDistrib[vid] = make([]int, len(variantIDs))
	}

	// Criteria accumulators.
	critSums := make(map[string]*CriteriaSet)
	critCounts := make(map[string]int)
	for _, vid := range variantIDs {
		critSums[vid] = &CriteriaSet{VariantID: vid}
	}

	knownVIDs := make(map[string]bool, len(variantIDs))
	for _, vid := range variantIDs {
		knownVIDs[vid] = true
	}

	for _, b := range ballots {
		// Scores — skip unknown variant IDs from LLM output.
		for _, s := range b.Scores {
			if !knownVIDs[s.VariantID] {
				continue
			}
			meanScores[s.VariantID] += s.Score
			scoreCounts[s.VariantID]++
		}
		// Ranking — skip unknown variant IDs to prevent nil map panic.
		for rank, vid := range b.Ranking {
			if rank < len(variantIDs) && knownVIDs[vid] {
				rankDistrib[vid][rank]++
			}
		}
		// Criteria.
		for _, c := range b.Criteria {
			cs := critSums[c.VariantID]
			if cs == nil {
				continue
			}
			cs.TechnicalCredibility += c.TechnicalCredibility
			cs.Specificity += c.Specificity
			cs.EngagementHook += c.EngagementHook
			cs.HonestyLimitations += c.HonestyLimitations
			cs.SignalToNoise += c.SignalToNoise
			cs.HNSurvivability += c.HNSurvivability
			critCounts[c.VariantID]++
		}
	}

	for vid, sum := range meanScores {
		if scoreCounts[vid] > 0 {
			meanScores[vid] = sum / float64(scoreCounts[vid])
		}
	}

	criteriaMeans := make(map[string]CriteriaSet)
	for vid, cs := range critSums {
		n := float64(critCounts[vid])
		if n == 0 {
			n = 1
		}
		criteriaMeans[vid] = CriteriaSet{
			VariantID:            vid,
			TechnicalCredibility: cs.TechnicalCredibility / n,
			Specificity:          cs.Specificity / n,
			EngagementHook:       cs.EngagementHook / n,
			HonestyLimitations:   cs.HonestyLimitations / n,
			SignalToNoise:        cs.SignalToNoise / n,
			HNSurvivability:      cs.HNSurvivability / n,
		}
	}

	// Winner = highest mean score.
	winner := ""
	bestScore := -1.0
	for vid, ms := range meanScores {
		if ms > bestScore {
			bestScore = ms
			winner = vid
		}
	}

	// Agreement = fraction of judges who ranked the winner first.
	agreement := 0.0
	if len(ballots) > 0 && winner != "" {
		firstVotes := 0
		for _, b := range ballots {
			if len(b.Ranking) > 0 && b.Ranking[0] == winner {
				firstVotes++
			}
		}
		agreement = float64(firstVotes) / float64(len(ballots))
	}

	return ConsensusResult{
		Winner:        winner,
		MeanScores:    meanScores,
		RankDistrib:   rankDistrib,
		CriteriaMeans: criteriaMeans,
		Agreement:     agreement,
	}
}

func clusterRationale(ballots []JudgeBallot, variantIDs []string) ([]ClusterPoint, []string) {
	var points []ClusterPoint
	var divergences []string

	criteria := []string{
		"TechnicalCredibility", "Specificity", "EngagementHook",
		"HonestyLimitations", "SignalToNoise", "HNSurvivability",
	}

	getCriterion := func(cs CriteriaSet, name string) float64 {
		switch name {
		case "TechnicalCredibility":
			return cs.TechnicalCredibility
		case "Specificity":
			return cs.Specificity
		case "EngagementHook":
			return cs.EngagementHook
		case "HonestyLimitations":
			return cs.HonestyLimitations
		case "SignalToNoise":
			return cs.SignalToNoise
		case "HNSurvivability":
			return cs.HNSurvivability
		}
		return 0
	}

	// For each criterion, for each variant, check if all judges agree (within 2 points)
	// or diverge (spread > 3 points).
	for _, crit := range criteria {
		for _, vid := range variantIDs {
			var scores []float64
			var judges []string
			for _, b := range ballots {
				for _, cs := range b.Criteria {
					if cs.VariantID == vid {
						scores = append(scores, getCriterion(cs, crit))
						judges = append(judges, b.JudgeModel)
					}
				}
			}
			if len(scores) < 2 {
				continue
			}

			minS, maxS := scores[0], scores[0]
			for _, s := range scores[1:] {
				if s < minS {
					minS = s
				}
				if s > maxS {
					maxS = s
				}
			}
			spread := maxS - minS

			meanS := 0.0
			for _, s := range scores {
				meanS += s
			}
			meanS /= float64(len(scores))

			if spread <= 2 {
				points = append(points, ClusterPoint{
					Criterion: crit,
					Type:      "convergence",
					Detail:    fmt.Sprintf("Variant %s: all judges agree on %s (mean %.1f, spread %.1f)", vid, crit, meanS, spread),
					Judges:    judges,
				})
			} else if spread > 3 {
				points = append(points, ClusterPoint{
					Criterion: crit,
					Type:      "divergence",
					Detail:    fmt.Sprintf("Variant %s: judges disagree on %s (range %.0f-%.0f, spread %.1f)", vid, crit, minS, maxS, spread),
					Judges:    judges,
				})
				divergences = append(divergences, fmt.Sprintf(
					"%s on %s: range %.0f-%.0f across %s",
					crit, vid, minS, maxS, strings.Join(judges, ", "),
				))
			}
		}
	}

	// Ranking convergence/divergence.
	if len(ballots) >= 2 {
		// Check if all judges agree on the winner.
		firstPicks := make(map[string][]string)
		for _, b := range ballots {
			if len(b.Ranking) > 0 {
				firstPicks[b.Ranking[0]] = append(firstPicks[b.Ranking[0]], b.JudgeModel)
			}
		}
		if len(firstPicks) == 1 {
			for vid, jj := range firstPicks {
				points = append(points, ClusterPoint{
					Criterion: "Ranking",
					Type:      "convergence",
					Detail:    fmt.Sprintf("Unanimous first pick: Variant %s", vid),
					Judges:    jj,
				})
			}
		} else {
			parts := make([]string, 0)
			for vid, jj := range firstPicks {
				parts = append(parts, fmt.Sprintf("%s picked by %s", vid, strings.Join(jj, ", ")))
			}
			sort.Strings(parts)
			divergences = append(divergences, "Split first pick: "+strings.Join(parts, "; "))
		}
	}

	return points, divergences
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

func emitReport(report EvalReport, jsonOutput bool) {
	if jsonOutput {
		data, err := json.MarshalIndent(report, "", "  ")
		if err != nil {
			fmt.Fprintf(os.Stderr, "error marshaling report: %v\n", err)
			os.Exit(1)
		}
		fmt.Println(string(data))
		return
	}

	var b strings.Builder

	b.WriteString("\n")
	b.WriteString(theme.Title.Render("evaluate — HN Variant Voting Results"))
	b.WriteString("\n\n")

	fmt.Fprintf(&b, "Run: %s\n", report.RunAt)
	fmt.Fprintf(&b, "Variants: %d | Judges: %d\n\n", len(report.Variants), len(report.Ballots))

	// Consensus.
	fmt.Fprintf(&b, "WINNER: Variant %s (mean score: %.2f, agreement: %.0f%%)\n\n",
		report.Consensus.Winner,
		report.Consensus.MeanScores[report.Consensus.Winner],
		report.Consensus.Agreement*100,
	)

	// Mean scores.
	b.WriteString("Mean Scores:\n")
	type scorePair struct {
		vid   string
		score float64
	}
	var pairs []scorePair
	for vid, s := range report.Consensus.MeanScores {
		pairs = append(pairs, scorePair{vid, s})
	}
	sort.Slice(pairs, func(i, j int) bool { return pairs[i].score > pairs[j].score })
	for _, p := range pairs {
		marker := "  "
		if p.vid == report.Consensus.Winner {
			marker = "* "
		}
		fmt.Fprintf(&b, "  %s%s: %.2f\n", marker, p.vid, p.score)
	}
	b.WriteString("\n")

	// Criteria means.
	b.WriteString("Criteria Means (per variant):\n")
	b.WriteString("  Variant | TechCred | Specific | Hook | Honesty | S/N  | HNSurv\n")
	b.WriteString("  --------|----------|----------|------|---------|------|-------\n")
	for _, vid := range []string{"A", "B", "C"} {
		cs, ok := report.Consensus.CriteriaMeans[vid]
		if !ok {
			continue
		}
		fmt.Fprintf(&b, "  %-7s | %6.1f   | %6.1f   | %4.1f | %5.1f   | %4.1f | %5.1f\n",
			vid, cs.TechnicalCredibility, cs.Specificity, cs.EngagementHook,
			cs.HonestyLimitations, cs.SignalToNoise, cs.HNSurvivability,
		)
	}
	b.WriteString("\n")

	// Per-judge ballots.
	b.WriteString("Per-Judge Rankings:\n")
	for _, ballot := range report.Ballots {
		fmt.Fprintf(&b, "  %s: %s\n", ballot.JudgeModel, strings.Join(ballot.Ranking, " > "))
	}
	b.WriteString("\n")

	// Convergence.
	convCount := 0
	divCount := 0
	for _, cp := range report.ConvergenceMap {
		if cp.Type == "convergence" {
			convCount++
		} else {
			divCount++
		}
	}
	fmt.Fprintf(&b, "Rationale Clustering: %d convergences, %d divergences\n\n", convCount, divCount)

	if len(report.DivergenceNotes) > 0 {
		b.WriteString("Divergence Notes:\n")
		for _, d := range report.DivergenceNotes {
			fmt.Fprintf(&b, "  - %s\n", d)
		}
		b.WriteString("\n")
	}

	// Judge rationales.
	b.WriteString("Judge Rationales:\n")
	for _, ballot := range report.Ballots {
		fmt.Fprintf(&b, "\n  [%s]\n", ballot.JudgeModel)
		if ballot.Rationale != "" {
			for _, line := range strings.Split(ballot.Rationale, "\n") {
				fmt.Fprintf(&b, "    %s\n", line)
			}
		}
	}
	b.WriteString("\n")

	fmt.Print(b.String())
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

func main() {
	phaseFlag := flag.String("phase", "all", "Phase to run: generate, judge, all")
	promptsFlag := flag.String("prompts", "../docs/research-prompts/", "Directory containing XML prompt files")
	variantsFlag := flag.String("variants", "", "JSON file with pre-generated variants (skips generate phase)")
	outputFlag := flag.String("output", "results/evaluate/", "Output directory for results")
	jsonFlag := flag.Bool("json", false, "Emit JSON instead of human-readable report")
	timeoutFlag := flag.Int("timeout", 15, "Timeout in minutes for the full pipeline")
	flag.Parse()

	phase := strings.ToLower(*phaseFlag)
	if phase != "generate" && phase != "judge" && phase != "all" {
		fmt.Fprintf(os.Stderr, "error: --phase must be generate, judge, or all\n")
		os.Exit(1)
	}

	// Load API keys.
	cfg, _ := config.Load("")
	getKey := func(envName string) string {
		if v := os.Getenv(envName); v != "" {
			return v
		}
		if cfg != nil {
			return cfg.Vars[envName]
		}
		return ""
	}

	clients := make(map[string]*llmClient)
	if key := getKey("ANTHROPIC_API_KEY"); key != "" {
		clients["anthropic"] = &llmClient{name: "Anthropic", model: "claude-sonnet-4-20250514", apiKey: key, call: anthropicCall}
	}
	if key := getKey("OPENAI_API_KEY"); key != "" {
		clients["openai"] = &llmClient{name: "OpenAI", model: "gpt-4o", apiKey: key, call: openaiCall}
	}
	if key := getKey("GEMINI_API_KEY"); key != "" {
		clients["gemini"] = &llmClient{name: "Gemini", model: "gemini-2.0-flash", apiKey: key, call: geminiCall}
	}

	if len(clients) == 0 {
		fmt.Fprintf(os.Stderr, "error: no API keys found. Set ANTHROPIC_API_KEY, OPENAI_API_KEY, and/or GEMINI_API_KEY\n")
		os.Exit(1)
	}

	if !*jsonFlag {
		fmt.Fprintf(os.Stderr, "\n%s\n\n", theme.Title.Render("evaluate — HN Variant Voting Engine"))
		fmt.Fprintf(os.Stderr, "  API clients: ")
		names := make([]string, 0, len(clients))
		for _, c := range clients {
			names = append(names, c.name)
		}
		sort.Strings(names)
		fmt.Fprintf(os.Stderr, "%s\n", strings.Join(names, ", "))
	}

	// Resolve prompts directory — try flag value, then repo-root-relative paths.
	promptsDir := *promptsFlag
	if _, err := os.Stat(promptsDir); err != nil {
		// Try from repo root (running from pitstorm/ or repo root).
		alternatives := []string{
			"docs/research-prompts/",
			"../docs/research-prompts/",
		}
		for _, alt := range alternatives {
			if _, err := os.Stat(alt); err == nil {
				promptsDir = alt
				break
			}
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(*timeoutFlag)*time.Minute)
	defer cancel()

	var variants []VariantOutput
	var ballots []JudgeBallot

	// Phase 1: Generate.
	if phase == "generate" || phase == "all" {
		if *variantsFlag != "" {
			// Load pre-generated variants.
			data, err := os.ReadFile(*variantsFlag)
			if err != nil {
				fmt.Fprintf(os.Stderr, "error reading variants: %v\n", err)
				os.Exit(1)
			}
			if err := json.Unmarshal(data, &variants); err != nil {
				fmt.Fprintf(os.Stderr, "error parsing variants: %v\n", err)
				os.Exit(1)
			}
			if !*jsonFlag {
				fmt.Fprintf(os.Stderr, "  Loaded %d pre-generated variants\n", len(variants))
			}
		} else {
			if !*jsonFlag {
				fmt.Fprintf(os.Stderr, "\n  Phase 1: Generate\n")
			}
			var err error
			variants, err = runGenerate(ctx, promptsDir, clients)
			if err != nil {
				fmt.Fprintf(os.Stderr, "error generating: %v\n", err)
				os.Exit(1)
			}
		}

		// Save variants.
		if err := os.MkdirAll(*outputFlag, 0o755); err != nil {
			fmt.Fprintf(os.Stderr, "error creating output dir: %v\n", err)
			os.Exit(1)
		}
		varFile := filepath.Join(*outputFlag, "variants.json")
		data, _ := json.MarshalIndent(variants, "", "  ")
		if err := os.WriteFile(varFile, data, 0o644); err != nil {
			fmt.Fprintf(os.Stderr, "warning: could not save variants: %v\n", err)
		} else if !*jsonFlag {
			fmt.Fprintf(os.Stderr, "  Saved %d variants to %s\n", len(variants), varFile)
		}
	}

	// If judge-only, load variants from file.
	if phase == "judge" {
		if *variantsFlag == "" {
			*variantsFlag = filepath.Join(*outputFlag, "variants.json")
		}
		data, err := os.ReadFile(*variantsFlag)
		if err != nil {
			fmt.Fprintf(os.Stderr, "error reading variants for judging: %v\n", err)
			os.Exit(1)
		}
		if err := json.Unmarshal(data, &variants); err != nil {
			fmt.Fprintf(os.Stderr, "error parsing variants: %v\n", err)
			os.Exit(1)
		}
		if !*jsonFlag {
			fmt.Fprintf(os.Stderr, "  Loaded %d variants for judging\n", len(variants))
		}
	}

	// Phase 2: Judge.
	if (phase == "judge" || phase == "all") && len(variants) > 0 {
		if !*jsonFlag {
			fmt.Fprintf(os.Stderr, "\n  Phase 2: Judge\n")
		}
		var err error
		ballots, err = runJudge(ctx, variants, clients)
		if err != nil {
			fmt.Fprintf(os.Stderr, "error judging: %v\n", err)
			os.Exit(1)
		}
	}

	if len(variants) == 0 {
		fmt.Fprintf(os.Stderr, "error: no variants to evaluate\n")
		os.Exit(1)
	}

	// Phase 3: Cluster.
	variantIDs := make([]string, len(variants))
	for i, v := range variants {
		variantIDs[i] = v.VariantID
	}

	consensus := computeConsensus(ballots, variantIDs)
	convergenceMap, divergenceNotes := clusterRationale(ballots, variantIDs)

	report := EvalReport{
		RunAt:           time.Now().UTC().Format(time.RFC3339),
		Variants:        variants,
		Ballots:         ballots,
		Consensus:       consensus,
		ConvergenceMap:  convergenceMap,
		DivergenceNotes: divergenceNotes,
	}

	// Save full report.
	if err := os.MkdirAll(*outputFlag, 0o755); err == nil {
		reportFile := filepath.Join(*outputFlag, "report.json")
		data, _ := json.MarshalIndent(report, "", "  ")
		if err := os.WriteFile(reportFile, data, 0o644); err == nil && !*jsonFlag {
			fmt.Fprintf(os.Stderr, "\n  Full report saved to %s\n", reportFile)
		}
	}

	emitReport(report, *jsonFlag)
}
