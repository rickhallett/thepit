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
// H4 constants
// ---------------------------------------------------------------------------

// h4Presets maps preset ID to agent count. H4 uses ALL completed bouts
// for these presets (including those from H2/H3 runs).
var h4Presets = map[string]int{
	"first-contact": 2,
	"shark-pit":     4,
	"flatshare":     5,
	"summit":        6,
}

// h4PresetOrder is the deterministic processing order.
var h4PresetOrder = []string{"first-contact", "shark-pit", "flatshare", "summit"}

// ---------------------------------------------------------------------------
// H4 types
// ---------------------------------------------------------------------------

// h4BoutMetrics holds per-agent metrics computed for one bout.
type h4BoutMetrics struct {
	PresetID   string
	AgentCount int
	BoutID     string
	Agents     []h4AgentBoutMetrics
	// Conversation-level metrics
	ConvoTTR float64 // M4: TTR of entire conversation
}

type h4AgentBoutMetrics struct {
	AgentID      string
	AgentName    string
	TurnCount    int
	AvgCharCount float64 // M1: mean chars per turn
	AgentTTR     float64 // M2: TTR across concatenated turns
	AvgNovelty   float64 // M3: mean novel vocabulary rate per turn
}

// h4GroupSummary aggregates metrics per agent-count group.
type h4GroupSummary struct {
	AgentCount int
	PresetID   string
	BoutCount  int
	TotalTurns int
	M1AvgChars MeanSD // per-agent avg char count, averaged across bouts
	M2AgentTTR MeanSD // per-agent TTR, averaged across bouts
	M3Novelty  MeanSD // per-turn novel vocabulary rate
	M4ConvoTTR MeanSD // per-bout conversation TTR
}

type h4EffectSizes struct {
	M1Chars_d    float64 `json:"m1_chars_d"`
	M2AgentTTR_d float64 `json:"m2_agentTTR_d"`
	M3Novelty_d  float64 `json:"m3_novelty_d"`
	M4ConvoTTR_d float64 `json:"m4_convoTTR_d"`
}

type h4PairwiseEffect struct {
	GroupA  int           `json:"groupA"`
	GroupB  int           `json:"groupB"`
	Effects h4EffectSizes `json:"effects"`
}

type h4PermResults struct {
	M1Chars_p    float64 `json:"m1_chars_p"`
	M2AgentTTR_p float64 `json:"m2_agentTTR_p"`
	M3Novelty_p  float64 `json:"m3_novelty_p"`
	M4ConvoTTR_p float64 `json:"m4_convoTTR_p"`
	Iterations   int     `json:"iterations"`
}

type h4AgentSummary struct {
	AgentID    string  `json:"agentId"`
	AgentName  string  `json:"agentName"`
	PresetID   string  `json:"presetId"`
	AgentCount int     `json:"agentCount"`
	Bouts      int     `json:"bouts"`
	TotalTurns int     `json:"totalTurns"`
	AvgChars   float64 `json:"avgChars"`
	AgentTTR   float64 `json:"agentTTR"`
	AvgNovelty float64 `json:"avgNovelty"`
}

type h4Report struct {
	Hypothesis    string             `json:"hypothesis"`
	RunAt         string             `json:"runAt"`
	Decision      string             `json:"decision"`
	ThresholdHit  string             `json:"thresholdHit"`
	Groups        []h4GroupSummary   `json:"groups"`
	PrimaryEffect h4EffectSizes      `json:"primaryEffect"`
	Pairwise      []h4PairwiseEffect `json:"pairwise"`
	Permutations  h4PermResults      `json:"permutations"`
	Agents        []h4AgentSummary   `json:"agents"`
	Trend         h4TrendResult      `json:"trend"`
}

type h4TrendResult struct {
	M1R float64 `json:"m1_r"` // Pearson r: agent count vs M1
	M2R float64 `json:"m2_r"`
	M3R float64 `json:"m3_r"`
	M4R float64 `json:"m4_r"`
}

// groupFlat holds flat arrays of metric values for a single agent-count group,
// used for pairwise Cohen's d and permutation tests.
type groupFlat struct {
	agentCount int
	m1Vals     []float64 // per-agent-bout avg chars
	m2Vals     []float64 // per-agent-bout TTR
	m3Vals     []float64 // per-turn novelty
	m4Vals     []float64 // per-bout convo TTR
}

// ---------------------------------------------------------------------------
// H4 metric computations
// ---------------------------------------------------------------------------

