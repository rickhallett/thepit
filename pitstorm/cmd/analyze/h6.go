package main

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"math/rand/v2"
	"os"
	"strings"
	"time"

	"github.com/rickhallett/thepit/shared/db"
	"github.com/rickhallett/thepit/shared/theme"
)

// ---------------------------------------------------------------------------
// H6 constants
// ---------------------------------------------------------------------------

const (
	h6AgentCount   = 4
	h6TurnsPerBout = 12
	h6FounderID    = "founder"
	h6VCID         = "vc"
	h6HypeBeastID  = "hype-beast"
	h6PessimistID  = "pessimist"
)

// Founder speaks at turns 0, 4, 8 (turn % 4 == 0).
func h6FounderPhase(turnIdx int) string {
	switch turnIdx {
	case 0:
		return "early"
	case 4:
		return "middle"
	case 8:
		return "late"
	default:
		return "" // not a Founder turn
	}
}

// ---------------------------------------------------------------------------
// H6 frozen marker lists
// ---------------------------------------------------------------------------

var h6PivotMarkers = []string{
	"let me reframe",
	"here's the thing",
	"here's what",
	"strategic shift",
	"pivot",
	"that actually proves",
	"the fact that you",
	"pushing back",
	"great question",
	"glad you raised",
	"what you're really",
	"precisely why",
	"which is exactly",
	"that's the beauty",
	"let me put it this way",
}

var h6AdaptivePhrases = []string{
	"you raise a good point",
	"fair point",
	"i'll concede",
	"building on what you said",
	"taking that feedback",
	"incorporating",
	"let me adjust",
	"revised",
	"updated approach",
	"new angle",
}

var h6DefensivePhrases = []string{
	"you're missing the point",
	"that's not what i said",
	"you don't understand",
	"with all due respect",
	"i've already addressed",
	"as i said",
	"let me be clear",
	"fundamentally wrong",
	"couldn't be more wrong",
	"simply not true",
}

// ---------------------------------------------------------------------------
// H6 types
// ---------------------------------------------------------------------------

type h6FounderTurn struct {
	BoutIndex int
	TurnIndex int
	Phase     string // "early", "middle", "late"
	Text      string
	M1Novel   float64 // fraction of non-stop words not in Founder's prior turns
	M2CriticJ float64 // Jaccard with prior VC+Pessimist vocabulary
	M3Pivot   float64 // pivot markers per 1000 chars
	M4Ratio   float64 // adaptive / (adaptive + defensive); 0.5 = balanced
	M5CriticJ float64 // Jaccard with prior critics (same as M2)
	M5HypeJ   float64 // Jaccard with prior Hype Beast vocabulary
	M5Delta   float64 // M5CriticJ - M5HypeJ
}

type h6PhaseSummary struct {
	Phase        string  `json:"phase"`
	N            int     `json:"n"`
	M1Novelty    MeanSD  `json:"m1_novelty"`
	M2CriticJ    MeanSD  `json:"m2_criticJaccard"`
	M3Pivot      MeanSD  `json:"m3_pivotDensity"`
	M4Ratio      MeanSD  `json:"m4_adaptiveRatio"`
	M5CriticJ    MeanSD  `json:"m5_criticJaccard"`
	M5HypeJ      MeanSD  `json:"m5_hypeJaccard"`
	M5Delta      MeanSD  `json:"m5_delta"`
	PivotHitPct  float64 `json:"pivotHitPct"`  // fraction of turns with >=1 pivot marker
	AdaptHitPct  float64 `json:"adaptHitPct"`  // fraction of turns with >=1 adaptive phrase
	DefendHitPct float64 `json:"defendHitPct"` // fraction of turns with >=1 defensive phrase
}

type h6CriticBreakdown struct {
	CriticID   string  `json:"criticId"`
	CriticName string  `json:"criticName"`
	EarlyJ     MeanSD  `json:"earlyJaccard"`
	MiddleJ    MeanSD  `json:"middleJaccard"`
	LateJ      MeanSD  `json:"lateJaccard"`
	D          float64 `json:"d_earlyVsLate"`
}

