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
	"unicode/utf8"

	"github.com/rickhallett/thepit/shared/db"
	"github.com/rickhallett/thepit/shared/theme"
)

// ---------------------------------------------------------------------------
// H5 constants
// ---------------------------------------------------------------------------

const (
	h5AgentCount   = 4
	h5TurnsPerBout = 12
)

// Phase boundaries (0-indexed turn numbers).
// With 4 agents and 12 turns: turns 0-3 = early, 4-7 = middle, 8-11 = late.
func h5Phase(turnIdx int) string {
	switch {
	case turnIdx < 4:
		return "early"
	case turnIdx < 8:
		return "middle"
	default:
		return "late"
	}
}

// Character markers per agent (frozen in pre-registration).
var h5Markers = map[string][]string{
	// mansion
	"influencer": {"literally", "so blessed", "living my best life", "content", "followers"},
	"celeb":      {"back when", "the show", "my fans", "the craft", "in my day"},
	"producer":   {"ratings", "drama", "good television", "storyline", "audience"},
	"newcomer":   {"is this normal", "i don't understand", "why", "just being honest", "weird"},
	// writers-room
	"literary":     {"the tradition", "one might argue", "prose", "the sentence", "canon"},
	"romance":      {"readers", "sell", "hook", "tension", "market"},
	"screenwriter": {"beat", "act", "scene", "structure", "inciting incident"},
	"poet":         {"silence", "the unsayable", "compression", "the line", "fragment"},
}

var h5PresetOrder = []string{"mansion", "writers-room"}

// ---------------------------------------------------------------------------
// H5 types
// ---------------------------------------------------------------------------

type h5TurnMetrics struct {
	PresetID       string
	AgentID        string
	AgentName      string
	BoutIndex      int
	TurnIndex      int
	Phase          string  // "early", "middle", "late"
	TTR            float64 // M1
	HedgingDensity float64 // M2
	SentLenSD      float64 // M3
	MarkerHit      bool    // M4
}

type h5PhaseSummary struct {
	Phase        string  `json:"phase"`
	N            int     `json:"n"`
	M1TTR        MeanSD  `json:"m1_ttr"`
	M2Hedging    MeanSD  `json:"m2_hedging"`
	M3SentLenSD  MeanSD  `json:"m3_sentLenSD"`
	M4MarkerRate float64 `json:"m4_markerRate"`
}

type h5PresetPhaseSummary struct {
	PresetID string           `json:"presetId"`
	Phases   []h5PhaseSummary `json:"phases"`
}

type h5AgentPhaseSummary struct {
	AgentID   string           `json:"agentId"`
	AgentName string           `json:"agentName"`
	PresetID  string           `json:"presetId"`
	Phases    []h5PhaseSummary `json:"phases"`
}

type h5EffectSizes struct {
	M1TTR_d       float64 `json:"m1_ttr_d"`
	M2Hedging_d   float64 `json:"m2_hedging_d"`
	M3SentLenSD_d float64 `json:"m3_sentLenSD_d"`
	M4Marker_d    float64 `json:"m4_marker_d"`
	M5Jaccard_d   float64 `json:"m5_jaccard_d"`
}

type h5PermResults struct {
	M1TTR_p     float64 `json:"m1_ttr_p"`
	M2Hedging_p float64 `json:"m2_hedging_p"`
	M3SentSD_p  float64 `json:"m3_sentSD_p"`
	M5Jaccard_p float64 `json:"m5_jaccard_p"`
	Iterations  int     `json:"iterations"`
}

type h5ConvergenceSummary struct {
	Phase       string  `json:"phase"`
	MeanJaccard float64 `json:"meanJaccard"`
	SDJaccard   float64 `json:"sdJaccard"`
	N           int     `json:"n"` // number of bout-phase observations
}

type h5Report struct {
	Hypothesis   string                 `json:"hypothesis"`
	RunAt        string                 `json:"runAt"`
	Decision     string                 `json:"decision"`
	ThresholdHit string                 `json:"thresholdHit"`
	Overall      []h5PhaseSummary       `json:"overall"`
	ByPreset     []h5PresetPhaseSummary `json:"byPreset"`
	ByAgent      []h5AgentPhaseSummary  `json:"byAgent"`
	EffectSizes  h5EffectSizes          `json:"effectSizes"`
	Permutations h5PermResults          `json:"permutations"`
	Convergence  []h5ConvergenceSummary `json:"convergence"`
}

