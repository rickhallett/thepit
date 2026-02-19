// analyze — compute pre-registered metrics for hypothesis research.
//
// Each hypothesis defines a set of automated metrics computed from bout
// transcripts in the database. This tool queries the bouts, computes the
// metrics, and emits a JSON or human-readable report.
//
// Usage:
//
//	go run ./cmd/analyze --phase H2
//	go run ./cmd/analyze --phase H2 --json > h2-metrics.json
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"math/rand/v2"
	"os"
	"sort"
	"strings"
	"time"
	"unicode"

	"github.com/rickhallett/thepit/shared/config"
	"github.com/rickhallett/thepit/shared/db"
	"github.com/rickhallett/thepit/shared/theme"
)

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// TranscriptEntry mirrors the JSONB array element in bouts.transcript.
type TranscriptEntry struct {
	Turn      int    `json:"turn"`
	AgentID   string `json:"agentId"`
	AgentName string `json:"agentName"`
	Text      string `json:"text"`
}

type boutRow struct {
	ID         string
	PresetID   string
	Transcript []TranscriptEntry
}

type presetConfig struct {
	AgentCount   int
	TurnsPerBout int
}

type positionMetrics struct {
	CharCounts        []float64
	NoveltyRates      []float64
	AnchoringScores   []float64
	QuestionDensities []float64
}

// --- Output types (JSON-serializable) ---

type PositionSummary struct {
	Position          int    `json:"position"`
	Label             string `json:"label"`
	N                 int    `json:"n"`
	M1CharCount       MeanSD `json:"m1_charCount"`
	M2NoveltyRate     MeanSD `json:"m2_noveltyRate"`
	M3AnchoringScore  MeanSD `json:"m3_anchoringScore"`
	M4QuestionDensity MeanSD `json:"m4_questionDensity"`
}

type MeanSD struct {
	Mean float64 `json:"mean"`
	SD   float64 `json:"sd"`
}

type EffectSizes struct {
	M1CharCountD       float64 `json:"m1_charCount_d"`
	M2NoveltyRateD     float64 `json:"m2_noveltyRate_d"`
	M3AnchoringScoreD  float64 `json:"m3_anchoringScore_d"`
	M4QuestionDensityD float64 `json:"m4_questionDensity_d"`
}

type PermutationResults struct {
	M1P        float64 `json:"m1_p"`
	M2P        float64 `json:"m2_p"`
	M3P        float64 `json:"m3_p"`
	M4P        float64 `json:"m4_p"`
	Iterations int     `json:"iterations"`
}

type AgentSummary struct {
	AgentID            string  `json:"agentId"`
	AgentName          string  `json:"agentName"`
	Position           int     `json:"position"`
	Turns              int     `json:"turns"`
	AvgChars           float64 `json:"avgChars"`
	AvgNovelty         float64 `json:"avgNovelty"`
	AvgAnchoring       float64 `json:"avgAnchoring"`
	AvgQuestionDensity float64 `json:"avgQuestionDensity"`
}

type PresetResult struct {
	PresetID         string             `json:"presetId"`
	AgentCount       int                `json:"agentCount"`
	BoutCount        int                `json:"boutCount"`
	TotalTurns       int                `json:"totalTurns"`
	Positions        []PositionSummary  `json:"positions"`
	EffectSizes      EffectSizes        `json:"effectSizes"`
	PermutationTests PermutationResults `json:"permutationTests"`
	PerAgent         []AgentSummary     `json:"perAgent"`
}

type AnalysisReport struct {
	Hypothesis   string         `json:"hypothesis"`
	RunAt        string         `json:"runAt"`
	Presets      []PresetResult `json:"presets"`
	Decision     string         `json:"decision"`
	ThresholdHit string         `json:"thresholdHit"` // "null", "clear", "ambiguous"
}

// ---------------------------------------------------------------------------
// Stopwords
// ---------------------------------------------------------------------------