type h6EffectSizes struct {
	M1Novelty_d float64 `json:"m1_novelty_d"`
	M2CriticJ_d float64 `json:"m2_criticJaccard_d"`
	M3Pivot_d   float64 `json:"m3_pivotDensity_d"`
	M4Ratio_d   float64 `json:"m4_adaptiveRatio_d"`
	M5Delta_d   float64 `json:"m5_delta_d"`
}

type h6PermResults struct {
	M1Novelty_p float64 `json:"m1_novelty_p"`
	M2CriticJ_p float64 `json:"m2_criticJaccard_p"`
	M3Pivot_p   float64 `json:"m3_pivotDensity_p"`
	M4Ratio_p   float64 `json:"m4_adaptiveRatio_p"`
	M5Delta_p   float64 `json:"m5_delta_p"`
	Iterations  int     `json:"iterations"`
}

type h6Report struct {
	Hypothesis      string              `json:"hypothesis"`
	RunAt           string              `json:"runAt"`
	Decision        string              `json:"decision"`
	ThresholdHit    string              `json:"thresholdHit"`
	BoutCount       int                 `json:"boutCount"`
	TotalTurns      int                 `json:"totalTurns"`
	FounderTurns    int                 `json:"founderTurns"`
	Phases          []h6PhaseSummary    `json:"phases"`
	EffectSizes     h6EffectSizes       `json:"effectSizes"`
	Permutations    h6PermResults       `json:"permutations"`
	CriticBreakdown []h6CriticBreakdown `json:"criticBreakdown"`
}

// ---------------------------------------------------------------------------
// H6 metric helpers
// ---------------------------------------------------------------------------

// h6SelfNovelty computes the fraction of non-stopwords in text that do NOT
// appear in any of the Founder's own prior turns.
func h6SelfNovelty(text string, priorFounderTexts []string) float64 {
	words := nonStopWords(text)
	if len(words) == 0 {
		return 0
	}
	prior := make(map[string]bool)
	for _, pt := range priorFounderTexts {
		for _, w := range nonStopWords(pt) {
			prior[w] = true
		}
	}
	novel := 0
	for _, w := range words {
		if !prior[w] {
			novel++
		}
	}
	return float64(novel) / float64(len(words))
}

// h6VocabJaccard computes Jaccard similarity between non-stopword vocabulary
// of text and a pre-built vocabulary set.
func h6VocabJaccard(text string, otherVocab map[string]bool) float64 {
	textVocab := make(map[string]bool)
	for _, w := range nonStopWords(text) {
		textVocab[w] = true
	}
	if len(textVocab) == 0 && len(otherVocab) == 0 {
		return 0
	}
	intersection := 0
	for w := range textVocab {
		if otherVocab[w] {
			intersection++
		}
	}
	union := len(textVocab) + len(otherVocab) - intersection
	if union == 0 {
		return 0
	}
	return float64(intersection) / float64(union)
}

// h6PivotDensity counts pivot markers per 1000 characters.
func h6PivotDensity(text string) float64 {
	if len(text) == 0 {
		return 0
	}
	lower := strings.ToLower(text)
	count := 0
	for _, marker := range h6PivotMarkers {
		count += strings.Count(lower, marker)
	}
	return float64(count) / float64(len(text)) * 1000
}

// h6AdaptiveRatio computes adaptive / (adaptive + defensive).
// Returns 0.5 if both are zero (neutral).
func h6AdaptiveRatio(text string) float64 {
	lower := strings.ToLower(text)
	adaptive := 0
	for _, p := range h6AdaptivePhrases {
		adaptive += strings.Count(lower, p)
	}
	defensive := 0
	for _, p := range h6DefensivePhrases {
		defensive += strings.Count(lower, p)
	}
	total := adaptive + defensive
	if total == 0 {
		return 0.5 // neutral
	}
	return float64(adaptive) / float64(total)
}

// h6HasAnyPhrase checks if text contains any phrase from the list.
func h6HasAnyPhrase(text string, phrases []string) bool {
	lower := strings.ToLower(text)
	for _, p := range phrases {
		if strings.Contains(lower, p) {
			return true
		}
	}
	return false
}

// h6BuildVocab builds a non-stopword vocabulary set from multiple texts.
func h6BuildVocab(texts []string) map[string]bool {
	vocab := make(map[string]bool)
	for _, t := range texts {
		for _, w := range nonStopWords(t) {
			vocab[w] = true
		}
	}
	return vocab
}

