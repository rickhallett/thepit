package cmd

import "testing"

// ---------------------------------------------------------------------------
// Unit tests for the pure helper functions in proof.go.
//
// These are unexported helpers used by RunProof to format attestation data.
// They have zero side effects and no external dependencies — pure in, pure out.
// ---------------------------------------------------------------------------

func TestIsZeroUID(t *testing.T) {
	tests := []struct {
		name string
		uid  string
		want bool
	}{
		// Zero UIDs (should return true)
		{name: "all zeros no prefix", uid: "0000000000000000000000000000000000000000000000000000000000000000", want: true},
		{name: "all zeros with 0x prefix", uid: "0x0000000000000000000000000000000000000000000000000000000000000000", want: true},
		{name: "short zero string", uid: "0000", want: true},
		{name: "single zero", uid: "0", want: true},
		{name: "0x prefix only zeros", uid: "0x0000", want: true},
		{name: "empty string after trim", uid: "0x", want: true},
		{name: "empty string", uid: "", want: true},

		// Non-zero UIDs (should return false)
		{name: "valid attestation UID", uid: "0x13da22148f63504eac18935143f20349a619b7ebeaf416f0fa5362db923f0724", want: false},
		{name: "trailing non-zero", uid: "0x0000000000000000000000000000000000000000000000000000000000000001", want: false},
		{name: "leading non-zero", uid: "0x1000000000000000000000000000000000000000000000000000000000000000", want: false},
		{name: "middle non-zero", uid: "0x00000000000000000000000000000000a0000000000000000000000000000000", want: false},
		{name: "all f's", uid: "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff", want: false},
		{name: "short non-zero", uid: "0xab", want: false},
		{name: "no prefix non-zero", uid: "abc123", want: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := isZeroUID(tt.uid)
			if got != tt.want {
				t.Errorf("isZeroUID(%q) = %v, want %v", tt.uid, got, tt.want)
			}
		})
	}
}

func TestFormatUnixUTC(t *testing.T) {
	tests := []struct {
		name string
		ts   uint64
		want string
	}{
		{name: "zero returns never", ts: 0, want: "never"},
		{name: "unix epoch 1", ts: 1, want: "1970-01-01 00:00:01 UTC"},
		{name: "known timestamp 2024-01-18", ts: 1705598848, want: "2024-01-18 17:27:28 UTC"},
		{name: "year 2000 timestamp", ts: 946684800, want: "2000-01-01 00:00:00 UTC"},
		{name: "large timestamp 2038", ts: 2145916800, want: "2038-01-01 00:00:00 UTC"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := formatUnixUTC(tt.ts)
			if got != tt.want {
				t.Errorf("formatUnixUTC(%d) = %q, want %q", tt.ts, got, tt.want)
			}
		})
	}
}

func TestFormatExpiration(t *testing.T) {
	tests := []struct {
		name string
		ts   uint64
		want string
	}{
		{name: "zero returns permanent", ts: 0, want: "none (permanent)"},
		{name: "non-zero includes timestamp and formatted date", ts: 1705598848, want: "1705598848 (2024-01-18 17:27:28 UTC)"},
		{name: "epoch 1", ts: 1, want: "1 (1970-01-01 00:00:01 UTC)"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := formatExpiration(tt.ts)
			if got != tt.want {
				t.Errorf("formatExpiration(%d) = %q, want %q", tt.ts, got, tt.want)
			}
		})
	}
}

func TestDisplayOrNone(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{name: "empty string returns (none)", input: "", want: "(none)"},
		{name: "non-empty passthrough", input: "preset-socrates", want: "preset-socrates"},
		{name: "whitespace is not empty", input: " ", want: " "},
		{name: "zero value string", input: "0", want: "0"},
		{name: "long string passthrough", input: "0x13da22148f63504eac18935143f20349a619b7ebeaf416f0fa5362db923f0724", want: "0x13da22148f63504eac18935143f20349a619b7ebeaf416f0fa5362db923f0724"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := displayOrNone(tt.input)
			if got != tt.want {
				t.Errorf("displayOrNone(%q) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}
}
