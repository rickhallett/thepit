package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadFromEnvFile(t *testing.T) {
	dir := t.TempDir()
	envPath := filepath.Join(dir, ".env")
	content := `DATABASE_URL=postgres://localhost:5432/testdb
ANTHROPIC_API_KEY=sk-ant-test-key
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_123
CLERK_SECRET_KEY=sk_test_456
SUBSCRIPTIONS_ENABLED=true
CREDITS_ENABLED=false
NEXT_PUBLIC_APP_URL=https://test.thepit.cloud
`
	if err := os.WriteFile(envPath, []byte(content), 0644); err != nil {
		t.Fatal(err)
	}

	cfg, err := Load(envPath)
	if err != nil {
		t.Fatalf("Load(%q) error: %v", envPath, err)
	}

	if !cfg.Loaded {
		t.Error("expected Loaded=true")
	}
	if cfg.DatabaseURL != "postgres://localhost:5432/testdb" {
		t.Errorf("DatabaseURL = %q, want postgres://localhost:5432/testdb", cfg.DatabaseURL)
	}
	if cfg.AppURL != "https://test.thepit.cloud" {
		t.Errorf("AppURL = %q, want https://test.thepit.cloud", cfg.AppURL)
	}
}

func TestLoadDefaultAppURL(t *testing.T) {
	dir := t.TempDir()
	envPath := filepath.Join(dir, ".env")
	if err := os.WriteFile(envPath, []byte("DATABASE_URL=test\n"), 0644); err != nil {
		t.Fatal(err)
	}

	cfg, err := Load(envPath)
	if err != nil {
		t.Fatal(err)
	}

	if cfg.AppURL != "http://localhost:3000" {
		t.Errorf("default AppURL = %q, want http://localhost:3000", cfg.AppURL)
	}
}

func TestIsSet(t *testing.T) {
	cfg := &Config{
		Vars: map[string]string{
			"DATABASE_URL": "postgres://foo",
			"EMPTY_VAR":    "",
		},
	}

	if !cfg.IsSet("DATABASE_URL") {
		t.Error("expected IsSet(DATABASE_URL) = true")
	}
	if cfg.IsSet("EMPTY_VAR") {
		t.Error("expected IsSet(EMPTY_VAR) = false for empty string")
	}
	if cfg.IsSet("NONEXISTENT") {
		t.Error("expected IsSet(NONEXISTENT) = false")
	}
}

func TestIsEnabled(t *testing.T) {
	cfg := &Config{
		Vars: map[string]string{
			"FLAG_TRUE":  "true",
			"FLAG_TRUE2": "True",
			"FLAG_FALSE": "false",
			"FLAG_OTHER": "yes",
		},
	}

	tests := []struct {
		name string
		want bool
	}{
		{"FLAG_TRUE", true},
		{"FLAG_TRUE2", true},
		{"FLAG_FALSE", false},
		{"FLAG_OTHER", false},
		{"NONEXISTENT", false},
	}

	for _, tc := range tests {
		got := cfg.IsEnabled(tc.name)
		if got != tc.want {
			t.Errorf("IsEnabled(%q) = %v, want %v", tc.name, got, tc.want)
		}
	}
}

func TestValidate(t *testing.T) {
	cfg := &Config{
		Vars: map[string]string{
			"DATABASE_URL":                      "postgres://foo",
			"ANTHROPIC_API_KEY":                 "sk-ant-test",
			"NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY": "pk_test",
			"CLERK_SECRET_KEY":                  "sk_test",
		},
	}

	missing := cfg.Validate()
	if len(missing) != 0 {
		t.Errorf("Validate() returned missing vars: %v", missing)
	}

	cfg2 := &Config{
		Vars: map[string]string{
			"DATABASE_URL":      "postgres://foo",
			"ANTHROPIC_API_KEY": "sk-ant-test",
		},
	}

	missing2 := cfg2.Validate()
	if len(missing2) != 2 {
		t.Errorf("Validate() returned %d missing, want 2: %v", len(missing2), missing2)
	}
}

func TestGet(t *testing.T) {
	cfg := &Config{
		Vars: map[string]string{
			"KEY": "value",
		},
	}

	if got := cfg.Get("KEY"); got != "value" {
		t.Errorf("Get(KEY) = %q, want value", got)
	}
	if got := cfg.Get("MISSING"); got != "" {
		t.Errorf("Get(MISSING) = %q, want empty", got)
	}
}

func TestEnvVarOverridesEnvFile(t *testing.T) {
	dir := t.TempDir()
	envPath := filepath.Join(dir, ".env")
	if err := os.WriteFile(envPath, []byte("DATABASE_URL=from_file\n"), 0644); err != nil {
		t.Fatal(err)
	}

	t.Setenv("DATABASE_URL", "from_env")

	cfg, err := Load(envPath)
	if err != nil {
		t.Fatal(err)
	}

	if cfg.DatabaseURL != "from_env" {
		t.Errorf("DatabaseURL = %q, want from_env (env var should override .env file)", cfg.DatabaseURL)
	}
}

func TestLoadNonExistentPath(t *testing.T) {
	_, err := Load("/tmp/does_not_exist_at_all/.env")
	if err == nil {
		t.Error("expected error for non-existent .env path")
	}
}

func TestSchemaContainsRequiredVars(t *testing.T) {
	required := []string{"DATABASE_URL", "ANTHROPIC_API_KEY", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY"}
	schemaNames := make(map[string]bool)
	for _, s := range Schema {
		schemaNames[s.Name] = true
	}
	for _, r := range required {
		if !schemaNames[r] {
			t.Errorf("required var %q not found in Schema", r)
		}
	}
}

func TestSchemaContainsLicenseSigningKey(t *testing.T) {
	schemaNames := make(map[string]bool)
	for _, s := range Schema {
		schemaNames[s.Name] = true
	}
	if !schemaNames["LICENSE_SIGNING_KEY"] {
		t.Error("LICENSE_SIGNING_KEY not found in Schema")
	}
}