// ---------------------------------------------------------------------------
// H6 analysis pipeline
// ---------------------------------------------------------------------------

func runH6(ctx context.Context, conn *db.DB, jsonOutput bool) {
	if !jsonOutput {
		fmt.Fprintf(os.Stderr, "\n%s\n\n", theme.Title.Render("analyze — H6 Adversarial Adaptation (Founder Under Fire)"))
	}

	boutsByPreset := queryBouts(ctx, conn, []string{"shark-pit"})
	bouts := boutsByPreset["shark-pit"]

	if !jsonOutput {
		fmt.Fprintf(os.Stderr, "  shark-pit: %d bouts\n", len(bouts))
	}

	if len(bouts) == 0 {
		fmt.Fprintf(os.Stderr, "\nNo completed shark-pit bouts found. Run H6 first:\n")
		fmt.Fprintf(os.Stderr, "  cd pitstorm && go run ./cmd/hypothesis --phase H6 --target https://www.thepit.cloud\n\n")
		os.Exit(1)
	}

	// Compute per-Founder-turn metrics.
	var allFounderTurns []h6FounderTurn
	totalTurns := 0

	// Per-critic Jaccard tracking.
	vcObs := make([]criticObs, 0)
	pessObs := make([]criticObs, 0)

	for boutIdx, bout := range bouts {
		totalTurns += len(bout.Transcript)

		// Collect texts by agent across the transcript.
		var founderPriorTexts []string
		var criticPriorTexts []string // VC + Pessimist
		var vcPriorTexts []string
		var pessPriorTexts []string
		var hypePriorTexts []string

		for _, entry := range bout.Transcript {
			// Only process Founder turns for metrics.
			if entry.AgentID == h6FounderID {
				phase := h6FounderPhase(entry.Turn)
				if phase == "" {
					// Not a standard Founder slot (shouldn't happen with 4 agents).
					founderPriorTexts = append(founderPriorTexts, entry.Text)
					continue
				}

				// Build prior vocabularies from everything before this turn.
				criticVocab := h6BuildVocab(criticPriorTexts)
				vcVocab := h6BuildVocab(vcPriorTexts)
				pessVocab := h6BuildVocab(pessPriorTexts)
				hypeVocab := h6BuildVocab(hypePriorTexts)

				m1 := h6SelfNovelty(entry.Text, founderPriorTexts)
				m2 := h6VocabJaccard(entry.Text, criticVocab)
				m3 := h6PivotDensity(entry.Text)
				m4 := h6AdaptiveRatio(entry.Text)
				m5Critic := h6VocabJaccard(entry.Text, criticVocab)
				m5Hype := h6VocabJaccard(entry.Text, hypeVocab)
				m5Delta := m5Critic - m5Hype

				ft := h6FounderTurn{
					BoutIndex: boutIdx,
					TurnIndex: entry.Turn,
					Phase:     phase,
					Text:      entry.Text,
					M1Novel:   m1,
					M2CriticJ: m2,
					M3Pivot:   m3,
					M4Ratio:   m4,
					M5CriticJ: m5Critic,
					M5HypeJ:   m5Hype,
					M5Delta:   m5Delta,
				}
				allFounderTurns = append(allFounderTurns, ft)

				// Per-critic breakdown.
				vcJ := h6VocabJaccard(entry.Text, vcVocab)
				pessJ := h6VocabJaccard(entry.Text, pessVocab)
				vcObs = append(vcObs, criticObs{boutIdx: boutIdx, phase: phase, jaccard: vcJ})
				pessObs = append(pessObs, criticObs{boutIdx: boutIdx, phase: phase, jaccard: pessJ})

				// Add Founder text to priors for next Founder turn.
				founderPriorTexts = append(founderPriorTexts, entry.Text)
			}

			// Accumulate all agent texts for vocabulary tracking.
			switch entry.AgentID {
			case h6VCID:
				vcPriorTexts = append(vcPriorTexts, entry.Text)
				criticPriorTexts = append(criticPriorTexts, entry.Text)
			case h6PessimistID:
				pessPriorTexts = append(pessPriorTexts, entry.Text)
				criticPriorTexts = append(criticPriorTexts, entry.Text)
			case h6HypeBeastID:
				hypePriorTexts = append(hypePriorTexts, entry.Text)
			}
		}
	}

	if !jsonOutput {
		fmt.Fprintf(os.Stderr, "  total turns: %d\n", totalTurns)
		fmt.Fprintf(os.Stderr, "  founder turns: %d\n", len(allFounderTurns))
	}

	// Split by phase.
	earlyTurns := h6FilterPhase(allFounderTurns, "early")
	middleTurns := h6FilterPhase(allFounderTurns, "middle")
	lateTurns := h6FilterPhase(allFounderTurns, "late")

	// Phase summaries.
	phases := []h6PhaseSummary{
		h6Summarize("early", earlyTurns),
		h6Summarize("middle", middleTurns),
		h6Summarize("late", lateTurns),
	}

	// Effect sizes: early vs late.
	es := h6ComputeEffectSizes(earlyTurns, lateTurns)

	// Permutation tests.
	perm := h6PermutationTests(allFounderTurns, 10_000)

	// Per-critic breakdown.
	criticBreakdown := h6ComputeCriticBreakdown(vcObs, pessObs)

	// Classify result.
	maxD := 0.0
	anyAbove015 := false
	for _, d := range []float64{
		math.Abs(es.M1Novelty_d), math.Abs(es.M2CriticJ_d),
		math.Abs(es.M3Pivot_d), math.Abs(es.M4Ratio_d),
		math.Abs(es.M5Delta_d),
	} {
		if d > maxD {
			maxD = d
		}
		if d >= 0.15 {
			anyAbove015 = true
		}
	}

	var decision, thresholdHit string
	if maxD >= 0.30 {
		decision = fmt.Sprintf("Clear result: max |d| = %.3f >= 0.30. No LLM judge needed.", maxD)
		thresholdHit = "clear"
	} else if !anyAbove015 {
		decision = fmt.Sprintf("Null result: all |d| < 0.15 (max = %.3f). No detectable adaptation.", maxD)
		thresholdHit = "null"
	} else {
		decision = fmt.Sprintf("Ambiguous: max |d| = %.3f (0.15 <= d < 0.30). LLM judge should be invoked.", maxD)
		thresholdHit = "ambiguous"
	}

	report := h6Report{
		Hypothesis:      "H6",
		RunAt:           time.Now().UTC().Format(time.RFC3339),
		Decision:        decision,
		ThresholdHit:    thresholdHit,
		BoutCount:       len(bouts),
		TotalTurns:      totalTurns,
		FounderTurns:    len(allFounderTurns),
		Phases:          phases,
		EffectSizes:     es,
		Permutations:    perm,
		CriticBreakdown: criticBreakdown,
	}

	emitH6Report(report, jsonOutput)
}