// computeAgentTTR computes TTR across all of an agent's concatenated text.
func computeAgentTTR(texts []string) float64 {
	var all []string
	for _, t := range texts {
		all = append(all, tokenize(t)...)
	}
	if len(all) == 0 {
		return 0
	}
	unique := make(map[string]bool)
	for _, w := range all {
		unique[w] = true
	}
	return float64(len(unique)) / float64(len(all))
}

// computeConvoTTR computes TTR across all turns in a bout.
func computeConvoTTR(transcript []TranscriptEntry) float64 {
	var all []string
	for _, e := range transcript {
		all = append(all, tokenize(e.Text)...)
	}
	if len(all) == 0 {
		return 0
	}
	unique := make(map[string]bool)
	for _, w := range all {
		unique[w] = true
	}
	return float64(len(unique)) / float64(len(all))
}

// ---------------------------------------------------------------------------
// H4 analysis pipeline
// ---------------------------------------------------------------------------

func runH4(ctx context.Context, conn *db.DB, jsonOutput bool) {
	if !jsonOutput {
		fmt.Fprintf(os.Stderr, "\n%s\n\n", theme.Title.Render("analyze — H4 Agent Count Scaling"))
	}

	boutsByPreset := queryBouts(ctx, conn, h4PresetOrder)

	totalBouts := 0
	for _, pid := range h4PresetOrder {
		bouts := boutsByPreset[pid]
		totalBouts += len(bouts)
		if !jsonOutput {
			fmt.Fprintf(os.Stderr, "  %s: %d bouts\n", pid, len(bouts))
		}
	}

	if totalBouts == 0 {
		fmt.Fprintf(os.Stderr, "\nNo completed H4 bouts found. Run H4 first:\n")
		fmt.Fprintf(os.Stderr, "  cd pitstorm && go run ./cmd/hypothesis --phase H4 --target https://www.thepit.cloud\n\n")
		os.Exit(1)
	}

	// Compute per-bout metrics for each preset.
	allBoutMetrics := make(map[string][]h4BoutMetrics) // keyed by preset
	// Per-turn novelty values tagged by agent count (for permutation tests).
	type taggedNovelty struct {
		AgentCount int
		BoutIdx    int
		Value      float64
	}
	var allNoveltyTurns []taggedNovelty

	// Per-agent accumulators across bouts.
	type agentAccum struct {
		agentID   string
		agentName string
		presetID  string
		count     int // agent count in preset
		chars     []float64
		ttrs      []float64
		novelty   []float64
		turns     int
		bouts     int
	}
	agentMap := make(map[string]*agentAccum)

	boutGlobalIdx := 0
	for _, pid := range h4PresetOrder {
		bouts, ok := boutsByPreset[pid]
		if !ok {
			continue
		}
		agentCount := h4Presets[pid]

		for _, bout := range bouts {
			// Group turns by agent.
			agentTurns := make(map[string][]string)  // agentID -> texts
			agentNames := make(map[string]string)    // agentID -> name
			agentChars := make(map[string][]float64) // agentID -> char counts

			for _, entry := range bout.Transcript {
				agentTurns[entry.AgentID] = append(agentTurns[entry.AgentID], entry.Text)
				agentNames[entry.AgentID] = entry.AgentName
				agentChars[entry.AgentID] = append(agentChars[entry.AgentID],
					float64(utf8.RuneCountInString(entry.Text)))
			}

			// Compute per-turn novelty (reuse computeM2 from main.go).
			var boutNovelties []float64
			for turnIdx, entry := range bout.Transcript {
				priorTexts := make([]string, turnIdx)
				for i := 0; i < turnIdx; i++ {
					priorTexts[i] = bout.Transcript[i].Text
				}
				nov := computeM2(entry.Text, priorTexts)
				boutNovelties = append(boutNovelties, nov)
				allNoveltyTurns = append(allNoveltyTurns, taggedNovelty{
					AgentCount: agentCount,
					BoutIdx:    boutGlobalIdx,
					Value:      nov,
				})
			}

			// Build per-agent bout metrics.
			var agents []h4AgentBoutMetrics
			for aid, texts := range agentTurns {
				chars := agentChars[aid]
				avgChars := mean(chars)
				ttr := computeAgentTTR(texts)

				// Per-agent novelty: mean of this agent's turns' novelty values.
				var agentNovs []float64
				for turnIdx, entry := range bout.Transcript {
					if entry.AgentID == aid {
						agentNovs = append(agentNovs, boutNovelties[turnIdx])
					}
				}

				agents = append(agents, h4AgentBoutMetrics{
					AgentID:      aid,
					AgentName:    agentNames[aid],
					TurnCount:    len(texts),
					AvgCharCount: avgChars,
					AgentTTR:     ttr,
					AvgNovelty:   mean(agentNovs),
				})

				// Accumulate per-agent across bouts.
				aa, ok := agentMap[aid+"|"+pid]
				if !ok {
					aa = &agentAccum{
						agentID:   aid,
						agentName: agentNames[aid],
						presetID:  pid,
						count:     agentCount,
					}
					agentMap[aid+"|"+pid] = aa
				}
				aa.chars = append(aa.chars, avgChars)
				aa.ttrs = append(aa.ttrs, ttr)
				aa.novelty = append(aa.novelty, mean(agentNovs))
				aa.turns += len(texts)
				aa.bouts++
			}

			convoTTR := computeConvoTTR(bout.Transcript)

			allBoutMetrics[pid] = append(allBoutMetrics[pid], h4BoutMetrics{
				PresetID:   pid,
				AgentCount: agentCount,
				BoutID:     bout.ID,
				Agents:     agents,
				ConvoTTR:   convoTTR,
			})
			boutGlobalIdx++
		}
	}

	// Build group summaries per preset.
	var groups []h4GroupSummary
	// Also collect per-group flat values for pairwise comparisons.
	groupData := make(map[int]*groupFlat)

	for _, pid := range h4PresetOrder {
		bm := allBoutMetrics[pid]
		if len(bm) == 0 {
			continue
		}
		ac := h4Presets[pid]

		var m1Vals, m2Vals, m4Vals []float64
		totalTurns := 0

		for _, bout := range bm {
			m4Vals = append(m4Vals, bout.ConvoTTR)
			for _, a := range bout.Agents {
				m1Vals = append(m1Vals, a.AvgCharCount)
				m2Vals = append(m2Vals, a.AgentTTR)
				totalTurns += a.TurnCount
			}
		}

		// Collect all per-turn novelty values for this preset.
		var m3Vals []float64
		for _, nt := range allNoveltyTurns {
			if nt.AgentCount == ac {
				m3Vals = append(m3Vals, nt.Value)
			}
		}

		groups = append(groups, h4GroupSummary{
			AgentCount: ac,
			PresetID:   pid,
			BoutCount:  len(bm),
			TotalTurns: totalTurns,
			M1AvgChars: MeanSD{mean(m1Vals), stddev(m1Vals)},
			M2AgentTTR: MeanSD{mean(m2Vals), stddev(m2Vals)},
			M3Novelty:  MeanSD{mean(m3Vals), stddev(m3Vals)},
			M4ConvoTTR: MeanSD{mean(m4Vals), stddev(m4Vals)},
		})

		// Merge into groupData by agent count.
		gf, ok := groupData[ac]
		if !ok {
			gf = &groupFlat{agentCount: ac}
			groupData[ac] = gf
		}
		gf.m1Vals = append(gf.m1Vals, m1Vals...)
		gf.m2Vals = append(gf.m2Vals, m2Vals...)
		gf.m3Vals = append(gf.m3Vals, m3Vals...)
		gf.m4Vals = append(gf.m4Vals, m4Vals...)
	}

	if !jsonOutput {
		totalTurns := 0
		for _, g := range groups {
			totalTurns += g.TotalTurns
		}
		fmt.Fprintf(os.Stderr, "  total turns: %d\n", totalTurns)
	}

	// Primary effect: 2-agent vs 6-agent.
	g2 := groupData[2]
	g6 := groupData[6]
	primaryEffect := h4EffectSizes{}
	if g2 != nil && g6 != nil {
		primaryEffect = h4EffectSizes{
			M1Chars_d:    cohensD(g2.m1Vals, g6.m1Vals),
			M2AgentTTR_d: cohensD(g2.m2Vals, g6.m2Vals),
			M3Novelty_d:  cohensD(g2.m3Vals, g6.m3Vals),
			M4ConvoTTR_d: cohensD(g2.m4Vals, g6.m4Vals),
		}
	}

	// All pairwise comparisons.
	agentCounts := []int{2, 4, 5, 6}
	var pairwise []h4PairwiseEffect
	for i := 0; i < len(agentCounts); i++ {
		for j := i + 1; j < len(agentCounts); j++ {
			a, b := agentCounts[i], agentCounts[j]
			ga, gb := groupData[a], groupData[b]
			if ga == nil || gb == nil {
				continue
			}
			pairwise = append(pairwise, h4PairwiseEffect{
				GroupA: a,
				GroupB: b,
				Effects: h4EffectSizes{
					M1Chars_d:    cohensD(ga.m1Vals, gb.m1Vals),
					M2AgentTTR_d: cohensD(ga.m2Vals, gb.m2Vals),
					M3Novelty_d:  cohensD(ga.m3Vals, gb.m3Vals),
					M4ConvoTTR_d: cohensD(ga.m4Vals, gb.m4Vals),
				},
			})
		}
	}

	// Permutation test: 2v6 primary comparison (10k iterations).
	perm := h4PermutationTest(g2, g6, 10_000)

	// Linear trend: Pearson r between agent count and group means.
	trend := computeH4Trend(groupData, agentCounts)

	// Classify result based on primary (2v6) effect.
	maxD := 0.0
	anyAbove015 := false
	for _, d := range []float64{
		math.Abs(primaryEffect.M1Chars_d),
		math.Abs(primaryEffect.M2AgentTTR_d),
		math.Abs(primaryEffect.M3Novelty_d),
		math.Abs(primaryEffect.M4ConvoTTR_d),
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
		decision = fmt.Sprintf("Null result: all |d| < 0.15 (max = %.3f). No detectable scaling effect.", maxD)
		thresholdHit = "null"
	} else {
		decision = fmt.Sprintf("Ambiguous: max |d| = %.3f (0.15 <= d < 0.30). LLM judge should be invoked.", maxD)
		thresholdHit = "ambiguous"
	}

	// Per-agent summary.
	var agentSummaries []h4AgentSummary
	for _, aa := range agentMap {
		agentSummaries = append(agentSummaries, h4AgentSummary{
			AgentID:    aa.agentID,
			AgentName:  aa.agentName,
			PresetID:   aa.presetID,
			AgentCount: aa.count,
			Bouts:      aa.bouts,
			TotalTurns: aa.turns,
			AvgChars:   mean(aa.chars),
			AgentTTR:   mean(aa.ttrs),
			AvgNovelty: mean(aa.novelty),
		})
	}
	sort.Slice(agentSummaries, func(i, j int) bool {
		if agentSummaries[i].AgentCount != agentSummaries[j].AgentCount {
			return agentSummaries[i].AgentCount < agentSummaries[j].AgentCount
		}
		return agentSummaries[i].AgentName < agentSummaries[j].AgentName
	})

	report := h4Report{
		Hypothesis:    "H4",
		RunAt:         time.Now().UTC().Format(time.RFC3339),
		Decision:      decision,
		ThresholdHit:  thresholdHit,
		Groups:        groups,
		PrimaryEffect: primaryEffect,
		Pairwise:      pairwise,
		Permutations:  perm,
		Agents:        agentSummaries,
		Trend:         trend,
	}

	emitH4Report(report, jsonOutput)
}

