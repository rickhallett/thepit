// pitkeel — operational stability signals from git state.
//
// Reads the local repository and surfaces observable signals about
// session behaviour. Does not interpret. Does not diagnose. Instruments.
//
// Usage:
//
//	pitkeel              # run all signal checks
//	pitkeel session      # session duration + break awareness
//	pitkeel scope        # scope drift from first commit
//	pitkeel velocity     # commits per hour with acceleration
//	pitkeel hook         # hook-compatible output (no ANSI, for commit messages)
package main

import (
	"flag"
	"fmt"
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
		commits := todayCommits()
		renderSession(analyseSession(commits, time.Now()))
		fmt.Println()
		renderScope(analyseScope(commits, func(hash string) []string { return commitFiles(hash) }))
		fmt.Println()
		renderVelocity(analyseVelocity(commits))
		return
	}

	switch args[0] {
	case "session":
		commits := todayCommits()
		renderSession(analyseSession(commits, time.Now()))
	case "scope":
		commits := todayCommits()
		renderScope(analyseScope(commits, func(hash string) []string { return commitFiles(hash) }))
	case "velocity":
		commits := todayCommits()
		renderVelocity(analyseVelocity(commits))
	case "hook":
		commits := todayCommits()
		renderHook(
			analyseSession(commits, time.Now()),
			analyseScope(commits, func(hash string) []string { return commitFiles(hash) }),
			analyseVelocity(commits),
		)
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
	fmt.Println("  pitkeel session      session duration + break awareness")
	fmt.Println("  pitkeel scope        scope drift from first commit")
	fmt.Println("  pitkeel velocity     commits per hour")
	fmt.Println("  pitkeel hook         hook output (no ANSI, for commit messages)")
	fmt.Println("  pitkeel version      print version")
}

// --------------------------------------------------------------------------
// Data types — shared between analysis and git layer
// --------------------------------------------------------------------------

type commit struct {
	hash string
	when time.Time
	msg  string
}

// --------------------------------------------------------------------------
// Analysis: Session — pure functions, no IO
// --------------------------------------------------------------------------

// sessionBreakThreshold defines the gap duration that constitutes a "break".
const sessionBreakThreshold = 30 * time.Minute

type sessionSignal struct {
	totalCommitsToday int
	sessions          []session // break-segmented sessions
	currentSession    session   // the most recent session
	fatigueLevel      string    // "none", "mild", "moderate", "high", "severe"
	timeSinceBreak    time.Duration
	noBreaksDetected  bool // true if current session > 2h with no breaks
}

type session struct {
	commits  []commit
	start    time.Time
	end      time.Time
	duration time.Duration
}

func analyseSession(commits []commit, now time.Time) sessionSignal {
	sig := sessionSignal{}
	if len(commits) == 0 {
		return sig
	}

	sig.totalCommitsToday = len(commits)

	// Segment into sessions by break gaps
	sig.sessions = segmentSessions(commits)
	sig.currentSession = sig.sessions[len(sig.sessions)-1]

	// Fatigue is based on current session duration, not calendar span
	d := sig.currentSession.duration
	switch {
	case d >= 6*time.Hour:
		sig.fatigueLevel = "severe"
	case d >= 4*time.Hour:
		sig.fatigueLevel = "high"
	case d >= 3*time.Hour:
		sig.fatigueLevel = "moderate"
	case d >= 2*time.Hour:
		sig.fatigueLevel = "mild"
	default:
		sig.fatigueLevel = "none"
	}

	// Time since last break: distance from the start of the current session to now
	// (the current session started after the last break)
	if len(sig.sessions) > 1 {
		// There was at least one break; time since break = now - current session start
		sig.timeSinceBreak = now.Sub(sig.currentSession.start)
	} else {
		// No breaks at all today — time since first commit
		sig.timeSinceBreak = now.Sub(commits[0].when)
		if sig.currentSession.duration > 2*time.Hour {
			sig.noBreaksDetected = true
		}
	}

	return sig
}

func segmentSessions(commits []commit) []session {
	if len(commits) == 0 {
		return nil
	}

	var sessions []session
	start := 0

	for i := 1; i < len(commits); i++ {
		gap := commits[i].when.Sub(commits[i-1].when)
		if gap > sessionBreakThreshold {
			sessions = append(sessions, makeSession(commits[start:i]))
			start = i
		}
	}
	// Final segment
	sessions = append(sessions, makeSession(commits[start:]))

	return sessions
}

func makeSession(commits []commit) session {
	s := session{
		commits: commits,
		start:   commits[0].when,
		end:     commits[len(commits)-1].when,
	}
	s.duration = s.end.Sub(s.start)
	return s
}

// --------------------------------------------------------------------------
// Analysis: Scope — pure functions, no IO
// --------------------------------------------------------------------------

type scopeSignal struct {
	insufficient     bool // less than 2 commits
	firstCommitFiles []string
	totalFiles       []string
	addedFiles       []string
	firstDirs        map[string]bool // directories in first commit
	newDirs          []string        // directories NOT in first commit
	domainDrift      bool            // new directories appeared that weren't in first commit
	fileDrift        bool            // legacy: file count > 2x (kept for backward compat)
}