// ---------------------------------------------------------------------------
// H6 helpers
// ---------------------------------------------------------------------------

func h6FilterPhase(turns []h6FounderTurn, phase string) []h6FounderTurn {
	var out []h6FounderTurn
	for _, t := range turns {
		if t.Phase == phase {
			out = append(out, t)
		}
	}
	return out
}

func h6Summarize(phase string, turns []h6FounderTurn) h6PhaseSummary {
	n := len(turns)
	if n == 0 {
		return h6PhaseSummary{Phase: phase}
	}

	m1s := make([]float64, n)
	m2s := make([]float64, n)
	m3s := make([]float64, n)
	m4s := make([]float64, n)
	m5cs := make([]float64, n)
	m5hs := make([]float64, n)
	m5ds := make([]float64, n)
	pivotHits := 0
	adaptHits := 0
	defendHits := 0

	for i, t := range turns {
		m1s[i] = t.M1Novel
		m2s[i] = t.M2CriticJ
		m3s[i] = t.M3Pivot
		m4s[i] = t.M4Ratio
		m5cs[i] = t.M5CriticJ
		m5hs[i] = t.M5HypeJ
		m5ds[i] = t.M5Delta
		if h6HasAnyPhrase(t.Text, h6PivotMarkers) {
			pivotHits++
		}
		if h6HasAnyPhrase(t.Text, h6AdaptivePhrases) {
			adaptHits++
		}
		if h6HasAnyPhrase(t.Text, h6DefensivePhrases) {
			defendHits++
		}
	}

	return h6PhaseSummary{
		Phase:        phase,
		N:            n,
		M1Novelty:    MeanSD{mean(m1s), stddev(m1s)},
		M2CriticJ:    MeanSD{mean(m2s), stddev(m2s)},
		M3Pivot:      MeanSD{mean(m3s), stddev(m3s)},
		M4Ratio:      MeanSD{mean(m4s), stddev(m4s)},
		M5CriticJ:    MeanSD{mean(m5cs), stddev(m5cs)},
		M5HypeJ:      MeanSD{mean(m5hs), stddev(m5hs)},
		M5Delta:      MeanSD{mean(m5ds), stddev(m5ds)},
		PivotHitPct:  float64(pivotHits) / float64(n) * 100,
		AdaptHitPct:  float64(adaptHits) / float64(n) * 100,
		DefendHitPct: float64(defendHits) / float64(n) * 100,
	}
}