// ---------------------------------------------------------------------------
// H5 metric: character marker hit (reuses H3-style pattern)
// ---------------------------------------------------------------------------

func h5MarkerHit(text, agentID string) bool {
	markers, ok := h5Markers[agentID]
	if !ok {
		return false
	}
	lower := strings.ToLower(text)
	for _, m := range markers {
		if strings.Contains(lower, m) {
			return true
		}
	}
	return false
}

// ---------------------------------------------------------------------------
// H5 metric: Jaccard similarity between agent vocabularies within a phase
// ---------------------------------------------------------------------------

func jaccardSimilarity(a, b map[string]bool) float64 {
	if len(a) == 0 && len(b) == 0 {
		return 0
	}
	intersection := 0
	for w := range a {
		if b[w] {
			intersection++
		}
	}
	union := len(a) + len(b) - intersection
	if union == 0 {
		return 0
	}
	return float64(intersection) / float64(union)
}

// computeBoutPhaseJaccard computes mean pairwise Jaccard similarity of agent
// vocabularies within a single phase of a single bout.
func computeBoutPhaseJaccard(transcript []TranscriptEntry, phase string) float64 {
	// Build vocabulary set per agent for turns in this phase.
	agentVocab := make(map[string]map[string]bool)
	for turnIdx, entry := range transcript {
		if h5Phase(turnIdx) != phase {
			continue
		}
		if agentVocab[entry.AgentID] == nil {
			agentVocab[entry.AgentID] = make(map[string]bool)
		}
		for _, w := range tokenize(entry.Text) {
			agentVocab[entry.AgentID][w] = true
		}
	}

	// Pairwise Jaccard.
	agents := make([]string, 0, len(agentVocab))
	for aid := range agentVocab {
		agents = append(agents, aid)
	}
	sort.Strings(agents)

	if len(agents) < 2 {
		return 0
	}

	var sum float64
	pairs := 0
	for i := 0; i < len(agents); i++ {
		for j := i + 1; j < len(agents); j++ {
			sum += jaccardSimilarity(agentVocab[agents[i]], agentVocab[agents[j]])
			pairs++
		}
	}
	if pairs == 0 {
		return 0
	}
	return sum / float64(pairs)
}

// ---------------------------------------------------------------------------
// H5 analysis pipeline
// ---------------------------------------------------------------------------

