// pitkeel — operational stability signals from git state.
//
// Reads the local repository and surfaces observable signals about
// session behaviour. Does not interpret. Does not diagnose. Instruments.
//
// Usage:
//
//	pitkeel              # run all signal checks
//	pitkeel session      # session duration + commit velocity
//	pitkeel scope        # scope drift from first commit
//	pitkeel velocity     # commits per hour with acceleration
package main

import (
	"flag"
	"fmt"
	"math"
	"os"
	"os/exec"
	"sort"
	"strings"
	"time"

	"github.com/rickhallett/thepit/shared/theme"
)

var version = "dev"

func main() {
	flag.Usage = usage
	flag.Parse()

	args := flag.Args()
	if len(args) == 0 {
		runSession()
		fmt.Println()
		runScope()
		fmt.Println()
		runVelocity()
		return
	}

	switch args[0] {
	case "session":
		runSession()
	case "scope":
		runScope()
	case "velocity":
		runVelocity()
	case "version":
		fmt.Println(version)
	default:
		usage()
		os.Exit(1)
	}
}

func usage() {
	fmt.Println(theme.Title.Render("pitkeel") + " — operational stability signals")
	fmt.Println()
	fmt.Println(theme.Muted.Render("Usage:"))
	fmt.Println("  pitkeel              run all signal checks")
	fmt.Println("  pitkeel session      session duration + activity")
	fmt.Println("  pitkeel scope        scope drift from first commit")
	fmt.Println("  pitkeel velocity     commits per hour")
	fmt.Println("  pitkeel version      print version")
}

// --------------------------------------------------------------------------
// Signal: Session Duration
// --------------------------------------------------------------------------

func runSession() {
	fmt.Println(theme.Title.Render("Session"))

	commits := todayCommits()
	if len(commits) == 0 {
		fmt.Println(theme.Muted.Render("  No commits today."))
		return
	}

	first := commits[0]
	last := commits[len(commits)-1]
	duration := last.when.Sub(first.when)

	fmt.Printf("  Commits today:    %s\n", theme.Accent.Render(fmt.Sprintf("%d", len(commits))))
	fmt.Printf("  First commit:     %s\n", theme.Muted.Render(first.when.Format("15:04")))
	fmt.Printf("  Last commit:      %s\n", theme.Muted.Render(last.when.Format("15:04")))
	fmt.Printf("  Session duration: %s\n", formatDuration(duration))

	if duration > 4*time.Hour {
		fmt.Println()
		fmt.Println(theme.Warning.Render("  ⚠ Session exceeds 4 hours. Complex decisions made under"))
		fmt.Println(theme.Warning.Render("    sustained load have a higher error rate. Consider a break."))
	}

	var gaps []time.Duration
	for i := 1; i < len(commits); i++ {
		gap := commits[i].when.Sub(commits[i-1].when)
		if gap > 30*time.Minute {
			gaps = append(gaps, gap)
		}
	}
	if len(gaps) == 0 && duration > 2*time.Hour {
		fmt.Println()
		fmt.Println(theme.Muted.Render("  No breaks detected (gaps > 30min) in a 2h+ session."))
	}
}

// --------------------------------------------------------------------------
// Signal: Scope Drift
// --------------------------------------------------------------------------

func runScope() {
	fmt.Println(theme.Title.Render("Scope"))

	commits := todayCommits()
	if len(commits) < 2 {
		fmt.Println(theme.Muted.Render("  Need ≥2 commits to measure scope drift."))
		return
	}

	firstFiles := commitFiles(commits[0].hash)
	allFiles := todayFiles()

	initial := mapSet(firstFiles)
	added := []string{}
	for _, f := range allFiles {
		if !initial[f] {
			added = append(added, f)
		}
	}

	fmt.Printf("  Files in first commit:  %s\n", theme.Accent.Render(fmt.Sprintf("%d", len(firstFiles))))
	fmt.Printf("  Total files touched:    %s\n", theme.Accent.Render(fmt.Sprintf("%d", len(allFiles))))
	fmt.Printf("  Files added to scope:   %s\n", theme.Accent.Render(fmt.Sprintf("%d", len(added))))

	if len(added) > 0 {
		dirs := map[string]bool{}
		for _, f := range added {
			parts := strings.SplitN(f, "/", 2)
			dirs[parts[0]] = true
		}
		fmt.Printf("  New directories:        %s\n", theme.Accent.Render(fmt.Sprintf("%d", len(dirs))))

		if len(added) > len(firstFiles)*2 {
			fmt.Println()
			fmt.Println(theme.Warning.Render("  ⚠ Scope has more than doubled since the first commit."))
			fmt.Println(theme.Warning.Render("    Are all these changes serving the original intent?"))
		}
	}
}

