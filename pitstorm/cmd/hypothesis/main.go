// hypothesis — systematic bout runner for The Pit research experiments.
//
// Each hypothesis is a named batch of bouts with a documented research
// question. Bouts are run sequentially against the production API with
// progress output and result capture.
//
// Usage:
//
//	go run ./cmd/hypothesis --phase H1 --target https://www.thepit.cloud
//	go run ./cmd/hypothesis --list
//
// The tool uses pitstorm's client/action/sse infrastructure to run bouts
// via POST /api/run-bout and parse the SSE stream.
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/rickhallett/thepit/pitstorm/internal/action"
	"github.com/rickhallett/thepit/pitstorm/internal/client"
	"github.com/rickhallett/thepit/shared/config"
	"github.com/rickhallett/thepit/shared/theme"
)

// Hypothesis defines a research question and the bouts needed to test it.
type Hypothesis struct {
	ID         string
	Title      string
	Question   string
	WhyMatters string
	Bouts      []BoutSpec
}

// BoutSpec defines a single bout to run.
type BoutSpec struct {
	PresetID string
	Topic    string // for presets that require input (e.g. gloves-off)
	Turns    int
	Label    string // human-readable label for this bout
}

// BoutResult captures the outcome of a single bout run.
type BoutResult struct {
	BoutID     string        `json:"boutId"`
	PresetID   string        `json:"presetId"`
	Topic      string        `json:"topic,omitempty"`
	Label      string        `json:"label"`
	Status     string        `json:"status"` // "completed", "error", "timeout"
	Turns      int           `json:"turnsCompleted"`
	TotalTurns int           `json:"turnsRequested"`
	Duration   time.Duration `json:"duration"`
	FirstByte  time.Duration `json:"firstByte"`
	Chars      int           `json:"totalChars"`
	Error      string        `json:"error,omitempty"`
	ShareLine  string        `json:"shareLine,omitempty"`
	Agents     []AgentResult `json:"agents"`
}

// AgentResult captures per-agent output.
type AgentResult struct {
	Name     string `json:"name"`
	ID       string `json:"id"`
	Turns    int    `json:"turns"`
	AvgChars int    `json:"avgChars"`
}

