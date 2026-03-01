package keelstate

import (
	"os"
	"path/filepath"
	"testing"
)

func TestRoundTrip(t *testing.T) {
	dir := t.TempDir()

	original := State{
		Head:      "abc1234",
		SD:        "SD-277",
		Officer:   "Weaver",
		TrueNorth: "Get Hired",
		Gate:      "green",
		GateTime:  "17:38",
		Tests:     1289,
		Weave:     "tight",
		Register:  "quarterdeck",
		Tempo:     "full-sail",
		Bearing: Bearing{
			Work:    "phase4-critical-bugs",
			Commits: 3,
			Last:    "fix: something",
			Note:    "testing round-trip",
		},
	}

	if err := Write(dir, original); err != nil {
		t.Fatalf("Write: %v", err)
	}

	got, err := Read(dir)
	if err != nil {
		t.Fatalf("Read: %v", err)
	}

	if got.Head != original.Head {
		t.Errorf("Head: got %q, want %q", got.Head, original.Head)
	}
	if got.SD != original.SD {
		t.Errorf("SD: got %q, want %q", got.SD, original.SD)
	}
	if got.Officer != original.Officer {
		t.Errorf("Officer: got %q, want %q", got.Officer, original.Officer)
	}
	if got.TrueNorth != original.TrueNorth {
		t.Errorf("TrueNorth: got %q, want %q", got.TrueNorth, original.TrueNorth)
	}
	if got.Gate != original.Gate {
		t.Errorf("Gate: got %q, want %q", got.Gate, original.Gate)
	}
	if got.Tests != original.Tests {
		t.Errorf("Tests: got %d, want %d", got.Tests, original.Tests)
	}
	if got.Bearing.Work != original.Bearing.Work {
		t.Errorf("Bearing.Work: got %q, want %q", got.Bearing.Work, original.Bearing.Work)
	}
	if got.Bearing.Commits != original.Bearing.Commits {
		t.Errorf("Bearing.Commits: got %d, want %d", got.Bearing.Commits, original.Bearing.Commits)
	}
	if got.Bearing.Note != original.Bearing.Note {
		t.Errorf("Bearing.Note: got %q, want %q", got.Bearing.Note, original.Bearing.Note)
	}
}

func TestReadMissingFile(t *testing.T) {
	dir := t.TempDir()
	s, err := Read(dir)
	if err != nil {
		t.Fatalf("Read missing file should not error: %v", err)
	}
	if s.Head != "" {
		t.Errorf("expected zero state, got Head=%q", s.Head)
	}
}

func TestValidateGate(t *testing.T) {
	s := State{Gate: "invalid"}
	if err := s.Validate(); err == nil {
		t.Error("expected validation error for invalid gate")
	}

	s.Gate = "green"
	if err := s.Validate(); err != nil {
		t.Errorf("green gate should be valid: %v", err)
	}

	s.Gate = ""
	if err := s.Validate(); err != nil {
		t.Errorf("empty gate should be valid: %v", err)
	}
}

func TestReadModifyWrite(t *testing.T) {
	dir := t.TempDir()

	// Write initial state
	if err := Write(dir, State{Head: "aaa", Officer: "Weaver", Gate: "green"}); err != nil {
		t.Fatal(err)
	}

	// Modify just the head
	if err := ReadModifyWrite(dir, func(s *State) {
		s.Head = "bbb"
		s.SD = "SD-278"
	}); err != nil {
		t.Fatal(err)
	}

	got, err := Read(dir)
	if err != nil {
		t.Fatal(err)
	}
	if got.Head != "bbb" {
		t.Errorf("Head: got %q, want %q", got.Head, "bbb")
	}
	if got.SD != "SD-278" {
		t.Errorf("SD: got %q, want %q", got.SD, "SD-278")
	}
	// Officer should be preserved
	if got.Officer != "Weaver" {
		t.Errorf("Officer: got %q, want %q", got.Officer, "Weaver")
	}
}

func TestWriteCreatesFile(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, ".keel-state")

	if _, err := os.Stat(path); !os.IsNotExist(err) {
		t.Fatal("file should not exist yet")
	}

	if err := Write(dir, State{Gate: "red", Tests: 0}); err != nil {
		t.Fatal(err)
	}

	if _, err := os.Stat(path); err != nil {
		t.Fatalf("file should exist after Write: %v", err)
	}
}
