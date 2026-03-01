// Package keelstate defines the schema for .keel-state — the single source
// of truth for operational state across all pit* tools and scripts.
//
// Every field is typed and documented with its producer(s) and consumer(s).
// See docs/internal/keel/producer-consumer-maps.yaml (id: keel-state) for
// the full provenance chain.
//
// Producers:
//   - pitkeel state-update (Go)  → head, sd, bearing, officer
//   - pitkeel north set (Go)     → true_north
//   - scripts/gate.sh (Python3)  → gate, gate_time, tests
//   - Captain manual edit         → weave, register, tempo
//
// Consumers:
//   - scripts/hud.py              → all fields
//   - scripts/prepare-commit-msg  → officer, bearing, tempo, weave, register, gate, gate_time, tests
//   - pitkeel (self, read-modify-write)
package keelstate

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"syscall"
)

// State is the typed schema for .keel-state. All fields are exported
// with explicit JSON tags. Unknown fields are rejected on decode.
type State struct {
	// head: short git SHA of HEAD. Written by pitkeel state-update.
	Head string `json:"head"`

	// sd: last SD-NNN from session-decisions.md. Written by pitkeel state-update.
	SD string `json:"sd"`

	// bearing: structured nested object with branch/commit context.
	// Written by pitkeel state-update. Machine derives position.
	Bearing Bearing `json:"bearing"`

	// officer: agent name at the helm. Written by pitkeel state-update
	// (from --officer flag or KEEL_OFFICER env).
	Officer string `json:"officer"`

	// true_north: Captain-only field. Written by pitkeel north set.
	TrueNorth string `json:"true_north"`

	// gate: "green" or "red". Written by scripts/gate.sh.
	Gate string `json:"gate"`

	// gate_time: HH:MM or date string. Written by scripts/gate.sh.
	GateTime string `json:"gate_time"`

	// tests: count of passed tests. Written by scripts/gate.sh.
	Tests int `json:"tests"`

	// weave: current weave mode. Written by Captain manual edit.
	Weave string `json:"weave"`

	// register: quarterdeck/wardroom/below-decks/mirror.
	// Written by Captain manual edit.
	Register string `json:"register"`

	// tempo: full-sail/making-way/tacking/heave-to/beat-to-quarters.
	// Written by Captain manual edit.
	Tempo string `json:"tempo"`
}

// Bearing holds structured branch/commit context within the state.
type Bearing struct {
	// work: branch name with prefix stripped (feat/, fix/, etc.)
	Work string `json:"work"`

	// commits: count since divergence from base branch
	Commits int `json:"commits"`

	// last: most recent commit subject
	Last string `json:"last"`

	// note: human-provided orientation. Never overwritten by pitkeel.
	Note string `json:"note"`
}

// Validate checks required fields. Returns nil if state is valid.
func (s *State) Validate() error {
	if s.Gate != "" && s.Gate != "green" && s.Gate != "red" {
		return fmt.Errorf("keelstate: gate must be 'green', 'red', or empty; got %q", s.Gate)
	}
	return nil
}

// statePath returns the path to .keel-state in the given repo root.
func statePath(root string) string {
	return filepath.Join(root, ".keel-state")
}

// Read loads .keel-state from the given repo root. Returns a zero State
// (not an error) if the file does not exist.
func Read(root string) (State, error) {
	path := statePath(root)
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return State{}, nil
		}
		return State{}, fmt.Errorf("keelstate: read %s: %w", path, err)
	}

	var s State
	if err := json.Unmarshal(data, &s); err != nil {
		return State{}, fmt.Errorf("keelstate: parse %s: %w", path, err)
	}
	return s, nil
}

// Write persists the state to .keel-state, using flock to prevent
// concurrent read-modify-write corruption.
func Write(root string, s State) error {
	if err := s.Validate(); err != nil {
		return err
	}

	path := statePath(root)

	// Open (or create) with exclusive flock to prevent races
	f, err := os.OpenFile(path, os.O_RDWR|os.O_CREATE, 0644)
	if err != nil {
		return fmt.Errorf("keelstate: open %s: %w", path, err)
	}
	defer f.Close()

	if err := syscall.Flock(int(f.Fd()), syscall.LOCK_EX); err != nil {
		return fmt.Errorf("keelstate: flock %s: %w", path, err)
	}
	defer syscall.Flock(int(f.Fd()), syscall.LOCK_UN)

	data, err := json.Marshal(s)
	if err != nil {
		return fmt.Errorf("keelstate: marshal: %w", err)
	}
	data = append(data, '\n')

	if err := f.Truncate(0); err != nil {
		return fmt.Errorf("keelstate: truncate %s: %w", path, err)
	}
	if _, err := f.Seek(0, 0); err != nil {
		return fmt.Errorf("keelstate: seek %s: %w", path, err)
	}
	if _, err := f.Write(data); err != nil {
		return fmt.Errorf("keelstate: write %s: %w", path, err)
	}

	return nil
}

// ReadModifyWrite atomically reads, applies a mutation, and writes back.
// The file is locked for the entire duration.
func ReadModifyWrite(root string, fn func(*State)) error {
	path := statePath(root)

	f, err := os.OpenFile(path, os.O_RDWR|os.O_CREATE, 0644)
	if err != nil {
		return fmt.Errorf("keelstate: open %s: %w", path, err)
	}
	defer f.Close()

	if err := syscall.Flock(int(f.Fd()), syscall.LOCK_EX); err != nil {
		return fmt.Errorf("keelstate: flock %s: %w", path, err)
	}
	defer syscall.Flock(int(f.Fd()), syscall.LOCK_UN)

	// Read existing
	data, err := os.ReadFile(path)
	if err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("keelstate: read %s: %w", path, err)
	}

	var s State
	if len(data) > 0 {
		if err := json.Unmarshal(data, &s); err != nil {
			return fmt.Errorf("keelstate: parse %s: %w", path, err)
		}
	}

	// Apply mutation
	fn(&s)

	if err := s.Validate(); err != nil {
		return err
	}

	// Write back
	out, err := json.Marshal(s)
	if err != nil {
		return fmt.Errorf("keelstate: marshal: %w", err)
	}
	out = append(out, '\n')

	if err := f.Truncate(0); err != nil {
		return fmt.Errorf("keelstate: truncate %s: %w", path, err)
	}
	if _, err := f.Seek(0, 0); err != nil {
		return fmt.Errorf("keelstate: seek %s: %w", path, err)
	}
	if _, err := f.Write(out); err != nil {
		return fmt.Errorf("keelstate: write %s: %w", path, err)
	}

	return nil
}