// ---------------------------------------------------------------------------
// H6 effect sizes
// ---------------------------------------------------------------------------

func h6Extract(turns []h6FounderTurn, fn func(h6FounderTurn) float64) []float64 {
	out := make([]float64, len(turns))
	for i, t := range turns {
		out[i] = fn(t)
	}
	return out
}

func h6ComputeEffectSizes(early, late []h6FounderTurn) h6EffectSizes {
	return h6EffectSizes{
		M1Novelty_d: cohensD(
			h6Extract(early, func(t h6FounderTurn) float64 { return t.M1Novel }),
			h6Extract(late, func(t h6FounderTurn) float64 { return t.M1Novel }),
		),
		M2CriticJ_d: cohensD(
			h6Extract(early, func(t h6FounderTurn) float64 { return t.M2CriticJ }),
			h6Extract(late, func(t h6FounderTurn) float64 { return t.M2CriticJ }),
		),
		M3Pivot_d: cohensD(
			h6Extract(early, func(t h6FounderTurn) float64 { return t.M3Pivot }),
			h6Extract(late, func(t h6FounderTurn) float64 { return t.M3Pivot }),
		),
		M4Ratio_d: cohensD(
			h6Extract(early, func(t h6FounderTurn) float64 { return t.M4Ratio }),
			h6Extract(late, func(t h6FounderTurn) float64 { return t.M4Ratio }),
		),
		M5Delta_d: cohensD(
			h6Extract(early, func(t h6FounderTurn) float64 { return t.M5Delta }),
			h6Extract(late, func(t h6FounderTurn) float64 { return t.M5Delta }),
		),
	}
}

// ---------------------------------------------------------------------------
// H6 permutation tests
// ---------------------------------------------------------------------------