func runH5(ctx context.Context, conn *db.DB, jsonOutput bool) {
	if !jsonOutput {
		fmt.Fprintf(os.Stderr, "\n%s\n\n", theme.Title.Render("analyze — H5 Character Consistency Over Time"))
	}

	boutsByPreset := queryBouts(ctx, conn, h5PresetOrder)

	totalBouts := 0
	for _, pid := range h5PresetOrder {
		bouts := boutsByPreset[pid]
		totalBouts += len(bouts)
		if !jsonOutput {
			fmt.Fprintf(os.Stderr, "  %s: %d bouts\n", pid, len(bouts))
		}
	}

	if totalBouts == 0 {
		fmt.Fprintf(os.Stderr, "\nNo completed H5 bouts found. Run H5 first:\n")
		fmt.Fprintf(os.Stderr, "  cd pitstorm && go run ./cmd/hypothesis --phase H5 --target https://www.thepit.cloud\n\n")
		os.Exit(1)
	}

	// Compute per-turn metrics.
	var allMetrics []h5TurnMetrics
	boutIdx := 0

	// Convergence data: per-bout, per-phase Jaccard values.
	var jaccardData []jaccardObs

	for _, pid := range h5PresetOrder {
		bouts, ok := boutsByPreset[pid]
		if !ok {
			continue
		}
		for _, bout := range bouts {
			for turnIdx, entry := range bout.Transcript {
				phase := h5Phase(turnIdx)
				m := h5TurnMetrics{
					PresetID:       pid,
					AgentID:        entry.AgentID,
					AgentName:      entry.AgentName,
					BoutIndex:      boutIdx,
					TurnIndex:      turnIdx,
					Phase:          phase,
					TTR:            computeTTR(entry.Text),
					HedgingDensity: computeHedgingDensity(entry.Text),
					SentLenSD:      computeSentenceLengthSD(entry.Text),
					MarkerHit:      h5MarkerHit(entry.Text, entry.AgentID),
				}
				allMetrics = append(allMetrics, m)
			}

			// Compute Jaccard for each phase.
			for _, phase := range []string{"early", "middle", "late"} {
				j := computeBoutPhaseJaccard(bout.Transcript, phase)
				jaccardData = append(jaccardData, jaccardObs{
					phase:   phase,
					boutIdx: boutIdx,
					value:   j,
				})
			}
			boutIdx++
		}
	}

	if !jsonOutput {
		fmt.Fprintf(os.Stderr, "  total turns: %d\n", len(allMetrics))
	}

	// Split by phase.
	earlyMetrics := h5FilterPhase(allMetrics, "early")
	middleMetrics := h5FilterPhase(allMetrics, "middle")
	lateMetrics := h5FilterPhase(allMetrics, "late")

	// Overall phase summaries.
	overallPhases := []h5PhaseSummary{
		h5Summarize("early", earlyMetrics),
		h5Summarize("middle", middleMetrics),
		h5Summarize("late", lateMetrics),
	}

	// Per-preset phase summaries.
	var byPreset []h5PresetPhaseSummary
	for _, pid := range h5PresetOrder {
		pm := h5FilterPreset(allMetrics, pid)
		byPreset = append(byPreset, h5PresetPhaseSummary{
			PresetID: pid,
			Phases: []h5PhaseSummary{
				h5Summarize("early", h5FilterPhase(pm, "early")),
				h5Summarize("middle", h5FilterPhase(pm, "middle")),
				h5Summarize("late", h5FilterPhase(pm, "late")),
			},
		})
	}

	// Per-agent phase summaries.
	byAgent := h5SummarizeByAgent(allMetrics)

	// Convergence summaries.
	convergence := h5SummarizeConvergence(jaccardData)

	// Effect sizes: early vs late.
	es := h5ComputeEffectSizes(earlyMetrics, lateMetrics, jaccardData)

	// Permutation tests.
	perm := h5PermutationTests(allMetrics, jaccardData, 10_000)

	// Classify result.
	maxD := 0.0
	anyAbove015 := false
	for _, d := range []float64{
		math.Abs(es.M1TTR_d), math.Abs(es.M2Hedging_d),
		math.Abs(es.M3SentLenSD_d), math.Abs(es.M4Marker_d),
		math.Abs(es.M5Jaccard_d),
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
		decision = fmt.Sprintf("Null result: all |d| < 0.15 (max = %.3f). No detectable drift.", maxD)
		thresholdHit = "null"
	} else {
		decision = fmt.Sprintf("Ambiguous: max |d| = %.3f (0.15 <= d < 0.30). LLM judge should be invoked.", maxD)
		thresholdHit = "ambiguous"
	}

	report := h5Report{
		Hypothesis:   "H5",
		RunAt:        time.Now().UTC().Format(time.RFC3339),
		Decision:     decision,
		ThresholdHit: thresholdHit,
		Overall:      overallPhases,
		ByPreset:     byPreset,
		ByAgent:      byAgent,
		EffectSizes:  es,
		Permutations: perm,
		Convergence:  convergence,
	}

	emitH5Report(report, jsonOutput)
}

// ---------------------------------------------------------------------------
// H5 helpers
// ---------------------------------------------------------------------------

func h5FilterPhase(metrics []h5TurnMetrics, phase string) []h5TurnMetrics {
	var out []h5TurnMetrics
	for _, m := range metrics {
		if m.Phase == phase {
			out = append(out, m)
		}
	}
	return out
}

func h5FilterPreset(metrics []h5TurnMetrics, presetID string) []h5TurnMetrics {
	var out []h5TurnMetrics
	for _, m := range metrics {
		if m.PresetID == presetID {
			out = append(out, m)
		}
	}
	return out
}

func h5Summarize(phase string, metrics []h5TurnMetrics) h5PhaseSummary {
	ttrs := make([]float64, len(metrics))
	hedging := make([]float64, len(metrics))
	sentSD := make([]float64, len(metrics))
	hits := 0
	for i, m := range metrics {
		ttrs[i] = m.TTR
		hedging[i] = m.HedgingDensity
		sentSD[i] = m.SentLenSD
		if m.MarkerHit {
			hits++
		}
	}
	markerRate := 0.0
	if len(metrics) > 0 {
		markerRate = float64(hits) / float64(len(metrics))
	}
	return h5PhaseSummary{
		Phase:        phase,
		N:            len(metrics),
		M1TTR:        MeanSD{mean(ttrs), stddev(ttrs)},
		M2Hedging:    MeanSD{mean(hedging), stddev(hedging)},
		M3SentLenSD:  MeanSD{mean(sentSD), stddev(sentSD)},
		M4MarkerRate: markerRate,
	}
}

