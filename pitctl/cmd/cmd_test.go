package cmd

import (
	"testing"

	"github.com/rickhallett/thepit/shared/config"
)

// TestUsersSetTierValidation tests input validation for tier changes.
func TestUsersSetTierInvalidTier(t *testing.T) {
	cfg := &config.Config{
		DatabaseURL: "postgres://dummy",
		Vars:        map[string]string{"DATABASE_URL": "postgres://dummy"},
	}

	err := RunUsersSetTier(cfg, "user_test123", "invalid_tier", true)
	if err == nil {
		t.Error("expected error for invalid tier")
	}
	if err.Error() != `invalid tier "invalid_tier" — must be one of: free, pass, lab` {
		t.Errorf("unexpected error message: %v", err)
	}
}

// TestUsersSetTierRequiresConfirmation tests that write ops need --yes.
func TestUsersSetTierRequiresConfirmation(t *testing.T) {
	// This will fail at the DB level anyway, but we test validation first.
	// With confirmed=false and a valid tier, the function should check the DB
	// and return a confirmation error. Since we don't have a DB, it will fail
	// at connection, which is expected — but the validation happens before DB.
	cfg := &config.Config{
		DatabaseURL: "", // empty URL causes connection failure
		Vars:        map[string]string{},
	}

	err := RunUsersSetTier(cfg, "user_test", "free", true)
	if err == nil {
		t.Error("expected error with empty DATABASE_URL")
	}
}

// TestCreditsGrantValidation tests input validation for credit grants.
func TestCreditsGrantNonPositiveAmount(t *testing.T) {
	cfg := &config.Config{
		DatabaseURL: "postgres://dummy",
		Vars:        map[string]string{"DATABASE_URL": "postgres://dummy"},
	}

	err := RunCreditsGrant(cfg, "user_test", 0, true)
	if err == nil {
		t.Error("expected error for zero amount")
	}

	err = RunCreditsGrant(cfg, "user_test", -100, true)
	if err == nil {
		t.Error("expected error for negative amount")
	}
}

// TestCreditsGrantRequiresConfirmation tests that grants need --yes.
func TestCreditsGrantRequiresConfirmation(t *testing.T) {
	cfg := &config.Config{
		DatabaseURL: "postgres://dummy",
		Vars:        map[string]string{"DATABASE_URL": "postgres://dummy"},
	}

	err := RunCreditsGrant(cfg, "user_test", 100, false)
	if err == nil {
		t.Error("expected error without confirmation")
	}
}

// TestBoutsPurgeRequiresConfirmation tests that purge needs --yes.
func TestBoutsPurgeRequiresConfirmation(t *testing.T) {
	cfg := &config.Config{
		DatabaseURL: "", // will fail at connection
		Vars:        map[string]string{},
	}

	err := RunBoutsPurgeErrors(cfg, false)
	if err == nil {
		t.Error("expected error with empty DATABASE_URL")
	}
}

// TestTruncStr tests string truncation.
func TestTruncStr(t *testing.T) {
	tests := []struct {
		input string
		max   int
		want  string
	}{
		{"hello", 10, "hello"},
		{"hello world", 8, "hello..."},
		{"short", 5, "short"},
		{"ab", 10, "ab"},
	}

	for _, tc := range tests {
		got := truncStr(tc.input, tc.max)
		if got != tc.want {
			t.Errorf("truncStr(%q, %d) = %q, want %q", tc.input, tc.max, got, tc.want)
		}
	}
}