var stopwords = map[string]bool{
	"the": true, "be": true, "to": true, "of": true, "and": true,
	"a": true, "in": true, "that": true, "have": true, "i": true,
	"it": true, "for": true, "not": true, "on": true, "with": true,
	"he": true, "as": true, "you": true, "do": true, "at": true,
	"this": true, "but": true, "his": true, "by": true, "from": true,
	"they": true, "we": true, "say": true, "her": true, "she": true,
	"or": true, "an": true, "will": true, "my": true, "one": true,
	"all": true, "would": true, "there": true, "their": true,
	"what": true, "so": true, "up": true, "out": true, "if": true,
	"about": true, "who": true, "get": true, "which": true, "go": true,
	"me": true, "when": true, "make": true, "can": true, "like": true,
	"time": true, "no": true, "just": true, "him": true,
	"know": true, "take": true, "people": true, "into": true,
	"year": true, "your": true, "good": true, "some": true,
	"could": true, "them": true, "see": true, "other": true,
	"than": true, "then": true, "now": true, "look": true,
	"only": true, "come": true, "its": true, "over": true,
	"think": true, "also": true, "back": true, "after": true,
	"use": true, "two": true, "how": true, "our": true, "work": true,
	"first": true, "well": true, "way": true, "even": true,
	"new": true, "want": true, "because": true, "any": true,
	"these": true, "give": true, "day": true, "most": true, "us": true,
	"is": true, "are": true, "was": true, "were": true, "been": true,
	"being": true, "has": true, "had": true, "having": true,
	"does": true, "did": true, "doing": true, "am": true,
	"more": true, "very": true, "much": true, "too": true, "own": true,
	"same": true, "should": true, "must": true, "may": true,
	"might": true, "shall": true, "need": true,
	// debate-common
	"argue": true, "argument": true, "point": true, "believe": true,
	"question": true, "answer": true, "yet": true, "still": true,
	"however": true, "rather": true, "indeed": true, "perhaps": true,
	"simply": true, "though": true, "while": true, "where": true,
	"here": true, "through": true, "between": true, "both": true,
	"each": true, "those": true, "such": true, "many": true,
	"before": true, "down": true, "don": true,
	"t": true, "s": true, "re": true, "ve": true, "ll": true,
	"d": true, "m": true,
}

// ---------------------------------------------------------------------------
// Math helpers
// ---------------------------------------------------------------------------

func mean(vals []float64) float64 {
	if len(vals) == 0 {
		return 0
	}
	var sum float64
	for _, v := range vals {
		sum += v
	}
	return sum / float64(len(vals))
}

func stddev(vals []float64) float64 {
	if len(vals) < 2 {
		return 0
	}
	m := mean(vals)
	var ss float64
	for _, v := range vals {
		ss += (v - m) * (v - m)
	}
	return math.Sqrt(ss / float64(len(vals)-1))
}

func cohensD(g1, g2 []float64) float64 {
	m1, m2 := mean(g1), mean(g2)
	s1, s2 := stddev(g1), stddev(g2)
	n1, n2 := float64(len(g1)), float64(len(g2))
	pooled := math.Sqrt(((n1-1)*s1*s1 + (n2-1)*s2*s2) / (n1 + n2 - 2))
	if pooled == 0 {
		return 0
	}
	return (m1 - m2) / pooled
}

func ordinal(n int) string {
	suffixes := []string{"th", "st", "nd", "rd"}
	v := n % 100
	idx := v - 20
	if idx < 0 {
		idx = v
	} else {
		idx = idx % 10
	}
	if idx < 0 || idx >= len(suffixes) {
		idx = 0
	}
	return fmt.Sprintf("%d%s", n, suffixes[idx])
}

// ---------------------------------------------------------------------------
// Tokenisation
// ---------------------------------------------------------------------------

func tokenize(text string) []string {
	lower := strings.ToLower(text)
	var tokens []string
	var buf strings.Builder
	for _, r := range lower {
		if unicode.IsLetter(r) || unicode.IsDigit(r) || r == '\'' || r == '-' {
			buf.WriteRune(r)
		} else {
			if buf.Len() > 1 {
				tokens = append(tokens, buf.String())
			}
			buf.Reset()
		}
	}
	if buf.Len() > 1 {
		tokens = append(tokens, buf.String())
	}
	return tokens
}