func h6PermutationTests(allTurns []h6FounderTurn, iterations int) h6PermResults {
	early := h6FilterPhase(allTurns, "early")
	late := h6FilterPhase(allTurns, "late")

	obsM1 := math.Abs(cohensD(
		h6Extract(early, func(t h6FounderTurn) float64 { return t.M1Novel }),
		h6Extract(late, func(t h6FounderTurn) float64 { return t.M1Novel }),
	))
	obsM2 := math.Abs(cohensD(
		h6Extract(early, func(t h6FounderTurn) float64 { return t.M2CriticJ }),
		h6Extract(late, func(t h6FounderTurn) float64 { return t.M2CriticJ }),
	))
	obsM3 := math.Abs(cohensD(
		h6Extract(early, func(t h6FounderTurn) float64 { return t.M3Pivot }),
		h6Extract(late, func(t h6FounderTurn) float64 { return t.M3Pivot }),
	))
	obsM4 := math.Abs(cohensD(
		h6Extract(early, func(t h6FounderTurn) float64 { return t.M4Ratio }),
		h6Extract(late, func(t h6FounderTurn) float64 { return t.M4Ratio }),
	))
	obsM5 := math.Abs(cohensD(
		h6Extract(early, func(t h6FounderTurn) float64 { return t.M5Delta }),
		h6Extract(late, func(t h6FounderTurn) float64 { return t.M5Delta }),
	))

	m1Ext, m2Ext, m3Ext, m4Ext, m5Ext := 0, 0, 0, 0, 0

	// Pool early + late turns, shuffle phase labels.
	earlyLate := make([]h6FounderTurn, 0, len(early)+len(late))
	earlyLate = append(earlyLate, early...)
	earlyLate = append(earlyLate, late...)
	nEarly := len(early)

	for iter := 0; iter < iterations; iter++ {
		perm := make([]h6FounderTurn, len(earlyLate))
		copy(perm, earlyLate)
		rand.Shuffle(len(perm), func(i, j int) { perm[i], perm[j] = perm[j], perm[i] })
		permEarly := perm[:nEarly]
		permLate := perm[nEarly:]

		d1 := math.Abs(cohensD(
			h6Extract(permEarly, func(t h6FounderTurn) float64 { return t.M1Novel }),
			h6Extract(permLate, func(t h6FounderTurn) float64 { return t.M1Novel }),
		))
		d2 := math.Abs(cohensD(
			h6Extract(permEarly, func(t h6FounderTurn) float64 { return t.M2CriticJ }),
			h6Extract(permLate, func(t h6FounderTurn) float64 { return t.M2CriticJ }),
		))
		d3 := math.Abs(cohensD(
			h6Extract(permEarly, func(t h6FounderTurn) float64 { return t.M3Pivot }),
			h6Extract(permLate, func(t h6FounderTurn) float64 { return t.M3Pivot }),
		))
		d4 := math.Abs(cohensD(
			h6Extract(permEarly, func(t h6FounderTurn) float64 { return t.M4Ratio }),
			h6Extract(permLate, func(t h6FounderTurn) float64 { return t.M4Ratio }),
		))
		d5 := math.Abs(cohensD(
			h6Extract(permEarly, func(t h6FounderTurn) float64 { return t.M5Delta }),
			h6Extract(permLate, func(t h6FounderTurn) float64 { return t.M5Delta }),
		))

		if d1 >= obsM1 {
			m1Ext++
		}
		if d2 >= obsM2 {
			m2Ext++
		}
		if d3 >= obsM3 {
			m3Ext++
		}
		if d4 >= obsM4 {
			m4Ext++
		}
		if d5 >= obsM5 {
			m5Ext++
		}
	}

	return h6PermResults{
		M1Novelty_p: float64(m1Ext) / float64(iterations),
		M2CriticJ_p: float64(m2Ext) / float64(iterations),
		M3Pivot_p:   float64(m3Ext) / float64(iterations),
		M4Ratio_p:   float64(m4Ext) / float64(iterations),
		M5Delta_p:   float64(m5Ext) / float64(iterations),
		Iterations:  iterations,
	}
}

// ---------------------------------------------------------------------------
// H6 per-critic breakdown
// ---------------------------------------------------------------------------

type criticObs struct {
	boutIdx int
	phase   string
	jaccard float64
}

func h6ComputeCriticBreakdown(vcObs, pessObs []criticObs) []h6CriticBreakdown {
	compute := func(obs []criticObs, id, name string) h6CriticBreakdown {
		phaseVals := make(map[string][]float64)
		for _, o := range obs {
			phaseVals[o.phase] = append(phaseVals[o.phase], o.jaccard)
		}
		return h6CriticBreakdown{
			CriticID:   id,
			CriticName: name,
			EarlyJ:     MeanSD{mean(phaseVals["early"]), stddev(phaseVals["early"])},
			MiddleJ:    MeanSD{mean(phaseVals["middle"]), stddev(phaseVals["middle"])},
			LateJ:      MeanSD{mean(phaseVals["late"]), stddev(phaseVals["late"])},
			D:          cohensD(phaseVals["early"], phaseVals["late"]),
		}
	}

	return []h6CriticBreakdown{
		compute(vcObs, h6VCID, "The VC"),
		compute(pessObs, h6PessimistID, "The Pessimist"),
	}
}

// ---------------------------------------------------------------------------
// H6 report formatting
// ---------------------------------------------------------------------------

