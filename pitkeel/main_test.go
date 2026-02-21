package main

import (
	"testing"
	"time"
)

// Helper: create a commit at a specific offset from a base time.
func c(base time.Time, offsetMin int, msg string) commit {
	return commit{
		hash: "abc" + msg,
		when: base.Add(time.Duration(offsetMin) * time.Minute),
		msg:  msg,
	}
}

// ==========================================================================
// Session Signal — Intent Tests
// ==========================================================================

func TestSession_FiveHourContinuousTriggersHighFatigue(t *testing.T) {
	// Intent: a 5-hour continuous session (no gaps > 30min) triggers high fatigue.
	base := time.Date(2026, 2, 21, 9, 0, 0, 0, time.UTC)
	commits := []commit{
		c(base, 0, "start"),
		c(base, 25, "mid1"),
		c(base, 50, "mid2"),
		c(base, 75, "mid3"),
		c(base, 100, "mid4"),
		c(base, 125, "mid5"),
		c(base, 150, "mid6"),
		c(base, 175, "mid7"),
		c(base, 200, "mid8"),
		c(base, 225, "mid9"),
		c(base, 250, "mid10"),
		c(base, 275, "mid11"),
		c(base, 300, "end"), // +5h, gaps of 25min — no breaks
	}
	now := base.Add(5*time.Hour + 10*time.Minute)

	sig := analyseSession(commits, now)

	if sig.fatigueLevel != "high" && sig.fatigueLevel != "severe" {
		t.Errorf("expected high or severe fatigue for 5h session, got %q", sig.fatigueLevel)
	}
}

func TestSession_FiveHourSpanWithLongBreakNoFatigue(t *testing.T) {
	// Intent: 5 calendar hours but a 2-hour break means the current session is ~2h.
	// The session should NOT trigger high fatigue.
	base := time.Date(2026, 2, 21, 9, 0, 0, 0, time.UTC)
	commits := []commit{
		c(base, 0, "morning-start"),
		c(base, 60, "morning-end"),   // 09:00-10:00 = session 1
		c(base, 180, "after-lunch1"), // 12:00 — 2h gap = break
		c(base, 240, "after-lunch2"), // 13:00
		c(base, 300, "after-lunch3"), // 14:00 — session 2 is 12:00-14:00 = 2h
	}
	now := base.Add(5*time.Hour + 10*time.Minute)

	sig := analyseSession(commits, now)

	if sig.fatigueLevel == "high" || sig.fatigueLevel == "severe" {
		t.Errorf("expected no high fatigue with 2h break, got %q (current session: %v)",
			sig.fatigueLevel, sig.currentSession.duration)
	}
}

func TestSession_MultipleBreaksReportsCurrentSessionOnly(t *testing.T) {
	// Intent: three sessions separated by breaks. Duration reported is for current session only.
	base := time.Date(2026, 2, 21, 8, 0, 0, 0, time.UTC)
	commits := []commit{
		c(base, 0, "s1-start"),
		c(base, 20, "s1-end"),
		// 40-min gap = break
		c(base, 60, "s2-start"),
		c(base, 80, "s2-end"),
		// 40-min gap = break
		c(base, 120, "s3-start"),
		c(base, 140, "s3-end"),
	}
	now := base.Add(145 * time.Minute)

	sig := analyseSession(commits, now)

	if len(sig.sessions) != 3 {
		t.Errorf("expected 3 sessions, got %d", len(sig.sessions))
	}
	// Current session duration should be ~20min, not the full span
	if sig.currentSession.duration > 30*time.Minute {
		t.Errorf("current session should be ~20min, got %v", sig.currentSession.duration)
	}
	if sig.fatigueLevel != "none" {
		t.Errorf("expected no fatigue for 20min session, got %q", sig.fatigueLevel)
	}
}

func TestSession_SingleCommitNoFatigue(t *testing.T) {
	// Intent: a single commit provides no session signal.
	base := time.Date(2026, 2, 21, 9, 0, 0, 0, time.UTC)
	commits := []commit{c(base, 0, "only")}
	now := base.Add(10 * time.Minute)

	sig := analyseSession(commits, now)

	if sig.fatigueLevel != "none" {
		t.Errorf("single commit should have no fatigue, got %q", sig.fatigueLevel)
	}
}