// fileResolver abstracts git access for testability.
type fileResolver func(hash string) []string

func analyseScope(commits []commit, resolver fileResolver) scopeSignal {
	sig := scopeSignal{}
	if len(commits) < 2 {
		sig.insufficient = true
		return sig
	}

	sig.firstCommitFiles = resolver(commits[0].hash)

	// Collect all unique files across all commits
	seen := map[string]bool{}
	for _, c := range commits {
		for _, f := range resolver(c.hash) {
			if !seen[f] {
				seen[f] = true
				sig.totalFiles = append(sig.totalFiles, f)
			}
		}
	}

	// Determine which files are new (not in first commit)
	initial := mapSet(sig.firstCommitFiles)
	for _, f := range sig.totalFiles {
		if !initial[f] {
			sig.addedFiles = append(sig.addedFiles, f)
		}
	}

	// Directory-level analysis — the real scope drift signal
	sig.firstDirs = topLevelDirs(sig.firstCommitFiles)
	addedDirs := topLevelDirs(sig.addedFiles)

	for d := range addedDirs {
		if !sig.firstDirs[d] {
			sig.newDirs = append(sig.newDirs, d)
		}
	}
	sort.Strings(sig.newDirs)

	sig.domainDrift = len(sig.newDirs) > 0
	sig.fileDrift = len(sig.addedFiles) > len(sig.firstCommitFiles)*2

	return sig
}

func topLevelDirs(files []string) map[string]bool {
	dirs := map[string]bool{}
	for _, f := range files {
		parts := strings.SplitN(f, "/", 2)
		if len(parts) > 0 {
			dirs[parts[0]] = true
		}
	}
	return dirs
}

// --------------------------------------------------------------------------
// Analysis: Velocity — pure functions, no IO
// --------------------------------------------------------------------------

type velocitySignal struct {
	insufficient    bool
	totalRate       float64 // commits per hour overall
	hours           float64
	accelerating    bool
	accelerationPct float64 // percentage increase
	rapidFire       int     // count of intervals < 5min
	rapidFireWarn   bool
}

func analyseVelocity(commits []commit) velocitySignal {
	sig := velocitySignal{}
	if len(commits) < 2 {
		sig.insufficient = true
		return sig
	}

	first := commits[0].when
	last := commits[len(commits)-1].when
	sig.hours = last.Sub(first).Hours()
	if sig.hours < 0.01 {
		sig.hours = 0.01
	}

	sig.totalRate = float64(len(commits)) / sig.hours

	// Time-based midpoint split (not count-based)
	midTime := first.Add(last.Sub(first) / 2)
	var firstHalf, secondHalf []commit
	for _, c := range commits {
		if c.when.Before(midTime) {
			firstHalf = append(firstHalf, c)
		} else {
			secondHalf = append(secondHalf, c)
		}
	}

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

		if r1 > 0 && r2 > r1*1.5 {
			sig.accelerating = true
			sig.accelerationPct = (r2/r1 - 1) * 100
		}
	}

	// Rapid-fire detection
	for i := 1; i < len(commits); i++ {
		if commits[i].when.Sub(commits[i-1].when) < 5*time.Minute {
			sig.rapidFire++
		}
	}
	sig.rapidFireWarn = sig.rapidFire >= 2 // 3+ commits in <5min intervals

	return sig
}

// --------------------------------------------------------------------------
// Rendering: styled terminal output
// --------------------------------------------------------------------------

func renderSession(sig sessionSignal) {
	fmt.Println(theme.Title.Render("Session"))

	if sig.totalCommitsToday == 0 {
		fmt.Println(theme.Muted.Render("  No commits today."))
		return
	}

	fmt.Printf("  Commits today:      %s\n", theme.Accent.Render(fmt.Sprintf("%d", sig.totalCommitsToday)))
	fmt.Printf("  Sessions today:     %s\n", theme.Accent.Render(fmt.Sprintf("%d", len(sig.sessions))))

	cs := sig.currentSession
	fmt.Printf("  Current session:    %s → %s (%s)\n",
		theme.Muted.Render(cs.start.Format("15:04")),
		theme.Muted.Render(cs.end.Format("15:04")),
		formatDuration(cs.duration))
	fmt.Printf("  Commits in session: %s\n", theme.Accent.Render(fmt.Sprintf("%d", len(cs.commits))))

	switch sig.fatigueLevel {
	case "severe":
		fmt.Println()
		fmt.Println(theme.Error.Render("  ⚠ Session exceeds 6 hours. Decision quality is significantly degraded."))
		fmt.Println(theme.Error.Render("    Stop. Checkpoint. Resume with fresh context."))
	case "high":
		fmt.Println()
		fmt.Println(theme.Warning.Render("  ⚠ Session exceeds 4 hours. Complex decisions made under"))
		fmt.Println(theme.Warning.Render("    sustained load have a higher error rate. Consider a break."))
	case "moderate":
		fmt.Println()
		fmt.Println(theme.Muted.Render("  Session approaching 3 hours. A short break would reset cognitive load."))
	}

	if sig.noBreaksDetected {
		fmt.Println()
		fmt.Println(theme.Muted.Render("  No breaks detected (gaps > 30min) in a 2h+ session."))
	}

	if sig.timeSinceBreak > 2*time.Hour {
		fmt.Printf("  Time since last break: %s\n", theme.Warning.Render(formatDuration(sig.timeSinceBreak)))
	}
}