func main() {
	// Parse flags.
	phase := ""
	target := "https://www.thepit.cloud"
	outputDir := "results/hypotheses"
	listOnly := false

	for i := 1; i < len(os.Args); i++ {
		switch os.Args[i] {
		case "--phase":
			i++
			if i < len(os.Args) {
				phase = os.Args[i]
			}
		case "--target":
			i++
			if i < len(os.Args) {
				target = os.Args[i]
			}
		case "--output":
			i++
			if i < len(os.Args) {
				outputDir = os.Args[i]
			}
		case "--list":
			listOnly = true
		case "--help", "-h":
			usage()
			return
		}
	}

	hypotheses := allHypotheses()

	if listOnly {
		fmt.Printf("\n%s\n\n", theme.Title.Render("hypothesis — available phases"))
		for _, h := range hypotheses {
			fmt.Printf("  %s  %s (%d bouts)\n", theme.Accent.Render(h.ID), h.Title, len(h.Bouts))
			fmt.Printf("          %s\n\n", h.Question)
		}
		return
	}

	if phase == "" {
		fmt.Fprintf(os.Stderr, "error: --phase required. Use --list to see available phases.\n")
		os.Exit(1)
	}

	// Find the hypothesis.
	var hyp *Hypothesis
	for i := range hypotheses {
		if strings.EqualFold(hypotheses[i].ID, phase) {
			hyp = &hypotheses[i]
			break
		}
	}
	if hyp == nil {
		fmt.Fprintf(os.Stderr, "error: unknown phase %q\n", phase)
		os.Exit(1)
	}

	// Ensure output directory exists.
	os.MkdirAll(outputDir, 0755)

	fmt.Printf("\n%s\n\n", theme.Title.Render("hypothesis — "+hyp.ID))
	fmt.Printf("  %s\n", theme.Bold.Render(hyp.Title))
	fmt.Printf("  %s\n", hyp.Question)
	fmt.Printf("  %s\n\n", theme.Muted.Render(hyp.WhyMatters))
	fmt.Printf("  Target:  %s\n", target)
	fmt.Printf("  Bouts:   %d\n", len(hyp.Bouts))
	fmt.Printf("  Output:  %s/%s.json\n\n", outputDir, hyp.ID)

	// Create HTTP client with research bypass header.
	cfg := client.DefaultConfig(target)

	// Load RESEARCH_API_KEY from .env via shared/config (os.Getenv won't
	// have it unless explicitly exported — godotenv reads into a map, not
	// the process environment).
	researchKey := os.Getenv("RESEARCH_API_KEY")
	if researchKey == "" {
		if envCfg, err := config.Load(""); err == nil {
			researchKey = envCfg.Vars["RESEARCH_API_KEY"]
		}
	}
	if researchKey == "" {
		fmt.Fprintf(os.Stderr, "  %s RESEARCH_API_KEY not set — bouts will hit rate limits.\n",
			theme.Warning.Render("warn:"))
		fmt.Fprintf(os.Stderr, "  Set it in .env or export it to bypass per-tier rate limits.\n\n")
	} else {
		cfg.CustomHeaders = map[string]string{
			"X-Research-Key": researchKey,
		}
		fmt.Printf("  Auth:    %s\n", theme.Success.Render("research bypass"))
	}

	cl := client.New(cfg, func(format string, args ...any) {})
	defer cl.Close()
	act := action.New(cl)

	// Handle graceful shutdown.
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-sigCh
		fmt.Printf("\n  %s shutting down after current bout...\n", theme.Warning.Render("signal:"))
		cancel()
	}()

	// Run bouts sequentially.
	var results []BoutResult
	completed, errored := 0, 0

	for i, spec := range hyp.Bouts {
		if ctx.Err() != nil {
			break
		}

		boutID := action.GenerateID(21)
		fmt.Printf("  [%d/%d] %s %s (preset=%s",
			i+1, len(hyp.Bouts),
			theme.Accent.Render("▶"),
			spec.Label, spec.PresetID)
		if spec.Topic != "" {
			fmt.Printf(", topic=%q", truncate(spec.Topic, 40))
		}
		fmt.Printf(")  ")

		// Per-bout timeout: 5 minutes max.
		boutCtx, boutCancel := context.WithTimeout(ctx, 5*time.Minute)

		handle, err := act.RunBoutStream(boutCtx, "", action.RunBoutRequest{
			BoutID:   boutID,
			PresetID: spec.PresetID,
			Topic:    spec.Topic,
			Turns:    spec.Turns,
		})

		if err != nil {
			boutCancel()
			fmt.Printf("%s %v\n", theme.Error.Render("FAIL"), err)
			results = append(results, BoutResult{
				BoutID:     boutID,
				PresetID:   spec.PresetID,
				Topic:      spec.Topic,
				Label:      spec.Label,
				Status:     "error",
				TotalTurns: spec.Turns,
				Error:      err.Error(),
			})
			errored++
			continue
		}

		if handle.StatusCode >= 400 {
			handle.Close()
			boutCancel()
			fmt.Printf("%s HTTP %d\n", theme.Error.Render("FAIL"), handle.StatusCode)
			results = append(results, BoutResult{
				BoutID:     boutID,
				PresetID:   spec.PresetID,
				Topic:      spec.Topic,
				Label:      spec.Label,
				Status:     "error",
				TotalTurns: spec.Turns,
				Error:      fmt.Sprintf("HTTP %d", handle.StatusCode),
			})
			errored++
			continue
		}

		// Parse SSE stream.
		stream, parseErr := client.ParseSSEStream(handle.Body, nil)
		handle.Close()
		boutCancel()

		result := BoutResult{
			BoutID:     boutID,
			PresetID:   spec.PresetID,
			Topic:      spec.Topic,
			Label:      spec.Label,
			TotalTurns: spec.Turns,
		}

		if parseErr != nil {
			fmt.Printf("%s %v\n", theme.Error.Render("PARSE"), parseErr)
			result.Status = "error"
			result.Error = parseErr.Error()
			errored++
		} else if stream.Error != "" {
			fmt.Printf("%s %s\n", theme.Error.Render("STREAM"), stream.Error)
			result.Status = "error"
			result.Error = stream.Error
			errored++
		} else {
			result.Status = "completed"
			result.Turns = len(stream.Turns)
			result.Duration = stream.Duration
			result.FirstByte = stream.FirstByte
			result.Chars = stream.TotalChars
			result.ShareLine = stream.ShareLine

			// Aggregate per-agent stats.
			agentMap := make(map[string]*AgentResult)
			for _, t := range stream.Turns {
				ar, ok := agentMap[t.AgentID]
				if !ok {
					ar = &AgentResult{Name: t.AgentName, ID: t.AgentID}
					agentMap[t.AgentID] = ar
				}
				ar.Turns++
				ar.AvgChars += len(t.Text)
			}
			for _, ar := range agentMap {
				if ar.Turns > 0 {
					ar.AvgChars /= ar.Turns
				}
				result.Agents = append(result.Agents, *ar)
			}

			fmt.Printf("%s %d turns, %d chars, %s\n",
				theme.Success.Render("OK"),
				result.Turns, result.Chars,
				result.Duration.Truncate(time.Second))
			completed++
		}

		results = append(results, result)

		// Brief pause between bouts to avoid hammering.
		if i < len(hyp.Bouts)-1 && ctx.Err() == nil {
			time.Sleep(3 * time.Second)
		}
	}

	// Write results.
	outPath := fmt.Sprintf("%s/%s.json", outputDir, hyp.ID)
	output := struct {
		Hypothesis string       `json:"hypothesis"`
		Title      string       `json:"title"`
		Question   string       `json:"question"`
		RunAt      time.Time    `json:"runAt"`
		Target     string       `json:"target"`
		Completed  int          `json:"completed"`
		Errored    int          `json:"errored"`
		Total      int          `json:"total"`
		Results    []BoutResult `json:"results"`
	}{
		Hypothesis: hyp.ID,
		Title:      hyp.Title,
		Question:   hyp.Question,
		RunAt:      time.Now().UTC(),
		Target:     target,
		Completed:  completed,
		Errored:    errored,
		Total:      len(results),
		Results:    results,
	}

	data, _ := json.MarshalIndent(output, "", "  ")
	os.WriteFile(outPath, data, 0644)

	// Summary.
	fmt.Printf("\n%s\n\n", theme.Title.Render("hypothesis — summary"))
	fmt.Printf("  Completed:  %d / %d\n", completed, len(hyp.Bouts))
	fmt.Printf("  Errored:    %d\n", errored)
	fmt.Printf("  Results:    %s\n\n", outPath)
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "..."
}

func usage() {
	fmt.Printf("\n%s\n\n", theme.Title.Render("hypothesis — systematic bout runner"))
	fmt.Println("  Usage: go run ./cmd/hypothesis [flags]")
	fmt.Println()
	fmt.Println("  Flags:")
	fmt.Println("    --phase <ID>     Hypothesis to run (e.g. H1, H2, ...)")
	fmt.Println("    --target <url>   Target URL (default: https://www.thepit.cloud)")
	fmt.Println("    --output <dir>   Output directory (default: results/hypotheses)")
	fmt.Println("    --list           List available hypotheses")
	fmt.Println("    --help           Show this help")
	fmt.Println()
}