func TestSession_TwoHourNoBreaksDetected(t *testing.T) {
	// Intent: a 2.5h continuous session surfaces "no breaks detected".
	base := time.Date(2026, 2, 21, 9, 0, 0, 0, time.UTC)
	commits := []commit{
		c(base, 0, "start"),
		c(base, 25, "a"),
		c(base, 50, "b"),
		c(base, 75, "c"),
		c(base, 100, "d"),
		c(base, 125, "e"),
		c(base, 150, "end"), // 2h 30m total
	}
	now := base.Add(155 * time.Minute)

	sig := analyseSession(commits, now)

	if !sig.noBreaksDetected {
		t.Error("expected noBreaksDetected for 2.5h continuous session")
	}
}

func TestSession_GraduatedFatigueLevels(t *testing.T) {
	// Intent: fatigue is graduated, not a single cliff.
	base := time.Date(2026, 2, 21, 9, 0, 0, 0, time.UTC)

	tests := []struct {
		durationMin int
		minLevel    string
	}{
		{90, "none"},      // 1.5h — no fatigue
		{130, "mild"},     // 2h 10m — mild
		{200, "moderate"}, // 3h 20m — moderate
		{260, "high"},     // 4h 20m — high
		{380, "severe"},   // 6h 20m — severe
	}

	for _, tt := range tests {
		// Build commits with 20-min gaps to avoid break segmentation
		var commits []commit
		commits = append(commits, c(base, 0, "start"))
		for m := 20; m < tt.durationMin; m += 20 {
			commits = append(commits, c(base, m, "work"))
		}
		commits = append(commits, c(base, tt.durationMin, "end"))

		now := base.Add(time.Duration(tt.durationMin+5) * time.Minute)
		sig := analyseSession(commits, now)

		if sig.fatigueLevel != tt.minLevel {
			t.Errorf("duration %dmin: expected fatigue %q, got %q",
				tt.durationMin, tt.minLevel, sig.fatigueLevel)
		}
	}
}

// ==========================================================================
// Scope Signal — Intent Tests
// ==========================================================================

func TestScope_NewDirectoryTriggersDomainDrift(t *testing.T) {
	// Intent: touching files in a new top-level directory = scope drift.
	base := time.Date(2026, 2, 21, 9, 0, 0, 0, time.UTC)
	commits := []commit{
		c(base, 0, "initial"),
		c(base, 30, "drifted"),
	}

	resolver := func(hash string) []string {
		if hash == commits[0].hash {
			return []string{"lib/credits.ts", "tests/credits.test.ts"}
		}
		return []string{"app/api/new-route/route.ts", "lib/eas.ts"}
	}

	sig := analyseScope(commits, resolver)

	if !sig.domainDrift {
		t.Error("expected domain drift when touching app/ (new domain)")
	}
	found := false
	for _, d := range sig.newDirs {
		if d == "app" {
			found = true
		}
	}
	if !found {
		t.Errorf("expected 'app' in new dirs, got %v", sig.newDirs)
	}
}

func TestScope_SameDirectoryNoDrift(t *testing.T) {
	// Intent: touching more files in the SAME directory = no scope drift.
	base := time.Date(2026, 2, 21, 9, 0, 0, 0, time.UTC)
	commits := []commit{
		c(base, 0, "initial"),
		c(base, 30, "more-work"),
	}

	resolver := func(hash string) []string {
		if hash == commits[0].hash {
			return []string{"lib/bout-engine.ts"}
		}
		return []string{"lib/bout-engine-helpers.ts", "lib/bout-engine.test.ts"}
	}

	sig := analyseScope(commits, resolver)

	if sig.domainDrift {
		t.Error("expected NO domain drift when all files are in lib/")
	}
}

func TestScope_DirectoryBoundariesNotFileCount(t *testing.T) {
	// Intent: 2 files in 2 new dirs is worse than 4 files in the same dir.
	base := time.Date(2026, 2, 21, 9, 0, 0, 0, time.UTC)
	commits := []commit{
		c(base, 0, "initial"),
		c(base, 30, "spread"),
	}

	// Scenario: first commit in lib/, second in app/ and components/ (2 new domains)
	resolver := func(hash string) []string {
		if hash == commits[0].hash {
			return []string{"lib/credits.ts"}
		}
		return []string{"app/page.tsx", "components/arena.tsx"}
	}

	sig := analyseScope(commits, resolver)

	if !sig.domainDrift {
		t.Error("expected domain drift for 2 files in 2 new directories")
	}
	if len(sig.newDirs) != 2 {
		t.Errorf("expected 2 new dirs, got %d: %v", len(sig.newDirs), sig.newDirs)
	}
}