func emitH6Report(report h6Report, jsonOutput bool) {
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
	b.WriteString("# H6 Analysis: Adversarial Adaptation (Founder Under Fire)\n\n")
	fmt.Fprintf(&b, "Run: %s\n", report.RunAt)
	fmt.Fprintf(&b, "Decision: %s\n", report.Decision)
	fmt.Fprintf(&b, "Threshold: %s\n\n", report.ThresholdHit)
	fmt.Fprintf(&b, "Bouts: %d | Total turns: %d | Founder turns: %d\n\n", report.BoutCount, report.TotalTurns, report.FounderTurns)

	// Phase comparison.
	b.WriteString("## Founder Phase Comparison\n\n")
	b.WriteString("| Phase | n | M1 Novelty | M2 Critic J | M3 Pivot/1k | M4 Adapt Ratio | M5 Delta |\n")
	b.WriteString("|-------|---|------------|-------------|-------------|----------------|----------|\n")
	for _, p := range report.Phases {
		fmt.Fprintf(&b, "| %s | %d | %.3f +/- %.3f | %.3f +/- %.3f | %.3f +/- %.3f | %.3f +/- %.3f | %.3f +/- %.3f |\n",
			p.Phase, p.N,
			p.M1Novelty.Mean, p.M1Novelty.SD,
			p.M2CriticJ.Mean, p.M2CriticJ.SD,
			p.M3Pivot.Mean, p.M3Pivot.SD,
			p.M4Ratio.Mean, p.M4Ratio.SD,
			p.M5Delta.Mean, p.M5Delta.SD,
		)
	}
	b.WriteString("\n")

	// Phrase hit rates.
	b.WriteString("## Phrase Hit Rates (% of Founder turns with >= 1 occurrence)\n\n")
	b.WriteString("| Phase | Pivot Markers | Adaptive Phrases | Defensive Phrases |\n")
	b.WriteString("|-------|---------------|-----------------|-------------------|\n")
	for _, p := range report.Phases {
		fmt.Fprintf(&b, "| %s | %.1f%% | %.1f%% | %.1f%% |\n",
			p.Phase, p.PivotHitPct, p.AdaptHitPct, p.DefendHitPct,
		)
	}
	b.WriteString("\n")

	// Effect sizes.
	b.WriteString("## Effect Sizes (Early vs Late, Cohen's d)\n\n")
	b.WriteString("| Metric | d | |d| | Interpretation |\n")
	b.WriteString("|--------|------|------|----------------|\n")
	for _, row := range []struct {
		label string
		d     float64
	}{
		{"M1 Self-Novelty", report.EffectSizes.M1Novelty_d},
		{"M2 Critic Jaccard", report.EffectSizes.M2CriticJ_d},
		{"M3 Pivot Density", report.EffectSizes.M3Pivot_d},
		{"M4 Adaptive Ratio", report.EffectSizes.M4Ratio_d},
		{"M5 Asymmetric Convergence", report.EffectSizes.M5Delta_d},
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

	// Permutation tests.
	b.WriteString("## Permutation Tests (10,000 iterations)\n\n")
	b.WriteString("| Metric | p-value |\n")
	b.WriteString("|--------|--------|\n")
	fmt.Fprintf(&b, "| M1 Self-Novelty | %.4f |\n", report.Permutations.M1Novelty_p)
	fmt.Fprintf(&b, "| M2 Critic Jaccard | %.4f |\n", report.Permutations.M2CriticJ_p)
	fmt.Fprintf(&b, "| M3 Pivot Density | %.4f |\n", report.Permutations.M3Pivot_p)
	fmt.Fprintf(&b, "| M4 Adaptive Ratio | %.4f |\n", report.Permutations.M4Ratio_p)
	fmt.Fprintf(&b, "| M5 Asymmetric Convergence | %.4f |\n", report.Permutations.M5Delta_p)
	b.WriteString("\n")

	// Per-critic breakdown.
	b.WriteString("## Per-Critic Absorption Breakdown\n\n")
	b.WriteString("| Critic | Early J | Middle J | Late J | d (Early vs Late) |\n")
	b.WriteString("|--------|---------|----------|--------|-------------------|\n")
	for _, c := range report.CriticBreakdown {
		fmt.Fprintf(&b, "| %s | %.3f +/- %.3f | %.3f +/- %.3f | %.3f +/- %.3f | %.3f |\n",
			c.CriticName,
			c.EarlyJ.Mean, c.EarlyJ.SD,
			c.MiddleJ.Mean, c.MiddleJ.SD,
			c.LateJ.Mean, c.LateJ.SD,
			c.D,
		)
	}
	b.WriteString("\n")

	fmt.Println(b.String())
}