func h5SummarizeByAgent(metrics []h5TurnMetrics) []h5AgentPhaseSummary {
	type agentKey struct {
		agentID  string
		presetID string
	}
	agentNames := make(map[agentKey]string)
	agentMetrics := make(map[agentKey][]h5TurnMetrics)

	for _, m := range metrics {
		k := agentKey{m.AgentID, m.PresetID}
		agentNames[k] = m.AgentName
		agentMetrics[k] = append(agentMetrics[k], m)
	}

	var out []h5AgentPhaseSummary
	for k, ms := range agentMetrics {
		out = append(out, h5AgentPhaseSummary{
			AgentID:   k.agentID,
			AgentName: agentNames[k],
			PresetID:  k.presetID,
			Phases: []h5PhaseSummary{
				h5Summarize("early", h5FilterPhase(ms, "early")),
				h5Summarize("middle", h5FilterPhase(ms, "middle")),
				h5Summarize("late", h5FilterPhase(ms, "late")),
			},
		})
	}

	// Sort by preset then agent name.
	sort.Slice(out, func(i, j int) bool {
		if out[i].PresetID != out[j].PresetID {
			return out[i].PresetID < out[j].PresetID
		}
		return out[i].AgentName < out[j].AgentName
	})
	return out
}

type jaccardObs struct {
	phase   string
	boutIdx int
	value   float64
}

func h5SummarizeConvergence(data []jaccardObs) []h5ConvergenceSummary {
	phaseVals := make(map[string][]float64)
	for _, d := range data {
		phaseVals[d.phase] = append(phaseVals[d.phase], d.value)
	}
	var out []h5ConvergenceSummary
	for _, phase := range []string{"early", "middle", "late"} {
		vals := phaseVals[phase]
		out = append(out, h5ConvergenceSummary{
			Phase:       phase,
			MeanJaccard: mean(vals),
			SDJaccard:   stddev(vals),
			N:           len(vals),
		})
	}
	return out
}

// ---------------------------------------------------------------------------
// H5 effect sizes
// ---------------------------------------------------------------------------

func h5ExtractFloat(metrics []h5TurnMetrics, fn func(h5TurnMetrics) float64) []float64 {
	out := make([]float64, len(metrics))
	for i, m := range metrics {
		out[i] = fn(m)
	}
	return out
}

func h5ComputeEffectSizes(early, late []h5TurnMetrics, jData []jaccardObs) h5EffectSizes {
	eTTR := h5ExtractFloat(early, func(m h5TurnMetrics) float64 { return m.TTR })
	lTTR := h5ExtractFloat(late, func(m h5TurnMetrics) float64 { return m.TTR })

	eHedge := h5ExtractFloat(early, func(m h5TurnMetrics) float64 { return m.HedgingDensity })
	lHedge := h5ExtractFloat(late, func(m h5TurnMetrics) float64 { return m.HedgingDensity })

	eSent := h5ExtractFloat(early, func(m h5TurnMetrics) float64 { return m.SentLenSD })
	lSent := h5ExtractFloat(late, func(m h5TurnMetrics) float64 { return m.SentLenSD })

	eMarker := h5ExtractFloat(early, func(m h5TurnMetrics) float64 {
		if m.MarkerHit {
			return 1.0
		}
		return 0.0
	})
	lMarker := h5ExtractFloat(late, func(m h5TurnMetrics) float64 {
		if m.MarkerHit {
			return 1.0
		}
		return 0.0
	})

	// M5: Jaccard early vs late.
	var eJac, lJac []float64
	for _, d := range jData {
		if d.phase == "early" {
			eJac = append(eJac, d.value)
		} else if d.phase == "late" {
			lJac = append(lJac, d.value)
		}
	}

	return h5EffectSizes{
		M1TTR_d:       cohensD(eTTR, lTTR),
		M2Hedging_d:   cohensD(eHedge, lHedge),
		M3SentLenSD_d: cohensD(eSent, lSent),
		M4Marker_d:    cohensD(eMarker, lMarker),
		M5Jaccard_d:   cohensD(eJac, lJac),
	}
}