// ---------------------------------------------------------------------------
// H4 permutation test
// ---------------------------------------------------------------------------

func h4PermutationTest(g2, g6 *groupFlat, iterations int) h4PermResults {
	if g2 == nil || g6 == nil {
		return h4PermResults{Iterations: iterations}
	}

	// Observed effect sizes.
	obsM1 := math.Abs(cohensD(g2.m1Vals, g6.m1Vals))
	obsM2 := math.Abs(cohensD(g2.m2Vals, g6.m2Vals))
	obsM3 := math.Abs(cohensD(g2.m3Vals, g6.m3Vals))
	obsM4 := math.Abs(cohensD(g2.m4Vals, g6.m4Vals))

	n2m1 := len(g2.m1Vals)
	n2m2 := len(g2.m2Vals)
	n2m3 := len(g2.m3Vals)
	n2m4 := len(g2.m4Vals)

	m1Extreme, m2Extreme, m3Extreme, m4Extreme := 0, 0, 0, 0

	for iter := 0; iter < iterations; iter++ {
		// M1: shuffle combined pool, split at original boundary.
		m1Pool := append(append([]float64{}, g2.m1Vals...), g6.m1Vals...)
		rand.Shuffle(len(m1Pool), func(i, j int) { m1Pool[i], m1Pool[j] = m1Pool[j], m1Pool[i] })
		if math.Abs(cohensD(m1Pool[:n2m1], m1Pool[n2m1:])) >= obsM1 {
			m1Extreme++
		}

		m2Pool := append(append([]float64{}, g2.m2Vals...), g6.m2Vals...)
		rand.Shuffle(len(m2Pool), func(i, j int) { m2Pool[i], m2Pool[j] = m2Pool[j], m2Pool[i] })
		if math.Abs(cohensD(m2Pool[:n2m2], m2Pool[n2m2:])) >= obsM2 {
			m2Extreme++
		}

		m3Pool := append(append([]float64{}, g2.m3Vals...), g6.m3Vals...)
		rand.Shuffle(len(m3Pool), func(i, j int) { m3Pool[i], m3Pool[j] = m3Pool[j], m3Pool[i] })
		if math.Abs(cohensD(m3Pool[:n2m3], m3Pool[n2m3:])) >= obsM3 {
			m3Extreme++
		}

		m4Pool := append(append([]float64{}, g2.m4Vals...), g6.m4Vals...)
		rand.Shuffle(len(m4Pool), func(i, j int) { m4Pool[i], m4Pool[j] = m4Pool[j], m4Pool[i] })
		if math.Abs(cohensD(m4Pool[:n2m4], m4Pool[n2m4:])) >= obsM4 {
			m4Extreme++
		}
	}

	return h4PermResults{
		M1Chars_p:    float64(m1Extreme) / float64(iterations),
		M2AgentTTR_p: float64(m2Extreme) / float64(iterations),
		M3Novelty_p:  float64(m3Extreme) / float64(iterations),
		M4ConvoTTR_p: float64(m4Extreme) / float64(iterations),
		Iterations:   iterations,
	}
}

