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
// H3 constants
// ---------------------------------------------------------------------------

// Hedging phrases (frozen in pre-registration). Case-insensitive substring match.
var hedgingPhrases = []string{
	"i think",
	"it seems",
	"to be fair",
	"on the other hand",
	"it's worth noting",
	"arguably",
	"perhaps we should",
	"that said",
	"i understand",
	"valid point",
	"fair enough",
	"one could argue",
	"it's important to",
	"let me suggest",
	"with all due respect",
	"i hear you",
	"let's consider",
	"it's worth considering",
	"i appreciate",
	"that's a good point",
}

// Character markers per agent (frozen in pre-registration).
var characterMarkers = map[string][]string{
	// Comedy — first-contact
	"diplomat": {"united nations", "humanity", "on behalf of", "protocol", "peaceful"},
	"alien":    {"voted off", "contestants", "the bachelor", "housewives", "love island"},
	// Comedy — darwin-special
	"darwin":     {"natural selection", "one might observe", "i must confess", "the beagle", "species"},
	"tech-bro":   {"disrupt", "scale", "iterate", "product-market fit", "pivot"},
	"conspiracy": {"they don't want you to know", "do your own research", "follow the money", "it's all connected", "cover-up"},
	"cat":        {"the tall ones", "can-openers", "nap", "warm", "groom"},
	// Serious — on-the-couch
	"oversharer":         {"i feel like", "and then i realized", "my therapist", "my ex", "trauma"},
	"passive-aggressive": {"no totally", "i'm just saying", "so brave", "i mean that in the best way", "oh absolutely"},
	"therapist":          {"how does that make you feel", "let's refocus", "i hear you", "ground rules", "safe space"},
	"corporate":          {"action items", "kpis", "stakeholder", "synergize", "let's table that"},
}

// Group assignment: comedy or serious.
var presetGroup = map[string]string{
	"first-contact":  "comedy",
	"darwin-special": "comedy",
	"on-the-couch":   "serious",
}

// ---------------------------------------------------------------------------
// H3 types
// ---------------------------------------------------------------------------

type h3TurnMetrics struct {
	PresetID       string
	AgentID        string
	AgentName      string
	Group          string // "comedy" or "serious"
	BoutIndex      int
	TurnIndex      int
	TTR            float64 // M1
	TTR100         float64 // M1 normalised (first 100 words)
	HedgingDensity float64 // M2 (per 1000 chars)
	SentLenSD      float64 // M3
	MarkerHit      bool    // M4
}

type h3GroupSummary struct {
	Group        string
	N            int
	M1TTR        MeanSD
	M1TTR100     MeanSD
	M2Hedging    MeanSD
	M3SentLenSD  MeanSD
	M4MarkerRate float64
}

type h3PresetSummary struct {
	PresetID     string
	Group        string
	N            int
	M1TTR        MeanSD
	M1TTR100     MeanSD
	M2Hedging    MeanSD
	M3SentLenSD  MeanSD
	M4MarkerRate float64
}

type h3AgentSummary struct {
	AgentID    string
	AgentName  string
	PresetID   string
	Group      string
	Turns      int
	AvgTTR     float64
	AvgHedging float64
	AvgSentSD  float64
	MarkerRate float64
}

type h3EffectSizes struct {
	M1TTR_d        float64
	M1TTR100_d     float64
	M2Hedging_d    float64
	M3SentLenSD_d  float64
	M4MarkerRate_d float64
}

type h3PermResults struct {
	M1TTR_p     float64
	M2Hedging_p float64
	M3SentSD_p  float64
	Iterations  int
}

// ---------------------------------------------------------------------------
// H3 metric computations
// ---------------------------------------------------------------------------

// computeTTR returns the type-token ratio (unique words / total words).
func computeTTR(text string) float64 {
	words := tokenize(text)
	if len(words) == 0 {
		return 0
	}
	unique := make(map[string]bool)
	for _, w := range words {
		unique[w] = true
	}
	return float64(len(unique)) / float64(len(words))
}