// ---------------------------------------------------------------------------
// H5 permutation tests
// ---------------------------------------------------------------------------

func h5PermutationTests(allMetrics []h5TurnMetrics, jData []jaccardObs, iterations int) h5PermResults {
	early := h5FilterPhase(allMetrics, "early")
	late := h5FilterPhase(allMetrics, "late")

	obsM1 := math.Abs(cohensD(
		h5ExtractFloat(early, func(m h5TurnMetrics) float64 { return m.TTR }),
		h5ExtractFloat(late, func(m h5TurnMetrics) float64 { return m.TTR }),
	))
	obsM2 := math.Abs(cohensD(
		h5ExtractFloat(early, func(m h5TurnMetrics) float64 { return m.HedgingDensity }),
		h5ExtractFloat(late, func(m h5TurnMetrics) float64 { return m.HedgingDensity }),
	))
	obsM3 := math.Abs(cohensD(
		h5ExtractFloat(early, func(m h5TurnMetrics) float64 { return m.SentLenSD }),
		h5ExtractFloat(late, func(m h5TurnMetrics) float64 { return m.SentLenSD }),
	))

	// M5 observed.
	var eJac, lJac []float64
	for _, d := range jData {
		if d.phase == "early" {
			eJac = append(eJac, d.value)
		} else if d.phase == "late" {
			lJac = append(lJac, d.value)
		}
	}
	obsM5 := math.Abs(cohensD(eJac, lJac))

	m1Ext, m2Ext, m3Ext, m5Ext := 0, 0, 0, 0

	// For turn-level metrics: shuffle phase labels across all turns.
	// Only shuffle early and late (exclude middle from permutation).
	earlyLate := make([]h5TurnMetrics, 0, len(early)+len(late))
	earlyLate = append(earlyLate, early...)
	earlyLate = append(earlyLate, late...)
	nEarly := len(early)

	// For Jaccard: shuffle early/late phase labels on jaccardObs.
	earlyLateJac := make([]float64, 0, len(eJac)+len(lJac))
	earlyLateJac = append(earlyLateJac, eJac...)
	earlyLateJac = append(earlyLateJac, lJac...)
	nEarlyJac := len(eJac)

	for iter := 0; iter < iterations; iter++ {
		// Shuffle turn-level data.
		perm := make([]h5TurnMetrics, len(earlyLate))
		copy(perm, earlyLate)
		rand.Shuffle(len(perm), func(i, j int) { perm[i], perm[j] = perm[j], perm[i] })
		permEarly := perm[:nEarly]
		permLate := perm[nEarly:]

		d1 := math.Abs(cohensD(
			h5ExtractFloat(permEarly, func(m h5TurnMetrics) float64 { return m.TTR }),
			h5ExtractFloat(permLate, func(m h5TurnMetrics) float64 { return m.TTR }),
		))
		d2 := math.Abs(cohensD(
			h5ExtractFloat(permEarly, func(m h5TurnMetrics) float64 { return m.HedgingDensity }),
			h5ExtractFloat(permLate, func(m h5TurnMetrics) float64 { return m.HedgingDensity }),
		))
		d3 := math.Abs(cohensD(
			h5ExtractFloat(permEarly, func(m h5TurnMetrics) float64 { return m.SentLenSD }),
			h5ExtractFloat(permLate, func(m h5TurnMetrics) float64 { return m.SentLenSD }),
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

		// Shuffle Jaccard data.
		permJac := make([]float64, len(earlyLateJac))
		copy(permJac, earlyLateJac)
		rand.Shuffle(len(permJac), func(i, j int) { permJac[i], permJac[j] = permJac[j], permJac[i] })
		d5 := math.Abs(cohensD(permJac[:nEarlyJac], permJac[nEarlyJac:]))
		if d5 >= obsM5 {
			m5Ext++
		}
	}

	return h5PermResults{
		M1TTR_p:     float64(m1Ext) / float64(iterations),
		M2Hedging_p: float64(m2Ext) / float64(iterations),
		M3SentSD_p:  float64(m3Ext) / float64(iterations),
		M5Jaccard_p: float64(m5Ext) / float64(iterations),
		Iterations:  iterations,
	}
}

// ---------------------------------------------------------------------------
// H5 report formatting
// ---------------------------------------------------------------------------

func emitH5Report(report h5Report, jsonOutput bool) {
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
	b.WriteString("# H5 Analysis: Character Consistency Over Time\n\n")
	fmt.Fprintf(&b, "Run: %s\n", report.RunAt)
	fmt.Fprintf(&b, "Decision: %s\n", report.Decision)
	fmt.Fprintf(&b, "Threshold: %s\n\n", report.ThresholdHit)

	// Overall phase comparison.
	b.WriteString("## Overall Phase Comparison\n\n")
	b.WriteString("| Phase | n | M1 TTR | M2 Hedging/1k | M3 Sent SD | M4 Marker % |\n")
	b.WriteString("|-------|---|--------|---------------|------------|-------------|\n")
	for _, p := range report.Overall {
		fmt.Fprintf(&b, "| %s | %d | %.3f +/- %.3f | %.3f +/- %.3f | %.2f +/- %.2f | %.1f%% |\n",
			p.Phase, p.N,
			p.M1TTR.Mean, p.M1TTR.SD,
			p.M2Hedging.Mean, p.M2Hedging.SD,
			p.M3SentLenSD.Mean, p.M3SentLenSD.SD,
			p.M4MarkerRate*100,
		)
	}
	b.WriteString("\n")

	// Convergence (M5).
	b.WriteString("## Lexical Convergence (M5: Mean Pairwise Jaccard)\n\n")
	b.WriteString("| Phase | Mean Jaccard | SD | n |\n")
	b.WriteString("|-------|-------------|-----|---|\n")
	for _, c := range report.Convergence {
		fmt.Fprintf(&b, "| %s | %.3f | %.3f | %d |\n",
			c.Phase, c.MeanJaccard, c.SDJaccard, c.N,
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
		{"M1 TTR", report.EffectSizes.M1TTR_d},
		{"M2 Hedging Density", report.EffectSizes.M2Hedging_d},
		{"M3 Sentence Length SD", report.EffectSizes.M3SentLenSD_d},
		{"M4 Marker Hit Rate", report.EffectSizes.M4Marker_d},
		{"M5 Jaccard Convergence", report.EffectSizes.M5Jaccard_d},
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
	fmt.Fprintf(&b, "| M1 TTR | %.4f |\n", report.Permutations.M1TTR_p)
	fmt.Fprintf(&b, "| M2 Hedging | %.4f |\n", report.Permutations.M2Hedging_p)
	fmt.Fprintf(&b, "| M3 Sentence SD | %.4f |\n", report.Permutations.M3SentSD_p)
	fmt.Fprintf(&b, "| M5 Jaccard | %.4f |\n", report.Permutations.M5Jaccard_p)
	b.WriteString("\n")

	// Per-preset breakdown.
	b.WriteString("## Per-Preset Phase Breakdown\n\n")
	for _, pp := range report.ByPreset {
		fmt.Fprintf(&b, "### %s\n\n", pp.PresetID)
		b.WriteString("| Phase | n | TTR | Hedging/1k | Sent SD | Marker % |\n")
		b.WriteString("|-------|---|-----|------------|---------|----------|\n")
		for _, p := range pp.Phases {
			fmt.Fprintf(&b, "| %s | %d | %.3f | %.3f | %.2f | %.1f%% |\n",
				p.Phase, p.N,
				p.M1TTR.Mean, p.M2Hedging.Mean,
				p.M3SentLenSD.Mean, p.M4MarkerRate*100,
			)
		}
		b.WriteString("\n")
	}

	// Per-agent breakdown.
	b.WriteString("## Per-Agent Phase Breakdown\n\n")
	b.WriteString("| Agent | Preset | Phase | n | TTR | Hedging/1k | Sent SD | Marker % |\n")
	b.WriteString("|-------|--------|-------|---|-----|------------|---------|----------|\n")
	for _, a := range report.ByAgent {
		for _, p := range a.Phases {
			fmt.Fprintf(&b, "| %s | %s | %s | %d | %.3f | %.3f | %.2f | %.1f%% |\n",
				a.AgentName, a.PresetID, p.Phase, p.N,
				p.M1TTR.Mean, p.M2Hedging.Mean,
				p.M3SentLenSD.Mean, p.M4MarkerRate*100,
			)
		}
	}
	b.WriteString("\n")

	// Suppress unused import warnings — these are used by tokenize/computeTTR etc.
	_ = utf8.RuneCountInString
	fmt.Println(b.String())
}