func nonStopWords(text string) []string {
	var out []string
	for _, w := range tokenize(text) {
		if !stopwords[w] {
			out = append(out, w)
		}
	}
	return out
}

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

// M1: character count
func computeM1(text string) float64 {
	return float64(len(text))
}

// M2: novel vocabulary rate (fraction of words not in any prior turn)
func computeM2(text string, priorTexts []string) float64 {
	words := tokenize(text)
	if len(words) == 0 {
		return 0
	}
	priorVocab := make(map[string]bool)
	for _, pt := range priorTexts {
		for _, w := range tokenize(pt) {
			priorVocab[w] = true
		}
	}
	novel := 0
	for _, w := range words {
		if !priorVocab[w] {
			novel++
		}
	}
	return float64(novel) / float64(len(words))
}

// M3: lexical anchoring (how many of turn 1's distinctive words appear)
func computeM3(text string, anchorWords []string) float64 {
	if len(anchorWords) == 0 {
		return 0
	}
	turnWords := make(map[string]bool)
	for _, w := range tokenize(text) {
		turnWords[w] = true
	}
	matches := 0
	for _, w := range anchorWords {
		if turnWords[w] {
			matches++
		}
	}
	return float64(matches) / float64(len(anchorWords))
}

// extractAnchorWords returns the top-20 distinctive (non-stopword) words from text.
func extractAnchorWords(text string) []string {
	words := nonStopWords(text)
	freq := make(map[string]int)
	for _, w := range words {
		freq[w]++
	}
	type wf struct {
		word string
		freq int
	}
	var sorted []wf
	for w, f := range freq {
		sorted = append(sorted, wf{w, f})
	}
	sort.Slice(sorted, func(i, j int) bool { return sorted[i].freq > sorted[j].freq })
	n := 20
	if len(sorted) < n {
		n = len(sorted)
	}
	out := make([]string, n)
	for i := 0; i < n; i++ {
		out[i] = sorted[i].word
	}
	return out
}

// M4: question density (? count / char count * 100)
func computeM4(text string) float64 {
	if len(text) == 0 {
		return 0
	}
	qCount := strings.Count(text, "?")
	return float64(qCount) / float64(len(text)) * 100
}

// ---------------------------------------------------------------------------
// Permutation test
// ---------------------------------------------------------------------------

type taggedValue struct {
	Position  int
	Value     float64
	BoutIndex int
}

func permutationTest(data []taggedValue, firstPos, lastPos, iterations int) float64 {
	var first, last []float64
	for _, d := range data {
		if d.Position == firstPos {
			first = append(first, d.Value)
		}
		if d.Position == lastPos {
			last = append(last, d.Value)
		}
	}
	if len(first) == 0 || len(last) == 0 {
		return 1.0
	}
	observedD := math.Abs(cohensD(first, last))

	// Group by bout for within-bout shuffling.
	boutGroups := make(map[int][]taggedValue)
	for _, d := range data {
		boutGroups[d.BoutIndex] = append(boutGroups[d.BoutIndex], d)
	}

	extremeCount := 0
	for iter := 0; iter < iterations; iter++ {
		var shuffFirst, shuffLast []float64

		for _, group := range boutGroups {
			// Shuffle position labels within bout.
			positions := make([]int, len(group))
			for i, d := range group {
				positions[i] = d.Position
			}
			rand.Shuffle(len(positions), func(i, j int) {
				positions[i], positions[j] = positions[j], positions[i]
			})
			for i, d := range group {
				if positions[i] == firstPos {
					shuffFirst = append(shuffFirst, d.Value)
				}
				if positions[i] == lastPos {
					shuffLast = append(shuffLast, d.Value)
				}
			}
		}

		if len(shuffFirst) > 0 && len(shuffLast) > 0 {
			permD := math.Abs(cohensD(shuffFirst, shuffLast))
			if permD >= observedD {
				extremeCount++
			}
		}
	}

	return float64(extremeCount) / float64(iterations)
}