// --------------------------------------------------------------------------
// Signal: Velocity
// --------------------------------------------------------------------------

func runVelocity() {
	fmt.Println(theme.Title.Render("Velocity"))

	commits := todayCommits()
	if len(commits) < 2 {
		fmt.Println(theme.Muted.Render("  Need ≥2 commits to measure velocity."))
		return
	}

	first := commits[0].when
	last := commits[len(commits)-1].when
	hours := last.Sub(first).Hours()
	if hours < 0.01 {
		hours = 0.01
	}

	rate := float64(len(commits)) / hours
	fmt.Printf("  Commits/hour: %s\n", theme.Accent.Render(fmt.Sprintf("%.1f", rate)))

	mid := len(commits) / 2
	firstHalf := commits[:mid]
	secondHalf := commits[mid:]

	if len(firstHalf) >= 2 && len(secondHalf) >= 2 {
		h1 := firstHalf[len(firstHalf)-1].when.Sub(firstHalf[0].when).Hours()
		h2 := secondHalf[len(secondHalf)-1].when.Sub(secondHalf[0].when).Hours()
		if h1 < 0.01 {
			h1 = 0.01
		}
		if h2 < 0.01 {
			h2 = 0.01
		}
		r1 := float64(len(firstHalf)) / h1
		r2 := float64(len(secondHalf)) / h2

		if r2 > r1*1.5 && r2 > 3 {
			accel := math.Round((r2/r1 - 1) * 100)
			fmt.Println()
			fmt.Println(theme.Warning.Render(fmt.Sprintf("  ⚠ Velocity increased %.0f%% in the second half.", accel)))
			fmt.Println(theme.Warning.Render("    Accelerating commits can indicate verification is being compressed."))
		}
	}

	rapid := 0
	for i := 1; i < len(commits); i++ {
		if commits[i].when.Sub(commits[i-1].when) < 5*time.Minute {
			rapid++
		}
	}
	if rapid > 2 {
		fmt.Println()
		fmt.Printf("  Rapid-fire commits (<5min apart): %s\n", theme.Warning.Render(fmt.Sprintf("%d", rapid)))
		fmt.Println(theme.Muted.Render("  Are gates running between each commit?"))
	}
}

// --------------------------------------------------------------------------
// Git helpers
// --------------------------------------------------------------------------

type commit struct {
	hash string
	when time.Time
	msg  string
}

func todayCommits() []commit {
	today := time.Now().Format("2006-01-02")
	out, err := exec.Command("git", "log", "--format=%H|%aI|%s", "--since="+today+"T00:00:00").Output()
	if err != nil {
		return nil
	}
	lines := strings.Split(strings.TrimSpace(string(out)), "\n")
	var commits []commit
	for _, line := range lines {
		if line == "" {
			continue
		}
		parts := strings.SplitN(line, "|", 3)
		if len(parts) < 3 {
			continue
		}
		t, err := time.Parse(time.RFC3339, parts[1])
		if err != nil {
			continue
		}
		commits = append(commits, commit{hash: parts[0], when: t, msg: parts[2]})
	}
	sort.Slice(commits, func(i, j int) bool { return commits[i].when.Before(commits[j].when) })
	return commits
}

func commitFiles(hash string) []string {
	out, err := exec.Command("git", "diff-tree", "--no-commit-id", "-r", "--name-only", hash).Output()
	if err != nil {
		return nil
	}
	lines := strings.Split(strings.TrimSpace(string(out)), "\n")
	var files []string
	for _, l := range lines {
		if l != "" {
			files = append(files, l)
		}
	}
	return files
}

func todayFiles() []string {
	today := time.Now().Format("2006-01-02")
	out, err := exec.Command("git", "log", "--format=", "--name-only", "--since="+today+"T00:00:00").Output()
	if err != nil {
		return nil
	}
	seen := map[string]bool{}
	var files []string
	for _, l := range strings.Split(string(out), "\n") {
		l = strings.TrimSpace(l)
		if l != "" && !seen[l] {
			seen[l] = true
			files = append(files, l)
		}
	}
	return files
}

func mapSet(ss []string) map[string]bool {
	m := make(map[string]bool, len(ss))
	for _, s := range ss {
		m[s] = true
	}
	return m
}

func formatDuration(d time.Duration) string {
	h := int(d.Hours())
	m := int(d.Minutes()) % 60
	if h > 0 {
		return theme.Accent.Render(fmt.Sprintf("%dh %dm", h, m))
	}
	return theme.Accent.Render(fmt.Sprintf("%dm", m))
}