func renderScope(sig scopeSignal) {
	fmt.Println(theme.Title.Render("Scope"))

	if sig.insufficient {
		fmt.Println(theme.Muted.Render("  Need ≥2 commits to measure scope drift."))
		return
	}

	fmt.Printf("  Files in first commit:  %s\n", theme.Accent.Render(fmt.Sprintf("%d", len(sig.firstCommitFiles))))
	fmt.Printf("  Total files touched:    %s\n", theme.Accent.Render(fmt.Sprintf("%d", len(sig.totalFiles))))
	fmt.Printf("  Files added to scope:   %s\n", theme.Accent.Render(fmt.Sprintf("%d", len(sig.addedFiles))))

	if sig.domainDrift {
		fmt.Println()
		fmt.Println(theme.Warning.Render("  ⚠ Work has expanded to new domains:"))
		for _, d := range sig.newDirs {
			fmt.Printf("    → %s\n", theme.Accent.Render(d))
		}
		fmt.Println(theme.Muted.Render("    Are these changes serving the original intent?"))
	} else if sig.fileDrift {
		fmt.Println()
		fmt.Println(theme.Warning.Render("  ⚠ Scope has more than doubled since the first commit."))
		fmt.Println(theme.Warning.Render("    Are all these changes serving the original intent?"))
	}
}

func renderVelocity(sig velocitySignal) {
	fmt.Println(theme.Title.Render("Velocity"))

	if sig.insufficient {
		fmt.Println(theme.Muted.Render("  Need ≥2 commits to measure velocity."))
		return
	}

	fmt.Printf("  Commits/hour: %s\n", theme.Accent.Render(fmt.Sprintf("%.1f", sig.totalRate)))

	if sig.accelerating {
		fmt.Println()
		fmt.Println(theme.Warning.Render(fmt.Sprintf("  ⚠ Velocity increased %.0f%% in the second half of the session.", sig.accelerationPct)))
		fmt.Println(theme.Warning.Render("    Accelerating commits can indicate verification is being compressed."))
	}

	if sig.rapidFireWarn {
		fmt.Println()
		fmt.Printf("  Rapid-fire commits (<5min apart): %s\n", theme.Warning.Render(fmt.Sprintf("%d", sig.rapidFire)))
		fmt.Println(theme.Muted.Render("  Are gates running between each commit?"))
	}
}

// --------------------------------------------------------------------------
// Rendering: hook output (no ANSI, for commit message appending)
// --------------------------------------------------------------------------

func renderHook(sess sessionSignal, scope scopeSignal, vel velocitySignal) {
	var signals []string

	// Session signals
	if sess.totalCommitsToday > 0 {
		cs := sess.currentSession
		signals = append(signals, fmt.Sprintf("session: %s (%d commits, %s)",
			formatDurationPlain(cs.duration), len(cs.commits),
			sess.fatigueLevel+" fatigue"))

		if sess.noBreaksDetected {
			signals = append(signals, "session: no breaks in 2h+ session")
		}
	}

	// Scope signals
	if !scope.insufficient {
		if scope.domainDrift {
			signals = append(signals, fmt.Sprintf("scope: drift to new domains [%s]",
				strings.Join(scope.newDirs, ", ")))
		}
	}

	// Velocity signals
	if !vel.insufficient {
		if vel.accelerating {
			signals = append(signals, fmt.Sprintf("velocity: +%.0f%% acceleration in second half", vel.accelerationPct))
		}
		if vel.rapidFireWarn {
			signals = append(signals, fmt.Sprintf("velocity: %d rapid-fire intervals (<5min)", vel.rapidFire))
		}
	}

	if len(signals) == 0 {
		fmt.Println("keel: nominal")
		return
	}

	for _, s := range signals {
		fmt.Printf("keel: %s\n", s)
	}
}

// --------------------------------------------------------------------------
// Git helpers — IO layer, not tested directly
// --------------------------------------------------------------------------

func todayCommits() []commit {
	today := time.Now().Format("2006-01-02")
	out, err := exec.Command("git", "log", "--format=%H|%aI|%s", "--since="+today+"T00:00:00").Output()
	if err != nil {
		return nil
	}
	return parseCommitLog(string(out))
}

func parseCommitLog(raw string) []commit {
	lines := strings.Split(strings.TrimSpace(raw), "\n")
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

func formatDurationPlain(d time.Duration) string {
	h := int(d.Hours())
	m := int(d.Minutes()) % 60
	if h > 0 {
		return fmt.Sprintf("%dh %dm", h, m)
	}
	return fmt.Sprintf("%dm", m)
}
