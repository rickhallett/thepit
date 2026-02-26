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
	"io/fs"
	"os"
	"os/exec"
	"path/filepath"
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
		fmt.Println()
		renderWellness(analyseWellness(time.Now(), repoRoot()))
		fmt.Println()
		renderContext(analyseContext(repoRoot()))
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
			analyseContext(repoRoot()),
		)
	case "context":
		renderContext(analyseContext(repoRoot()))
	case "wellness":
		renderWellness(analyseWellness(time.Now(), repoRoot()))
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
	fmt.Println("  pitkeel context      context file depth distribution")
	fmt.Println("  pitkeel wellness     daily wellness checks (whoop.log, captain's log)")
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
// Analysis: Wellness — daily file-existence checks, pure functions
// --------------------------------------------------------------------------

type wellnessSignal struct {
	whoopPresent       bool
	whoopPath          string
	captainsLogPresent bool
	captainsLogPath    string
	date               string // YYYY-MM-DD for display
}

func analyseWellness(now time.Time, root string) wellnessSignal {
	year := now.Format("2006")
	month := now.Format("01")
	day := now.Format("02")
	sig := wellnessSignal{
		date:            now.Format("2006-01-02"),
		whoopPath:       filepath.Join(root, "docs", "internal", "doctor", "captain", "whoop-"+now.Format("2006-01-02")+".log"),
		captainsLogPath: filepath.Join(root, "docs", "internal", "captain", "captainslog", year, month, day+".md"),
	}
	sig.whoopPresent = fileExists(sig.whoopPath)
	sig.captainsLogPresent = fileExists(sig.captainsLogPath)
	return sig
}

func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

// --------------------------------------------------------------------------
// Analysis: Context — file depth distribution in docs/internal
// --------------------------------------------------------------------------

type contextSignal struct {
	d1Count   int
	d2Count   int
	d3Count   int
	total     int
	d1Ratio   float64
	d2Ratio   float64
	d3Ratio   float64
	d1Warning bool // true if d1Ratio > 0.20
}

func analyseContext(root string) contextSignal {
	sig := contextSignal{}
	base := filepath.Join(root, "docs", "internal")

	_ = filepath.WalkDir(base, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return nil
		}
		if d.IsDir() {
			return nil
		}
		if !strings.HasSuffix(d.Name(), ".md") {
			return nil
		}

		rel, err := filepath.Rel(base, path)
		if err != nil {
			return nil
		}
		depth := len(strings.Split(filepath.ToSlash(rel), "/")) - 1

		switch {
		case depth == 0:
			sig.d1Count++
		case depth == 1:
			sig.d2Count++
		default:
			sig.d3Count++
		}
		sig.total++
		return nil
	})

	if sig.total > 0 {
		sig.d1Ratio = float64(sig.d1Count) / float64(sig.total)
		sig.d2Ratio = float64(sig.d2Count) / float64(sig.total)
		sig.d3Ratio = float64(sig.d3Count) / float64(sig.total)
	}

	sig.d1Warning = sig.d1Ratio > 0.20
	return sig
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
	sig.rapidFireWarn = sig.rapidFire >= 2 // 2+ rapid-fire intervals = 3+ commits in <5min windows

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

func renderWellness(sig wellnessSignal) {
	fmt.Println(theme.Title.Render("Wellness") + theme.Muted.Render("  "+sig.date))

	if sig.whoopPresent {
		fmt.Println(theme.Accent.Render("  ✓ Whoop.log complete"))
	} else {
		fmt.Println(theme.Warning.Render("  ✗ Whoop.log not found"))
		fmt.Printf("    Expected: %s\n", theme.Muted.Render(sig.whoopPath))
	}

	if sig.captainsLogPresent {
		fmt.Println(theme.Accent.Render("  ✓ Captain's log complete"))
	} else {
		fmt.Println(theme.Warning.Render("  ✗ Captain's log not found"))
		fmt.Printf("    Expected: %s\n", theme.Muted.Render(sig.captainsLogPath))
	}
}

func renderContext(sig contextSignal) {
	fmt.Println(theme.Title.Render("Context"))

	if sig.total == 0 {
		fmt.Println(theme.Muted.Render("  No .md files found in docs/internal/"))
		return
	}

	fmt.Printf("  %s\n", theme.Accent.Render(
		fmt.Sprintf("d1:%.2f / d2:%.2f / d3+:%.2f", sig.d1Ratio, sig.d2Ratio, sig.d3Ratio)))

	if sig.d1Warning {
		fmt.Println(theme.Warning.Render("  ⚠ depth-1 ratio exceeds 0.20 — context pollution may be creeping back"))
	}
}

// --------------------------------------------------------------------------
// Rendering: hook output (no ANSI, for commit message appending)
// --------------------------------------------------------------------------

func renderHook(sess sessionSignal, scope scopeSignal, vel velocitySignal, ctxArgs ...contextSignal) {
	var ctx contextSignal
	if len(ctxArgs) > 0 {
		ctx = ctxArgs[0]
	}
	var signals []string

	// Session signals — only surface when actionable (fatigue or no-break warning).
	// A nominal session (fatigue=none, breaks taken) is not worth annotating.
	if sess.totalCommitsToday > 0 {
		if sess.fatigueLevel != "none" {
			cs := sess.currentSession
			signals = append(signals, fmt.Sprintf("session: %s (%d commits, %s)",
				formatDurationPlain(cs.duration), len(cs.commits),
				sess.fatigueLevel+" fatigue"))
		}

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

	// Context signals — always include (single short line)
	if ctx.total > 0 {
		signals = append(signals, fmt.Sprintf("context: d1:%.2f / d2:%.2f / d3+:%.2f", ctx.d1Ratio, ctx.d2Ratio, ctx.d3Ratio))
		if ctx.d1Warning {
			signals = append(signals, "context: d1 ratio high (>0.20)")
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

func repoRoot() string {
	out, err := exec.Command("git", "rev-parse", "--show-toplevel").Output()
	if err != nil {
		return "."
	}
	return strings.TrimSpace(string(out))
}

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