// ---------------------------------------------------------------------------
// Analysis pipeline
// ---------------------------------------------------------------------------

func analyzeBouts(bouts []boutRow, presetID string, cfg presetConfig) PresetResult {
	agentCount := cfg.AgentCount

	// Per-position accumulators.
	posData := make(map[int]*positionMetrics)
	for p := 0; p < agentCount; p++ {
		posData[p] = &positionMetrics{}
	}

	// Per-agent accumulators.
	type agentAccum struct {
		AgentID         string
		AgentName       string
		Position        int
		Chars           []float64
		Novelty         []float64
		Anchoring       []float64
		QuestionDensity []float64
	}
	agentMap := make(map[string]*agentAccum)

	// Tagged data for permutation tests.
	var m1Data, m2Data, m3Data, m4Data []taggedValue

	for boutIdx, bout := range bouts {
		transcript := bout.Transcript

		// Extract anchor words from turn 0.
		var anchorWords []string
		if len(transcript) > 0 {
			anchorWords = extractAnchorWords(transcript[0].Text)
		}

		for turnIdx, entry := range transcript {
			posInRound := turnIdx % agentCount

			m1 := computeM1(entry.Text)

			priorTexts := make([]string, turnIdx)
			for i := 0; i < turnIdx; i++ {
				priorTexts[i] = transcript[i].Text
			}
			m2 := computeM2(entry.Text, priorTexts)

			var m3 float64
			if turnIdx == 0 {
				m3 = 1.0
			} else {
				m3 = computeM3(entry.Text, anchorWords)
			}

			m4 := computeM4(entry.Text)

			// Accumulate per-position.
			pos := posData[posInRound]
			pos.CharCounts = append(pos.CharCounts, m1)
			pos.NoveltyRates = append(pos.NoveltyRates, m2)
			pos.AnchoringScores = append(pos.AnchoringScores, m3)
			pos.QuestionDensities = append(pos.QuestionDensities, m4)

			// Accumulate per-agent.
			if _, ok := agentMap[entry.AgentID]; !ok {
				agentMap[entry.AgentID] = &agentAccum{
					AgentID:   entry.AgentID,
					AgentName: entry.AgentName,
					Position:  posInRound,
				}
			}
			aa := agentMap[entry.AgentID]
			aa.Chars = append(aa.Chars, m1)
			aa.Novelty = append(aa.Novelty, m2)
			aa.Anchoring = append(aa.Anchoring, m3)
			aa.QuestionDensity = append(aa.QuestionDensity, m4)

			// Tag for permutation tests.
			tv := taggedValue{Position: posInRound, BoutIndex: boutIdx}
			tv.Value = m1
			m1Data = append(m1Data, tv)
			tv.Value = m2
			m2Data = append(m2Data, tv)
			tv.Value = m3
			m3Data = append(m3Data, tv)
			tv.Value = m4
			m4Data = append(m4Data, tv)
		}
	}

	// Build position summaries.
	positions := make([]PositionSummary, agentCount)
	for p := 0; p < agentCount; p++ {
		pd := posData[p]
		positions[p] = PositionSummary{
			Position:          p,
			Label:             ordinal(p + 1),
			N:                 len(pd.CharCounts),
			M1CharCount:       MeanSD{mean(pd.CharCounts), stddev(pd.CharCounts)},
			M2NoveltyRate:     MeanSD{mean(pd.NoveltyRates), stddev(pd.NoveltyRates)},
			M3AnchoringScore:  MeanSD{mean(pd.AnchoringScores), stddev(pd.AnchoringScores)},
			M4QuestionDensity: MeanSD{mean(pd.QuestionDensities), stddev(pd.QuestionDensities)},
		}
	}

	// Effect sizes: position 0 (first) vs position N-1 (last).
	firstPD := posData[0]
	lastPD := posData[agentCount-1]
	effectSizes := EffectSizes{
		M1CharCountD:       cohensD(firstPD.CharCounts, lastPD.CharCounts),
		M2NoveltyRateD:     cohensD(firstPD.NoveltyRates, lastPD.NoveltyRates),
		M3AnchoringScoreD:  cohensD(firstPD.AnchoringScores, lastPD.AnchoringScores),
		M4QuestionDensityD: cohensD(firstPD.QuestionDensities, lastPD.QuestionDensities),
	}

	// Permutation tests (10,000 iterations).
	const permIters = 10_000
	permTests := PermutationResults{
		M1P:        permutationTest(m1Data, 0, agentCount-1, permIters),
		M2P:        permutationTest(m2Data, 0, agentCount-1, permIters),
		M3P:        permutationTest(m3Data, 0, agentCount-1, permIters),
		M4P:        permutationTest(m4Data, 0, agentCount-1, permIters),
		Iterations: permIters,
	}

	// Per-agent summaries.
	var perAgent []AgentSummary
	for _, aa := range agentMap {
		perAgent = append(perAgent, AgentSummary{
			AgentID:            aa.AgentID,
			AgentName:          aa.AgentName,
			Position:           aa.Position,
			Turns:              len(aa.Chars),
			AvgChars:           mean(aa.Chars),
			AvgNovelty:         mean(aa.Novelty),
			AvgAnchoring:       mean(aa.Anchoring),
			AvgQuestionDensity: mean(aa.QuestionDensity),
		})
	}
	sort.Slice(perAgent, func(i, j int) bool { return perAgent[i].Position < perAgent[j].Position })

	totalTurns := 0
	for _, b := range bouts {
		totalTurns += len(b.Transcript)
	}

	return PresetResult{
		PresetID:         presetID,
		AgentCount:       agentCount,
		BoutCount:        len(bouts),
		TotalTurns:       totalTurns,
		Positions:        positions,
		EffectSizes:      effectSizes,
		PermutationTests: permTests,
		PerAgent:         perAgent,
	}
}