func TestScope_InsufficientCommits(t *testing.T) {
	// Intent: scope drift requires >= 2 commits.
	sig := analyseScope([]commit{{hash: "abc", when: time.Now(), msg: "only"}},
		func(string) []string { return nil })

	if !sig.insufficient {
		t.Error("expected insufficient with 1 commit")
	}
}

// ==========================================================================
// Velocity Signal — Intent Tests
// ==========================================================================

func TestVelocity_FourCommitsInTenMinutesIsRapidFire(t *testing.T) {
	// Intent: 4 commits in 10 minutes triggers rapid-fire warning.
	base := time.Date(2026, 2, 21, 9, 0, 0, 0, time.UTC)
	commits := []commit{
		c(base, 0, "a"),
		c(base, 3, "b"),
		c(base, 6, "c"),
		c(base, 9, "d"),
	}

	sig := analyseVelocity(commits)

	if !sig.rapidFireWarn {
		t.Errorf("expected rapid-fire warning for 4 commits in 9min, rapidFire=%d", sig.rapidFire)
	}
}

func TestVelocity_AccelerationInSecondHalf(t *testing.T) {
	// Intent: sparse first half → dense second half triggers acceleration warning.
	base := time.Date(2026, 2, 21, 9, 0, 0, 0, time.UTC)
	commits := []commit{
		c(base, 0, "slow1"),
		c(base, 60, "slow2"),
		c(base, 120, "slow3"), // first 2h: 3 commits
		c(base, 130, "fast1"),
		c(base, 140, "fast2"),
		c(base, 150, "fast3"),
		c(base, 160, "fast4"),
		c(base, 170, "fast5"),
		c(base, 180, "fast6"), // second hour: 6 commits in 50min
	}

	sig := analyseVelocity(commits)

	if !sig.accelerating {
		t.Error("expected acceleration warning for dense second half")
	}
}

func TestVelocity_UniformNoAcceleration(t *testing.T) {
	// Intent: evenly-spaced commits do NOT trigger acceleration.
	base := time.Date(2026, 2, 21, 9, 0, 0, 0, time.UTC)
	commits := []commit{
		c(base, 0, "a"),
		c(base, 30, "b"),
		c(base, 60, "c"),
		c(base, 90, "d"),
		c(base, 120, "e"),
		c(base, 150, "f"),
	}

	sig := analyseVelocity(commits)

	if sig.accelerating {
		t.Errorf("uniform spacing should not trigger acceleration (pct=%.0f%%)", sig.accelerationPct)
	}
}

func TestVelocity_TwoCommitsFiveMinApartNoRapidFire(t *testing.T) {
	// Intent: a single pair <5min apart is NOT rapid-fire (needs a pattern).
	base := time.Date(2026, 2, 21, 9, 0, 0, 0, time.UTC)
	commits := []commit{
		c(base, 0, "a"),
		c(base, 3, "b"),
	}

	sig := analyseVelocity(commits)

	// Only 1 interval < 5min — threshold is 2
	if sig.rapidFireWarn {
		t.Error("single pair <5min should not trigger rapid-fire")
	}
}

func TestVelocity_TimeBasedMidpointNotCountBased(t *testing.T) {
	// Intent: the midpoint split uses time, not commit count.
	// 8 commits in first hour, 2 in second hour.
	// Count-based midpoint: 5 in each → misleading.
	// Time-based midpoint (90min mark): 8 in first half, 2 in second half → deceleration.
	base := time.Date(2026, 2, 21, 9, 0, 0, 0, time.UTC)
	commits := []commit{
		c(base, 0, "a"),
		c(base, 8, "b"),
		c(base, 16, "c"),
		c(base, 24, "d"),
		c(base, 32, "e"),
		c(base, 40, "f"),
		c(base, 48, "g"),
		c(base, 56, "h"),      // 8 commits in first hour
		c(base, 120, "slow1"), // 2 commits in second hour
		c(base, 180, "slow2"),
	}

	sig := analyseVelocity(commits)

	// Should NOT report acceleration — the second half is slower
	if sig.accelerating {
		t.Error("time-based midpoint should show deceleration, not acceleration")
	}
}

func TestVelocity_InsufficientCommits(t *testing.T) {
	sig := analyseVelocity([]commit{{hash: "abc", when: time.Now(), msg: "only"}})
	if !sig.insufficient {
		t.Error("expected insufficient with 1 commit")
	}
}

// ==========================================================================
// Cross-signal — Compound Tests
// ==========================================================================