// computeTTR100 returns TTR computed on the first 100 words only.
func computeTTR100(text string) float64 {
	words := tokenize(text)
	if len(words) == 0 {
		return 0
	}
	if len(words) > 100 {
		words = words[:100]
	}
	unique := make(map[string]bool)
	for _, w := range words {
		unique[w] = true
	}
	return float64(len(unique)) / float64(len(words))
}

// computeHedgingDensity returns hedging phrase count per 1000 characters.
func computeHedgingDensity(text string) float64 {
	n := utf8.RuneCountInString(text)
	if n == 0 {
		return 0
	}
	lower := strings.ToLower(text)
	count := 0
	for _, phrase := range hedgingPhrases {
		count += strings.Count(lower, phrase)
	}
	return float64(count) / float64(n) * 1000
}

// computeSentenceLengthSD returns the SD of sentence lengths (in words).
func computeSentenceLengthSD(text string) float64 {
	sentences := splitSentences(text)
	if len(sentences) < 2 {
		return 0
	}
	lengths := make([]float64, 0, len(sentences))
	for _, s := range sentences {
		words := tokenize(s)
		if len(words) > 0 {
			lengths = append(lengths, float64(len(words)))
		}
	}
	if len(lengths) < 2 {
		return 0
	}
	return stddev(lengths)
}

// splitSentences splits text on sentence-ending punctuation.
func splitSentences(text string) []string {
	var sentences []string
	var buf strings.Builder
	runes := []rune(text)
	for i := 0; i < len(runes); i++ {
		buf.WriteRune(runes[i])
		if runes[i] == '.' || runes[i] == '!' || runes[i] == '?' || runes[i] == ';' {
			// Check for end-of-string or whitespace after punctuation.
			if i+1 >= len(runes) || runes[i+1] == ' ' || runes[i+1] == '\n' || runes[i+1] == '\t' {
				s := strings.TrimSpace(buf.String())
				if len(s) > 0 {
					sentences = append(sentences, s)
				}
				buf.Reset()
			}
		}
	}
	// Remaining text as final sentence.
	s := strings.TrimSpace(buf.String())
	if len(s) > 0 {
		sentences = append(sentences, s)
	}
	return sentences
}