// ---------------------------------------------------------------------------
// H4 trend test (Pearson r)
// ---------------------------------------------------------------------------

func pearsonR(x, y []float64) float64 {
	if len(x) != len(y) || len(x) < 2 {
		return 0
	}
	mx, my := mean(x), mean(y)
	var num, dx2, dy2 float64
	for i := range x {
		dx := x[i] - mx
		dy := y[i] - my
		num += dx * dy
		dx2 += dx * dx
		dy2 += dy * dy
	}
	denom := math.Sqrt(dx2 * dy2)
	if denom == 0 {
		return 0
	}
	return num / denom
}

func computeH4Trend(groupData map[int]*groupFlat, agentCounts []int) h4TrendResult {
	// Build parallel arrays: agent count, group mean for each metric.
	// Use per-data-point expansion (each individual value paired with its group's agent count)
	// for a more robust correlation than group-means-only (which would be n=4).
	var xM1, yM1, xM2, yM2, xM3, yM3, xM4, yM4 []float64

	for _, ac := range agentCounts {
		gf := groupData[ac]
		if gf == nil {
			continue
		}
		acf := float64(ac)
		for _, v := range gf.m1Vals {
			xM1 = append(xM1, acf)
			yM1 = append(yM1, v)
		}
		for _, v := range gf.m2Vals {
			xM2 = append(xM2, acf)
			yM2 = append(yM2, v)
		}
		for _, v := range gf.m3Vals {
			xM3 = append(xM3, acf)
			yM3 = append(yM3, v)
		}
		for _, v := range gf.m4Vals {
			xM4 = append(xM4, acf)
			yM4 = append(yM4, v)
		}
	}

	return h4TrendResult{
		M1R: pearsonR(xM1, yM1),
		M2R: pearsonR(xM2, yM2),
		M3R: pearsonR(xM3, yM3),
		M4R: pearsonR(xM4, yM4),
	}
}

