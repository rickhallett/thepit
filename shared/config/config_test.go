package config

import (
	"os"
	"path/filepath"
	"strings"
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

func TestLoadEmptyPathResolvesEnvFile(t *testing.T) {
	// Create a temp dir with a .env file, chdir into it, call Load("").
	dir := t.TempDir()
	envPath := filepath.Join(dir, ".env")
	content := "DATABASE_URL=postgres://resolve-test\nANTHROPIC_API_KEY=sk-test\n"
	if err := os.WriteFile(envPath, []byte(content), 0644); err != nil {
		t.Fatal(err)
	}

	// Save and restore CWD.
	origDir, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	defer os.Chdir(origDir)

	if err := os.Chdir(dir); err != nil {
		t.Fatal(err)
	}

	cfg, err := Load("")
	if err != nil {
		t.Fatalf("Load(\"\") error: %v", err)
	}
	if !cfg.Loaded {
		t.Error("expected Loaded=true when .env exists in CWD")
	}
	if cfg.DatabaseURL != "postgres://resolve-test" {
		t.Errorf("DatabaseURL = %q, want postgres://resolve-test", cfg.DatabaseURL)
	}
}

func TestLoadEmptyPathNoEnvFile(t *testing.T) {
	// chdir into a temp dir with no .env file, call Load("").
	dir := t.TempDir()
	origDir, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	defer os.Chdir(origDir)

	if err := os.Chdir(dir); err != nil {
		t.Fatal(err)
	}

	cfg, err := Load("")
	if err != nil {
		t.Fatalf("Load(\"\") error: %v", err)
	}
	if cfg.Loaded {
		t.Error("expected Loaded=false when no .env exists")
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

func TestSchemaContainsCLIVars(t *testing.T) {
	schemaNames := make(map[string]bool)
	for _, s := range Schema {
		schemaNames[s.Name] = true
	}
	for _, name := range []string{
		"LINEAR_API_KEY",
		"LINEAR_TEAM_NAME",
		"EAS_RPC_URL",
		"EAS_SCHEMA_UID",
		"EAS_SIGNER_PRIVATE_KEY",
	} {
		if !schemaNames[name] {
			t.Errorf("%q not found in Schema", name)
		}
	}
}

func TestEnvLocalOverridesEnv(t *testing.T) {
	dir := t.TempDir()

	// .env has the base value.
	envPath := filepath.Join(dir, ".env")
	if err := os.WriteFile(envPath, []byte("DATABASE_URL=from_env\nLINEAR_API_KEY=base_key\n"), 0644); err != nil {
		t.Fatal(err)
	}

	// .env.local overrides LINEAR_API_KEY but not DATABASE_URL.
	localPath := filepath.Join(dir, ".env.local")
	if err := os.WriteFile(localPath, []byte("LINEAR_API_KEY=local_key\n"), 0644); err != nil {
		t.Fatal(err)
	}

	cfg, err := Load(envPath)
	if err != nil {
		t.Fatal(err)
	}

	if got := cfg.Get("DATABASE_URL"); got != "from_env" {
		t.Errorf("DATABASE_URL = %q, want from_env (should be preserved from .env)", got)
	}
	if got := cfg.Get("LINEAR_API_KEY"); got != "local_key" {
		t.Errorf("LINEAR_API_KEY = %q, want local_key (.env.local should override .env)", got)
	}
	if len(cfg.EnvPaths) != 2 {
		t.Errorf("EnvPaths has %d entries, want 2", len(cfg.EnvPaths))
	}
}

func TestShellOverridesEnvLocal(t *testing.T) {
	dir := t.TempDir()

	envPath := filepath.Join(dir, ".env")
	if err := os.WriteFile(envPath, []byte("LINEAR_API_KEY=from_file\n"), 0644); err != nil {
		t.Fatal(err)
	}
	localPath := filepath.Join(dir, ".env.local")
	if err := os.WriteFile(localPath, []byte("LINEAR_API_KEY=from_local\n"), 0644); err != nil {
		t.Fatal(err)
	}

	t.Setenv("LINEAR_API_KEY", "from_shell")

	cfg, err := Load(envPath)
	if err != nil {
		t.Fatal(err)
	}

	if got := cfg.Get("LINEAR_API_KEY"); got != "from_shell" {
		t.Errorf("LINEAR_API_KEY = %q, want from_shell (shell should override .env.local)", got)
	}
}

func TestNonSchemaVarShellOverride(t *testing.T) {
	dir := t.TempDir()

	// Put a non-schema var in .env.
	envPath := filepath.Join(dir, ".env")
	if err := os.WriteFile(envPath, []byte("CUSTOM_VAR=from_file\n"), 0644); err != nil {
		t.Fatal(err)
	}

	t.Setenv("CUSTOM_VAR", "from_shell")

	cfg, err := Load(envPath)
	if err != nil {
		t.Fatal(err)
	}

	if got := cfg.Get("CUSTOM_VAR"); got != "from_shell" {
		t.Errorf("CUSTOM_VAR = %q, want from_shell (shell should override .env for non-schema vars)", got)
	}
}

func TestEnvLocalOnlyNoEnv(t *testing.T) {
	// Only .env.local exists (no .env). Should still load.
	dir := t.TempDir()
	localPath := filepath.Join(dir, ".env.local")
	if err := os.WriteFile(localPath, []byte("LINEAR_API_KEY=local_only\n"), 0644); err != nil {
		t.Fatal(err)
	}

	origDir, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	defer os.Chdir(origDir)

	if err := os.Chdir(dir); err != nil {
		t.Fatal(err)
	}

	cfg, err := Load("")
	if err != nil {
		t.Fatal(err)
	}

	if !cfg.Loaded {
		t.Error("expected Loaded=true when .env.local exists in CWD")
	}
	if got := cfg.Get("LINEAR_API_KEY"); got != "local_only" {
		t.Errorf("LINEAR_API_KEY = %q, want local_only", got)
	}
}

func TestSensitiveKeysScrubbed(t *testing.T) {
	dir := t.TempDir()
	envPath := filepath.Join(dir, ".env")
	content := `DATABASE_URL=postgres://secret-db
ANTHROPIC_API_KEY=sk-ant-secret
CLERK_SECRET_KEY=sk_live_secret
EAS_SIGNER_PRIVATE_KEY=0xdeadbeef
NEXT_PUBLIC_APP_URL=https://test.example.com
LINEAR_TEAM_NAME=MYTEAM
EAS_RPC_URL=https://rpc.example.com
`
	if err := os.WriteFile(envPath, []byte(content), 0644); err != nil {
		t.Fatal(err)
	}

	cfg, err := Load(envPath)
	if err != nil {
		t.Fatal(err)
	}

	// Sensitive keys should NOT be in Vars.
	for _, key := range []string{"DATABASE_URL", "ANTHROPIC_API_KEY", "CLERK_SECRET_KEY", "EAS_SIGNER_PRIVATE_KEY"} {
		if _, ok := cfg.Vars[key]; ok {
			t.Errorf("sensitive key %q should be scrubbed from Vars", key)
		}
	}

	// Non-sensitive keys should remain in Vars.
	for _, key := range []string{"NEXT_PUBLIC_APP_URL", "LINEAR_TEAM_NAME", "EAS_RPC_URL"} {
		if _, ok := cfg.Vars[key]; !ok {
			t.Errorf("non-sensitive key %q should remain in Vars", key)
		}
	}

	// All keys should still be accessible via Get().
	if got := cfg.Get("DATABASE_URL"); got != "postgres://secret-db" {
		t.Errorf("Get(DATABASE_URL) = %q, want postgres://secret-db", got)
	}
	if got := cfg.Get("ANTHROPIC_API_KEY"); got != "sk-ant-secret" {
		t.Errorf("Get(ANTHROPIC_API_KEY) = %q, want sk-ant-secret", got)
	}
	if got := cfg.Get("CLERK_SECRET_KEY"); got != "sk_live_secret" {
		t.Errorf("Get(CLERK_SECRET_KEY) = %q, want sk_live_secret", got)
	}
	if got := cfg.Get("EAS_SIGNER_PRIVATE_KEY"); got != "0xdeadbeef" {
		t.Errorf("Get(EAS_SIGNER_PRIVATE_KEY) = %q, want 0xdeadbeef", got)
	}
	if got := cfg.Get("LINEAR_TEAM_NAME"); got != "MYTEAM" {
		t.Errorf("Get(LINEAR_TEAM_NAME) = %q, want MYTEAM", got)
	}
}

func TestStringRedactsSensitiveValues(t *testing.T) {
	dir := t.TempDir()
	envPath := filepath.Join(dir, ".env")
	content := "DATABASE_URL=postgres://secret\nANTHROPIC_API_KEY=sk-secret\nNEXT_PUBLIC_APP_URL=https://test.example.com\n"
	if err := os.WriteFile(envPath, []byte(content), 0644); err != nil {
		t.Fatal(err)
	}

	cfg, err := Load(envPath)
	if err != nil {
		t.Fatal(err)
	}

	str := cfg.String()

	// Should contain REDACTED for sensitive keys.
	if !strings.Contains(str, "REDACTED") {
		t.Errorf("String() should contain REDACTED, got: %s", str)
	}

	// Should NOT contain actual secret values.
	if strings.Contains(str, "postgres://secret") {
		t.Errorf("String() should not contain actual DATABASE_URL value")
	}
	if strings.Contains(str, "sk-secret") {
		t.Errorf("String() should not contain actual ANTHROPIC_API_KEY value")
	}
}

func TestAutoResolveWithEnvLocal(t *testing.T) {
	// Both .env and .env.local exist in CWD. Auto-resolve should find both.
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, ".env"), []byte("DATABASE_URL=base\nANTHROPIC_API_KEY=base_key\n"), 0644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, ".env.local"), []byte("ANTHROPIC_API_KEY=local_key\n"), 0644); err != nil {
		t.Fatal(err)
	}

	origDir, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	defer os.Chdir(origDir)

	if err := os.Chdir(dir); err != nil {
		t.Fatal(err)
	}

	cfg, err := Load("")
	if err != nil {
		t.Fatal(err)
	}

	if got := cfg.Get("DATABASE_URL"); got != "base" {
		t.Errorf("DATABASE_URL = %q, want base", got)
	}
	if got := cfg.Get("ANTHROPIC_API_KEY"); got != "local_key" {
		t.Errorf("ANTHROPIC_API_KEY = %q, want local_key (.env.local should override .env)", got)
	}
	if len(cfg.EnvPaths) != 2 {
		t.Errorf("EnvPaths has %d entries, want 2", len(cfg.EnvPaths))
	}
}