func classifyResult(presets []PresetResult) (decision, thresholdHit string) {
	maxD := 0.0
	anyAbove015 := false

	for _, p := range presets {
		ds := []float64{
			math.Abs(p.EffectSizes.M1CharCountD),
			math.Abs(p.EffectSizes.M2NoveltyRateD),
			math.Abs(p.EffectSizes.M3AnchoringScoreD),
			math.Abs(p.EffectSizes.M4QuestionDensityD),
		}
		for _, d := range ds {
			if d > maxD {
				maxD = d
			}
			if d >= 0.15 {
				anyAbove015 = true
			}
		}
	}

	if maxD >= 0.30 {
		return fmt.Sprintf("Clear result: max |d| = %.3f >= 0.30. No LLM judge needed.", maxD), "clear"
	}
	if !anyAbove015 {
		return fmt.Sprintf("Null result: all |d| < 0.15 (max = %.3f). No detectable position effect.", maxD), "null"
	}
	return fmt.Sprintf("Ambiguous: max |d| = %.3f (0.15 <= d < 0.30). LLM judge should be invoked.", maxD), "ambiguous"
}

// ---------------------------------------------------------------------------
// Report formatting (text)
// ---------------------------------------------------------------------------

func formatReport(report AnalysisReport) string {
	var b strings.Builder

	b.WriteString("# H2 Analysis: Position Advantage (Turn Order Effects)\n\n")
	fmt.Fprintf(&b, "Run: %s\n", report.RunAt)
	fmt.Fprintf(&b, "Decision: %s\n", report.Decision)
	fmt.Fprintf(&b, "Threshold: %s\n\n", report.ThresholdHit)

	for _, p := range report.Presets {
		fmt.Fprintf(&b, "## %s (%d agents, %d bouts, %d turns)\n\n", p.PresetID, p.AgentCount, p.BoutCount, p.TotalTurns)

		b.WriteString("### Metrics by Position\n\n")
		b.WriteString("| Position | n | M1 Chars (mean +/- SD) | M2 Novelty (mean +/- SD) | M3 Anchoring (mean +/- SD) | M4 Questions (mean +/- SD) |\n")
		b.WriteString("|----------|---|----------------------|------------------------|--------------------------|---------------------------|\n")
		for _, pos := range p.Positions {
			fmt.Fprintf(&b, "| %s | %d | %.0f +/- %.0f | %.3f +/- %.3f | %.3f +/- %.3f | %.3f +/- %.3f |\n",
				pos.Label, pos.N,
				pos.M1CharCount.Mean, pos.M1CharCount.SD,
				pos.M2NoveltyRate.Mean, pos.M2NoveltyRate.SD,
				pos.M3AnchoringScore.Mean, pos.M3AnchoringScore.SD,
				pos.M4QuestionDensity.Mean, pos.M4QuestionDensity.SD,
			)
		}
		b.WriteString("\n")

		b.WriteString("### Effect Sizes (1st vs Last, Cohen's d)\n\n")
		b.WriteString("| Metric | d | |d| | Interpretation |\n")
		b.WriteString("|--------|------|------|----------------|\n")
		for _, row := range []struct {
			label string
			d     float64
		}{
			{"M1 Char Count", p.EffectSizes.M1CharCountD},
			{"M2 Novelty Rate", p.EffectSizes.M2NoveltyRateD},
			{"M3 Anchoring", p.EffectSizes.M3AnchoringScoreD},
			{"M4 Question Density", p.EffectSizes.M4QuestionDensityD},
		} {
			absD := math.Abs(row.d)
			interp := "null"
			if absD >= 0.30 {
				interp = "CLEAR"
			} else if absD >= 0.15 {
				interp = "AMBIGUOUS"
			}
			fmt.Fprintf(&b, "| %s | %.3f | %.3f | %s |\n", row.label, row.d, absD, interp)
		}
		b.WriteString("\n")

		b.WriteString("### Permutation Tests (10,000 iterations)\n\n")
		b.WriteString("| Metric | p-value |\n")
		b.WriteString("|--------|--------|\n")
		fmt.Fprintf(&b, "| M1 Char Count | %.4f |\n", p.PermutationTests.M1P)
		fmt.Fprintf(&b, "| M2 Novelty Rate | %.4f |\n", p.PermutationTests.M2P)
		fmt.Fprintf(&b, "| M3 Anchoring | %.4f |\n", p.PermutationTests.M3P)
		fmt.Fprintf(&b, "| M4 Question Density | %.4f |\n", p.PermutationTests.M4P)
		b.WriteString("\n")

		b.WriteString("### Per-Agent Summary\n\n")
		b.WriteString("| Agent | Position | Turns | Avg Chars | Avg Novelty | Avg Anchoring | Avg Question % |\n")
		b.WriteString("|-------|----------|-------|-----------|-------------|---------------|----------------|\n")
		for _, a := range p.PerAgent {
			fmt.Fprintf(&b, "| %s | %s | %d | %.0f | %.3f | %.3f | %.3f |\n",
				a.AgentName, ordinal(a.Position+1), a.Turns,
				a.AvgChars, a.AvgNovelty, a.AvgAnchoring, a.AvgQuestionDensity,
			)
		}
		b.WriteString("\n")
	}

	return b.String()
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

func main() {
	phase := ""
	jsonOutput := false

	for i := 1; i < len(os.Args); i++ {
		switch os.Args[i] {
		case "--phase":
			i++
			if i < len(os.Args) {
				phase = os.Args[i]
			}
		case "--json":
			jsonOutput = true
		case "--help", "-h":
			fmt.Println("Usage: go run ./cmd/analyze --phase H2 [--json]")
			return
		}
	}

	if phase == "" {
		fmt.Fprintf(os.Stderr, "error: --phase required (e.g. --phase H2)\n")
		os.Exit(1)
	}
	if strings.ToUpper(phase) != "H2" {
		fmt.Fprintf(os.Stderr, "error: only H2 is implemented so far\n")
		os.Exit(1)
	}

	// Load config (DATABASE_URL from .env).
	cfg, err := config.Load("")
	if err != nil {
		fmt.Fprintf(os.Stderr, "error loading config: %v\n", err)
		os.Exit(1)
	}
	dbURL := cfg.Vars["DATABASE_URL"]
	if dbURL == "" {
		dbURL = os.Getenv("DATABASE_URL")
	}
	if dbURL == "" {
		fmt.Fprintf(os.Stderr, "error: DATABASE_URL not set\n")
		os.Exit(1)
	}

	conn, err := db.Connect(dbURL)
	if err != nil {
		fmt.Fprintf(os.Stderr, "error connecting to database: %v\n", err)
		os.Exit(1)
	}
	defer conn.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	if !jsonOutput {
		fmt.Fprintf(os.Stderr, "\n%s\n\n", theme.Title.Render("analyze — H2 Position Advantage"))
	}

	// H2 preset configs.
	presets := map[string]presetConfig{
		"last-supper": {AgentCount: 4, TurnsPerBout: 12},
		"summit":      {AgentCount: 6, TurnsPerBout: 12},
	}

	// Query bouts.
	rows, err := conn.DB.QueryContext(ctx, `
		SELECT id, preset_id, transcript
		FROM bouts
		WHERE preset_id IN ('last-supper', 'summit')
		  AND status = 'completed'
		ORDER BY created_at ASC
	`)
	if err != nil {
		fmt.Fprintf(os.Stderr, "error querying bouts: %v\n", err)
		os.Exit(1)
	}
	defer rows.Close()

	boutsByPreset := make(map[string][]boutRow)
	for rows.Next() {
		var id, presetID, transcriptJSON string
		if err := rows.Scan(&id, &presetID, &transcriptJSON); err != nil {
			fmt.Fprintf(os.Stderr, "error scanning row: %v\n", err)
			os.Exit(1)
		}

		var transcript []TranscriptEntry
		if err := json.Unmarshal([]byte(transcriptJSON), &transcript); err != nil {
			fmt.Fprintf(os.Stderr, "error parsing transcript for bout %s: %v\n", id, err)
			continue
		}

		boutsByPreset[presetID] = append(boutsByPreset[presetID], boutRow{
			ID:         id,
			PresetID:   presetID,
			Transcript: transcript,
		})
	}
	if err := rows.Err(); err != nil {
		fmt.Fprintf(os.Stderr, "error iterating rows: %v\n", err)
		os.Exit(1)
	}

	totalBouts := 0
	for k, v := range boutsByPreset {
		totalBouts += len(v)
		if !jsonOutput {
			fmt.Fprintf(os.Stderr, "  %s: %d bouts\n", k, len(v))
		}
	}

	if totalBouts == 0 {
		fmt.Fprintf(os.Stderr, "\nNo completed H2 bouts found. Run H2 first:\n")
		fmt.Fprintf(os.Stderr, "  cd pitstorm && go run ./cmd/hypothesis --phase H2 --target https://www.thepit.cloud\n\n")
		os.Exit(1)
	}

	// Analyze each preset.
	var presetResults []PresetResult
	for presetID, bouts := range boutsByPreset {
		cfg, ok := presets[presetID]
		if !ok {
			continue
		}
		if !jsonOutput {
			fmt.Fprintf(os.Stderr, "  analyzing %s (%d bouts)...\n", presetID, len(bouts))
		}
		presetResults = append(presetResults, analyzeBouts(bouts, presetID, cfg))
	}

	// Sort presets deterministically (last-supper before summit).
	sort.Slice(presetResults, func(i, j int) bool {
		return presetResults[i].PresetID < presetResults[j].PresetID
	})

	decision, thresholdHit := classifyResult(presetResults)

	report := AnalysisReport{
		Hypothesis:   "H2",
		RunAt:        time.Now().UTC().Format(time.RFC3339),
		Presets:      presetResults,
		Decision:     decision,
		ThresholdHit: thresholdHit,
	}

	if jsonOutput {
		data, _ := json.MarshalIndent(report, "", "  ")
		fmt.Println(string(data))
	} else {
		fmt.Println(formatReport(report))
	}
}