func TestCompound_FatigueAndScopeDriftBothSurface(t *testing.T) {
	// Intent: when both fatigue and scope drift are present, both are surfaced.
	base := time.Date(2026, 2, 21, 9, 0, 0, 0, time.UTC)
	// Build a 4h+ session with no breaks (20-min gaps)
	commits := []commit{
		c(base, 0, "start"),
		c(base, 20, "a"),
		c(base, 40, "b"),
		c(base, 60, "c"),
		c(base, 80, "d"),
		c(base, 100, "e"),
		c(base, 120, "f"),
		c(base, 140, "g"),
		c(base, 160, "h"),
		c(base, 180, "i"),
		c(base, 200, "j"),
		c(base, 220, "k"),
		c(base, 240, "end"),   // 4h of continuous work
		c(base, 260, "drift"), // scope drift commit
	}
	now := base.Add(265 * time.Minute)

	sessSig := analyseSession(commits, now)
	scopeSig := analyseScope(commits, func(hash string) []string {
		if hash == commits[0].hash {
			return []string{"lib/credits.ts"}
		}
		return []string{"app/new-route.ts", "components/widget.tsx"}
	})

	if sessSig.fatigueLevel != "high" {
		t.Errorf("expected high fatigue, got %q", sessSig.fatigueLevel)
	}
	if !scopeSig.domainDrift {
		t.Error("expected scope drift")
	}
}

func TestCompound_ShortFocusedSessionNoSignals(t *testing.T) {
	// Intent: a clean, compact session in a single domain = no warnings.
	base := time.Date(2026, 2, 21, 9, 0, 0, 0, time.UTC)
	commits := []commit{
		c(base, 0, "start"),
		c(base, 20, "mid"),
		c(base, 40, "end"),
	}
	now := base.Add(45 * time.Minute)

	sessSig := analyseSession(commits, now)
	scopeSig := analyseScope(commits, func(hash string) []string {
		return []string{"lib/credits.ts", "tests/credits.test.ts"}
	})
	velSig := analyseVelocity(commits)

	if sessSig.fatigueLevel != "none" {
		t.Errorf("expected no fatigue, got %q", sessSig.fatigueLevel)
	}
	if scopeSig.domainDrift {
		t.Error("expected no scope drift")
	}
	if velSig.accelerating {
		t.Error("expected no acceleration")
	}
	if velSig.rapidFireWarn {
		t.Error("expected no rapid-fire")
	}
}

// ==========================================================================
// Hook Output — Intent Tests
// ==========================================================================

func TestHook_NominalSessionProducesNominalOutput(t *testing.T) {
	// Intent: a clean session produces "keel: nominal" — no noise in commit messages.
	base := time.Date(2026, 2, 21, 9, 0, 0, 0, time.UTC)
	commits := []commit{
		c(base, 0, "start"),
		c(base, 30, "end"),
	}
	now := base.Add(35 * time.Minute)

	sess := analyseSession(commits, now)
	scope := analyseScope(commits, func(string) []string { return []string{"lib/a.ts"} })
	vel := analyseVelocity(commits)

	// Verify no warning-level signals exist
	if sess.fatigueLevel != "none" {
		t.Errorf("expected no fatigue, got %q", sess.fatigueLevel)
	}
	if scope.domainDrift {
		t.Error("expected no scope drift")
	}
	if vel.accelerating || vel.rapidFireWarn {
		t.Error("expected no velocity warnings")
	}
}

// ==========================================================================
// parseCommitLog — parsing correctness
// ==========================================================================

func TestParseCommitLog_ValidInput(t *testing.T) {
	raw := "abc123|2026-02-21T09:00:00+00:00|feat: initial\ndef456|2026-02-21T10:00:00+00:00|fix: something"
	commits := parseCommitLog(raw)
	if len(commits) != 2 {
		t.Fatalf("expected 2 commits, got %d", len(commits))
	}
	if commits[0].msg != "feat: initial" {
		t.Errorf("expected 'feat: initial', got %q", commits[0].msg)
	}
	// Should be sorted chronologically
	if !commits[0].when.Before(commits[1].when) {
		t.Error("commits should be sorted chronologically")
	}
}

func TestParseCommitLog_EmptyInput(t *testing.T) {
	commits := parseCommitLog("")
	if len(commits) != 0 {
		t.Errorf("expected 0 commits from empty input, got %d", len(commits))
	}
}

func TestParseCommitLog_MalformedLines(t *testing.T) {
	raw := "abc123|bad-date|feat: initial\ndef456|2026-02-21T10:00:00+00:00|fix: something\ngarbage"
	commits := parseCommitLog(raw)
	if len(commits) != 1 {
		t.Errorf("expected 1 valid commit, got %d", len(commits))
	}
}