// computeMarkerHit checks if any of the agent's markers appear in the text.
func computeMarkerHit(text, agentID string) bool {
	markers, ok := characterMarkers[agentID]
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
// H3 analysis pipeline
// ---------------------------------------------------------------------------

func runH3(ctx context.Context, conn *db.DB, jsonOutput bool) {
	if !jsonOutput {
		fmt.Fprintf(os.Stderr, "\n%s\n\n", theme.Title.Render("analyze — H3 Comedy vs Serious Framing"))
	}

	boutsByPreset := queryBouts(ctx, conn, []string{"first-contact", "darwin-special", "on-the-couch"})

	totalBouts := 0
	for k, v := range boutsByPreset {
		totalBouts += len(v)
		if !jsonOutput {
			fmt.Fprintf(os.Stderr, "  %s: %d bouts\n", k, len(v))
		}
	}

	if totalBouts == 0 {
		fmt.Fprintf(os.Stderr, "\nNo completed H3 bouts found. Run H3 first:\n")
		fmt.Fprintf(os.Stderr, "  cd pitstorm && go run ./cmd/hypothesis --phase H3 --target https://www.thepit.cloud\n\n")
		os.Exit(1)
	}

	// Compute per-turn metrics.
	var allMetrics []h3TurnMetrics
	boutIdx := 0
	// Process in deterministic order.
	for _, presetID := range []string{"first-contact", "darwin-special", "on-the-couch"} {
		bouts, ok := boutsByPreset[presetID]
		if !ok {
			continue
		}
		group := presetGroup[presetID]
		for _, bout := range bouts {
			for turnIdx, entry := range bout.Transcript {
				m := h3TurnMetrics{
					PresetID:       presetID,
					AgentID:        entry.AgentID,
					AgentName:      entry.AgentName,
					Group:          group,
					BoutIndex:      boutIdx,
					TurnIndex:      turnIdx,
					TTR:            computeTTR(entry.Text),
					TTR100:         computeTTR100(entry.Text),
					HedgingDensity: computeHedgingDensity(entry.Text),
					SentLenSD:      computeSentenceLengthSD(entry.Text),
					MarkerHit:      computeMarkerHit(entry.Text, entry.AgentID),
				}
				allMetrics = append(allMetrics, m)
			}
			boutIdx++
		}
	}

	if !jsonOutput {
		fmt.Fprintf(os.Stderr, "  total turns: %d\n", len(allMetrics))
	}

	// Group metrics.
	comedyMetrics := filterByGroup(allMetrics, "comedy")
	seriousMetrics := filterByGroup(allMetrics, "serious")

	// Group summaries.
	comedySummary := summarizeGroup("comedy", comedyMetrics)
	seriousSummary := summarizeGroup("serious", seriousMetrics)

	// Per-preset summaries.
	var presetSummaries []h3PresetSummary
	for _, pid := range []string{"first-contact", "darwin-special", "on-the-couch"} {
		pm := filterByPreset(allMetrics, pid)
		if len(pm) == 0 {
			continue
		}
		presetSummaries = append(presetSummaries, summarizePreset(pid, pm))
	}

	// Per-agent summaries.
	agentSummaries := summarizeAgents(allMetrics)

	// Effect sizes: comedy vs serious.
	es := computeH3EffectSizes(comedyMetrics, seriousMetrics)

	// Permutation tests.
	perm := h3PermutationTests(allMetrics, 10_000)

	// Classify result.
	maxD := 0.0
	anyAbove015 := false
	for _, d := range []float64{math.Abs(es.M1TTR_d), math.Abs(es.M2Hedging_d), math.Abs(es.M3SentLenSD_d), math.Abs(es.M4MarkerRate_d)} {
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
		decision = fmt.Sprintf("Null result: all |d| < 0.15 (max = %.3f). No detectable framing effect.", maxD)
		thresholdHit = "null"
	} else {
		decision = fmt.Sprintf("Ambiguous: max |d| = %.3f (0.15 <= d < 0.30). LLM judge should be invoked.", maxD)
		thresholdHit = "ambiguous"
	}

	// Build and emit report.
	report := h3Report{
		Hypothesis:   "H3",
		RunAt:        time.Now().UTC().Format(time.RFC3339),
		Decision:     decision,
		ThresholdHit: thresholdHit,
		Groups:       []h3GroupSummary{comedySummary, seriousSummary},
		Presets:      presetSummaries,
		Agents:       agentSummaries,
		EffectSizes:  es,
		Permutations: perm,
	}

	emitH3Report(report, jsonOutput)
}

// ---------------------------------------------------------------------------
// H3 helpers
// ---------------------------------------------------------------------------

func filterByGroup(metrics []h3TurnMetrics, group string) []h3TurnMetrics {
	var out []h3TurnMetrics
	for _, m := range metrics {
		if m.Group == group {
			out = append(out, m)
		}
	}
	return out
}

func filterByPreset(metrics []h3TurnMetrics, presetID string) []h3TurnMetrics {
	var out []h3TurnMetrics
	for _, m := range metrics {
		if m.PresetID == presetID {
			out = append(out, m)
		}
	}
	return out
}

func summarizeGroup(group string, metrics []h3TurnMetrics) h3GroupSummary {
	ttrs := make([]float64, len(metrics))
	ttr100s := make([]float64, len(metrics))
	hedging := make([]float64, len(metrics))
	sentSD := make([]float64, len(metrics))
	markerHits := 0
	for i, m := range metrics {
		ttrs[i] = m.TTR
		ttr100s[i] = m.TTR100
		hedging[i] = m.HedgingDensity
		sentSD[i] = m.SentLenSD
		if m.MarkerHit {
			markerHits++
		}
	}
	markerRate := 0.0
	if len(metrics) > 0 {
		markerRate = float64(markerHits) / float64(len(metrics))
	}
	return h3GroupSummary{
		Group:        group,
		N:            len(metrics),
		M1TTR:        MeanSD{mean(ttrs), stddev(ttrs)},
		M1TTR100:     MeanSD{mean(ttr100s), stddev(ttr100s)},
		M2Hedging:    MeanSD{mean(hedging), stddev(hedging)},
		M3SentLenSD:  MeanSD{mean(sentSD), stddev(sentSD)},
		M4MarkerRate: markerRate,
	}
}

func summarizePreset(presetID string, metrics []h3TurnMetrics) h3PresetSummary {
	g := summarizeGroup(presetGroup[presetID], metrics)
	return h3PresetSummary{
		PresetID:     presetID,
		Group:        presetGroup[presetID],
		N:            g.N,
		M1TTR:        g.M1TTR,
		M1TTR100:     g.M1TTR100,
		M2Hedging:    g.M2Hedging,
		M3SentLenSD:  g.M3SentLenSD,
		M4MarkerRate: g.M4MarkerRate,
	}
}

func summarizeAgents(metrics []h3TurnMetrics) []h3AgentSummary {
	type accum struct {
		agentID   string
		agentName string
		presetID  string
		group     string
		ttrs      []float64
		hedging   []float64
		sentSD    []float64
		hits      int
		total     int
	}
	agentMap := make(map[string]*accum)
	for _, m := range metrics {
		a, ok := agentMap[m.AgentID]
		if !ok {
			a = &accum{
				agentID:   m.AgentID,
				agentName: m.AgentName,
				presetID:  m.PresetID,
				group:     m.Group,
			}
			agentMap[m.AgentID] = a
		}
		a.ttrs = append(a.ttrs, m.TTR)
		a.hedging = append(a.hedging, m.HedgingDensity)
		a.sentSD = append(a.sentSD, m.SentLenSD)
		a.total++
		if m.MarkerHit {
			a.hits++
		}
	}

	var out []h3AgentSummary
	for _, a := range agentMap {
		markerRate := 0.0
		if a.total > 0 {
			markerRate = float64(a.hits) / float64(a.total)
		}
		out = append(out, h3AgentSummary{
			AgentID:    a.agentID,
			AgentName:  a.agentName,
			PresetID:   a.presetID,
			Group:      a.group,
			Turns:      a.total,
			AvgTTR:     mean(a.ttrs),
			AvgHedging: mean(a.hedging),
			AvgSentSD:  mean(a.sentSD),
			MarkerRate: markerRate,
		})
	}
	// Sort: comedy first, then by agent name.
	sort.Slice(out, func(i, j int) bool {
		if out[i].Group != out[j].Group {
			return out[i].Group < out[j].Group // "comedy" < "serious"
		}
		return out[i].PresetID < out[j].PresetID || (out[i].PresetID == out[j].PresetID && out[i].AgentName < out[j].AgentName)
	})
	return out
}

func computeH3EffectSizes(comedy, serious []h3TurnMetrics) h3EffectSizes {
	cTTR := extractFloat(comedy, func(m h3TurnMetrics) float64 { return m.TTR })
	sTTR := extractFloat(serious, func(m h3TurnMetrics) float64 { return m.TTR })
	cTTR100 := extractFloat(comedy, func(m h3TurnMetrics) float64 { return m.TTR100 })
	sTTR100 := extractFloat(serious, func(m h3TurnMetrics) float64 { return m.TTR100 })
	cHedge := extractFloat(comedy, func(m h3TurnMetrics) float64 { return m.HedgingDensity })
	sHedge := extractFloat(serious, func(m h3TurnMetrics) float64 { return m.HedgingDensity })
	cSent := extractFloat(comedy, func(m h3TurnMetrics) float64 { return m.SentLenSD })
	sSent := extractFloat(serious, func(m h3TurnMetrics) float64 { return m.SentLenSD })

	// M4: convert marker hits to float for Cohen's d.
	cMarker := extractFloat(comedy, func(m h3TurnMetrics) float64 {
		if m.MarkerHit {
			return 1.0
		}
		return 0.0
	})
	sMarker := extractFloat(serious, func(m h3TurnMetrics) float64 {
		if m.MarkerHit {
			return 1.0
		}
		return 0.0
	})

	return h3EffectSizes{
		M1TTR_d:        cohensD(cTTR, sTTR),
		M1TTR100_d:     cohensD(cTTR100, sTTR100),
		M2Hedging_d:    cohensD(cHedge, sHedge),
		M3SentLenSD_d:  cohensD(cSent, sSent),
		M4MarkerRate_d: cohensD(cMarker, sMarker),
	}
}

func extractFloat(metrics []h3TurnMetrics, fn func(h3TurnMetrics) float64) []float64 {
	out := make([]float64, len(metrics))
	for i, m := range metrics {
		out[i] = fn(m)
	}
	return out
}

func h3PermutationTests(allMetrics []h3TurnMetrics, iterations int) h3PermResults {
	// Observed effect sizes.
	comedy := filterByGroup(allMetrics, "comedy")
	serious := filterByGroup(allMetrics, "serious")
	obsM1 := math.Abs(cohensD(
		extractFloat(comedy, func(m h3TurnMetrics) float64 { return m.TTR }),
		extractFloat(serious, func(m h3TurnMetrics) float64 { return m.TTR }),
	))
	obsM2 := math.Abs(cohensD(
		extractFloat(comedy, func(m h3TurnMetrics) float64 { return m.HedgingDensity }),
		extractFloat(serious, func(m h3TurnMetrics) float64 { return m.HedgingDensity }),
	))
	obsM3 := math.Abs(cohensD(
		extractFloat(comedy, func(m h3TurnMetrics) float64 { return m.SentLenSD }),
		extractFloat(serious, func(m h3TurnMetrics) float64 { return m.SentLenSD }),
	))

	m1Extreme, m2Extreme, m3Extreme := 0, 0, 0

	for iter := 0; iter < iterations; iter++ {
		// Shuffle group labels.
		shuffled := make([]h3TurnMetrics, len(allMetrics))
		copy(shuffled, allMetrics)
		// Fisher-Yates on group labels.
		groups := make([]string, len(shuffled))
		for i, m := range shuffled {
			groups[i] = m.Group
		}
		rand.Shuffle(len(groups), func(i, j int) {
			groups[i], groups[j] = groups[j], groups[i]
		})
		for i := range shuffled {
			shuffled[i].Group = groups[i]
		}

		sc := filterByGroup(shuffled, "comedy")
		ss := filterByGroup(shuffled, "serious")
		if len(sc) == 0 || len(ss) == 0 {
			continue
		}

		d1 := math.Abs(cohensD(
			extractFloat(sc, func(m h3TurnMetrics) float64 { return m.TTR }),
			extractFloat(ss, func(m h3TurnMetrics) float64 { return m.TTR }),
		))
		d2 := math.Abs(cohensD(
			extractFloat(sc, func(m h3TurnMetrics) float64 { return m.HedgingDensity }),
			extractFloat(ss, func(m h3TurnMetrics) float64 { return m.HedgingDensity }),
		))
		d3 := math.Abs(cohensD(
			extractFloat(sc, func(m h3TurnMetrics) float64 { return m.SentLenSD }),
			extractFloat(ss, func(m h3TurnMetrics) float64 { return m.SentLenSD }),
		))

		if d1 >= obsM1 {
			m1Extreme++
		}
		if d2 >= obsM2 {
			m2Extreme++
		}
		if d3 >= obsM3 {
			m3Extreme++
		}
	}

	return h3PermResults{
		M1TTR_p:     float64(m1Extreme) / float64(iterations),
		M2Hedging_p: float64(m2Extreme) / float64(iterations),
		M3SentSD_p:  float64(m3Extreme) / float64(iterations),
		Iterations:  iterations,
	}
}

// ---------------------------------------------------------------------------
// H3 report types and formatting
// ---------------------------------------------------------------------------

type h3Report struct {
	Hypothesis   string            `json:"hypothesis"`
	RunAt        string            `json:"runAt"`
	Decision     string            `json:"decision"`
	ThresholdHit string            `json:"thresholdHit"`
	Groups       []h3GroupSummary  `json:"groups"`
	Presets      []h3PresetSummary `json:"presets"`
	Agents       []h3AgentSummary  `json:"agents"`
	EffectSizes  h3EffectSizes     `json:"effectSizes"`
	Permutations h3PermResults     `json:"permutations"`
}

func emitH3Report(report h3Report, jsonOutput bool) {
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
	b.WriteString("# H3 Analysis: Comedy vs Serious Framing\n\n")
	fmt.Fprintf(&b, "Run: %s\n", report.RunAt)
	fmt.Fprintf(&b, "Decision: %s\n", report.Decision)
	fmt.Fprintf(&b, "Threshold: %s\n\n", report.ThresholdHit)

	// Group comparison.
	b.WriteString("## Group Comparison (Comedy vs Serious)\n\n")
	b.WriteString("| Group | n | M1 TTR | M1 TTR100 | M2 Hedging/1k | M3 Sent SD | M4 Marker % |\n")
	b.WriteString("|-------|---|--------|-----------|---------------|------------|-------------|\n")
	for _, g := range report.Groups {
		fmt.Fprintf(&b, "| %s | %d | %.3f +/- %.3f | %.3f +/- %.3f | %.3f +/- %.3f | %.2f +/- %.2f | %.1f%% |\n",
			g.Group, g.N,
			g.M1TTR.Mean, g.M1TTR.SD,
			g.M1TTR100.Mean, g.M1TTR100.SD,
			g.M2Hedging.Mean, g.M2Hedging.SD,
			g.M3SentLenSD.Mean, g.M3SentLenSD.SD,
			g.M4MarkerRate*100,
		)
	}
	b.WriteString("\n")

	// Effect sizes.
	b.WriteString("## Effect Sizes (Comedy vs Serious, Cohen's d)\n\n")
	b.WriteString("| Metric | d | |d| | Interpretation |\n")
	b.WriteString("|--------|------|------|----------------|\n")
	for _, row := range []struct {
		label string
		d     float64
	}{
		{"M1 TTR", report.EffectSizes.M1TTR_d},
		{"M1 TTR100", report.EffectSizes.M1TTR100_d},
		{"M2 Hedging Density", report.EffectSizes.M2Hedging_d},
		{"M3 Sentence Length SD", report.EffectSizes.M3SentLenSD_d},
		{"M4 Marker Hit Rate", report.EffectSizes.M4MarkerRate_d},
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
	b.WriteString("\n")

	// Per-preset breakdown.
	b.WriteString("## Per-Preset Breakdown\n\n")
	b.WriteString("| Preset | Group | n | TTR | TTR100 | Hedging/1k | Sent SD | Marker % |\n")
	b.WriteString("|--------|-------|---|-----|--------|------------|---------|----------|\n")
	for _, p := range report.Presets {
		fmt.Fprintf(&b, "| %s | %s | %d | %.3f | %.3f | %.3f | %.2f | %.1f%% |\n",
			p.PresetID, p.Group, p.N,
			p.M1TTR.Mean, p.M1TTR100.Mean,
			p.M2Hedging.Mean, p.M3SentLenSD.Mean,
			p.M4MarkerRate*100,
		)
	}
	b.WriteString("\n")

	// Per-agent summary.
	b.WriteString("## Per-Agent Summary\n\n")
	b.WriteString("| Agent | Preset | Group | Turns | TTR | Hedging/1k | Sent SD | Marker % |\n")
	b.WriteString("|-------|--------|-------|-------|-----|------------|---------|----------|\n")
	for _, a := range report.Agents {
		fmt.Fprintf(&b, "| %s | %s | %s | %d | %.3f | %.3f | %.2f | %.1f%% |\n",
			a.AgentName, a.PresetID, a.Group, a.Turns,
			a.AvgTTR, a.AvgHedging, a.AvgSentSD,
			a.MarkerRate*100,
		)
	}
	b.WriteString("\n")

	fmt.Println(b.String())
}