// ---------------------------------------------------------------------------
// H4 report formatting
// ---------------------------------------------------------------------------

func emitH4Report(report h4Report, jsonOutput bool) {
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
	b.WriteString("# H4 Analysis: Agent Count Scaling Effects\n\n")
	fmt.Fprintf(&b, "Run: %s\n", report.RunAt)
	fmt.Fprintf(&b, "Decision: %s\n", report.Decision)
	fmt.Fprintf(&b, "Threshold: %s\n\n", report.ThresholdHit)

	// Group summaries.
	b.WriteString("## Per-Preset Summary\n\n")
	b.WriteString("| Preset | N | Bouts | Turns | M1 Chars/Agent (mean +/- SD) | M2 Agent TTR (mean +/- SD) | M3 Novelty (mean +/- SD) | M4 Convo TTR (mean +/- SD) |\n")
	b.WriteString("|--------|---|-------|-------|------------------------------|----------------------------|--------------------------|----------------------------|\n")
	for _, g := range report.Groups {
		fmt.Fprintf(&b, "| %s | %d | %d | %d | %.0f +/- %.0f | %.3f +/- %.3f | %.3f +/- %.3f | %.3f +/- %.3f |\n",
			g.PresetID, g.AgentCount, g.BoutCount, g.TotalTurns,
			g.M1AvgChars.Mean, g.M1AvgChars.SD,
			g.M2AgentTTR.Mean, g.M2AgentTTR.SD,
			g.M3Novelty.Mean, g.M3Novelty.SD,
			g.M4ConvoTTR.Mean, g.M4ConvoTTR.SD,
		)
	}
	b.WriteString("\n")

	// Primary effect (2v6).
	b.WriteString("## Primary Effect (2-agent vs 6-agent, Cohen's d)\n\n")
	b.WriteString("| Metric | d | |d| | Interpretation |\n")
	b.WriteString("|--------|------|------|----------------|\n")
	for _, row := range []struct {
		label string
		d     float64
	}{
		{"M1 Per-Agent Chars", report.PrimaryEffect.M1Chars_d},
		{"M2 Per-Agent TTR", report.PrimaryEffect.M2AgentTTR_d},
		{"M3 Novel Vocabulary", report.PrimaryEffect.M3Novelty_d},
		{"M4 Conversation TTR", report.PrimaryEffect.M4ConvoTTR_d},
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
	b.WriteString("## Permutation Tests — 2v6 (10,000 iterations)\n\n")
	b.WriteString("| Metric | p-value |\n")
	b.WriteString("|--------|--------|\n")
	fmt.Fprintf(&b, "| M1 Per-Agent Chars | %.4f |\n", report.Permutations.M1Chars_p)
	fmt.Fprintf(&b, "| M2 Per-Agent TTR | %.4f |\n", report.Permutations.M2AgentTTR_p)
	fmt.Fprintf(&b, "| M3 Novel Vocabulary | %.4f |\n", report.Permutations.M3Novelty_p)
	fmt.Fprintf(&b, "| M4 Conversation TTR | %.4f |\n", report.Permutations.M4ConvoTTR_p)
	b.WriteString("\n")

	// All pairwise.
	b.WriteString("## All Pairwise Comparisons (Cohen's d)\n\n")
	b.WriteString("| Comparison | M1 Chars d | M2 TTR d | M3 Novelty d | M4 Convo TTR d |\n")
	b.WriteString("|------------|-----------|---------|-------------|----------------|\n")
	for _, pw := range report.Pairwise {
		fmt.Fprintf(&b, "| %dv%d | %.3f | %.3f | %.3f | %.3f |\n",
			pw.GroupA, pw.GroupB,
			pw.Effects.M1Chars_d, pw.Effects.M2AgentTTR_d,
			pw.Effects.M3Novelty_d, pw.Effects.M4ConvoTTR_d,
		)
	}
	b.WriteString("\n")

	// Trend.
	b.WriteString("## Linear Trend (Pearson r: agent count vs metric)\n\n")
	b.WriteString("| Metric | r | Interpretation |\n")
	b.WriteString("|--------|------|----------------|\n")
	for _, row := range []struct {
		label string
		r     float64
	}{
		{"M1 Per-Agent Chars", report.Trend.M1R},
		{"M2 Per-Agent TTR", report.Trend.M2R},
		{"M3 Novel Vocabulary", report.Trend.M3R},
		{"M4 Conversation TTR", report.Trend.M4R},
	} {
		interp := "weak"
		absR := math.Abs(row.r)
		if absR >= 0.7 {
			interp = "strong"
		} else if absR >= 0.4 {
			interp = "moderate"
		}
		fmt.Fprintf(&b, "| %s | %.3f | %s |\n", row.label, row.r, interp)
	}
	b.WriteString("\n")

	// Per-agent summary.
	b.WriteString("## Per-Agent Summary\n\n")
	b.WriteString("| Agent | Preset | N | Bouts | Turns | Avg Chars | Agent TTR | Avg Novelty |\n")
	b.WriteString("|-------|--------|---|-------|-------|-----------|-----------|-------------|\n")
	for _, a := range report.Agents {
		fmt.Fprintf(&b, "| %s | %s | %d | %d | %d | %.0f | %.3f | %.3f |\n",
			a.AgentName, a.PresetID, a.AgentCount, a.Bouts, a.TotalTurns,
			a.AvgChars, a.AgentTTR, a.AvgNovelty,
		)
	}
	b.WriteString("\n")

	fmt.Println(b.String())
}
