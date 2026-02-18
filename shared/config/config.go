// Package config handles .env file parsing and environment variable validation
// for THE PIT CLI tools. It reads the tspit project's .env and .env.local files
// and provides typed access to all configuration values.
//
// Resolution order (Next.js convention):
//  1. .env           — base defaults
//  2. .env.local     — local overrides (gitignored)
//  3. Shell env vars — always win
//
// All pit* CLIs should use this package as the single source of truth for
// environment configuration. Do not use raw os.Getenv in CLI code.
package config

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/joho/godotenv"
)

// VarSpec describes a single environment variable's requirements.
type VarSpec struct {
	Name     string
	Required bool
	Desc     string
}

// Schema defines all environment variables the CLI tools know about.
var Schema = []VarSpec{
	{Name: "DATABASE_URL", Required: true, Desc: "Neon PostgreSQL connection string"},
	{Name: "ANTHROPIC_API_KEY", Required: true, Desc: "Anthropic Claude API key"},
	{Name: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", Required: true, Desc: "Clerk auth (client)"},
	{Name: "CLERK_SECRET_KEY", Required: true, Desc: "Clerk auth (server)"},
	{Name: "STRIPE_SECRET_KEY", Required: false, Desc: "Stripe API key"},
	{Name: "STRIPE_WEBHOOK_SECRET", Required: false, Desc: "Stripe webhook secret"},
	{Name: "STRIPE_PASS_PRICE_ID", Required: false, Desc: "Pit Pass subscription price ID"},
	{Name: "STRIPE_LAB_PRICE_ID", Required: false, Desc: "Pit Lab subscription price ID"},
	{Name: "NEXT_PUBLIC_APP_URL", Required: false, Desc: "Application URL"},
	{Name: "ADMIN_USER_IDS", Required: false, Desc: "Comma-separated admin Clerk user IDs"},
	{Name: "ADMIN_SEED_TOKEN", Required: false, Desc: "Token for seed-agents endpoint"},
	{Name: "SUBSCRIPTIONS_ENABLED", Required: false, Desc: "Enable subscription tiers"},
	{Name: "CREDITS_ENABLED", Required: false, Desc: "Enable credit system"},
	{Name: "BYOK_ENABLED", Required: false, Desc: "Enable bring-your-own-key"},
	{Name: "FREE_BOUT_POOL_MAX", Required: false, Desc: "Daily free bout pool cap"},
	{Name: "ASK_THE_PIT_ENABLED", Required: false, Desc: "Enable RAG chatbot"},
	{Name: "EAS_ENABLED", Required: false, Desc: "Enable on-chain attestations"},
	{Name: "RESEND_API_KEY", Required: false, Desc: "Resend email API key"},
	{Name: "LICENSE_SIGNING_KEY", Required: false, Desc: "Ed25519 private key for license signing (hex)"},
	// Linear issue tracking (pitlinear).
	{Name: "LINEAR_API_KEY", Required: false, Desc: "Linear API key"},
	{Name: "LINEAR_TEAM_NAME", Required: false, Desc: "Default Linear team key (e.g. Oceanheartai)"},
	// On-chain attestations (pitnet).
	{Name: "EAS_RPC_URL", Required: false, Desc: "Base L2 RPC URL for EAS"},
	{Name: "EAS_SCHEMA_UID", Required: false, Desc: "EAS schema UID"},
	{Name: "EAS_SIGNER_PRIVATE_KEY", Required: false, Desc: "EAS signer private key (hex)"},
	// PostHog analytics (shared).
	{Name: "NEXT_PUBLIC_POSTHOG_KEY", Required: false, Desc: "PostHog project API key"},
	{Name: "NEXT_PUBLIC_POSTHOG_HOST", Required: false, Desc: "PostHog API host"},
}

// Config holds resolved configuration values.
type Config struct {
	DatabaseURL string
	AppURL      string
	Loaded      bool
	EnvPath     string            // first env file found (backward compat)
	EnvPaths    []string          // all env files loaded, in order
	Vars        map[string]string // all loaded vars
}

// Load reads .env and .env.local files, then merges with shell environment
// variables. Resolution order follows the Next.js convention:
//
//  1. .env           — base defaults
//  2. .env.local     — local overrides (gitignored)
//  3. Shell env vars — always win
//
// envPath can be empty to use default resolution (walks up from CWD).
// If envPath is an explicit path, both that file and its .local sibling
// are loaded (e.g. passing "/foo/.env" also checks "/foo/.env.local").
func Load(envPath string) (*Config, error) {
	cfg := &Config{
		Vars: make(map[string]string),
	}

	// Resolve env file paths.
	var paths []string
	if envPath != "" {
		paths = []string{envPath}
		// Also check the .local sibling of the explicit path.
		localPath := envPath + ".local"
		if _, err := os.Stat(localPath); err == nil {
			paths = append(paths, localPath)
		}
	} else {
		paths = resolveEnvPaths()
	}

	// Load env files in order — later files override earlier ones.
	for _, p := range paths {
		envMap, err := godotenv.Read(p)
		if err != nil {
			return nil, fmt.Errorf("reading %s: %w", p, err)
		}
		for k, v := range envMap {
			cfg.Vars[k] = v
		}
		cfg.EnvPaths = append(cfg.EnvPaths, p)
		if cfg.EnvPath == "" {
			cfg.EnvPath = p // backward compat: first file found
		}
		cfg.Loaded = true
	}

	// Shell environment variables override everything.
	// Check all vars loaded from dotenv files AND all Schema entries,
	// so that shell env works even for vars not in any dotenv file.
	checked := make(map[string]bool)
	for key := range cfg.Vars {
		if val := os.Getenv(key); val != "" {
			cfg.Vars[key] = val
		}
		checked[key] = true
	}
	for _, spec := range Schema {
		if checked[spec.Name] {
			continue
		}
		if val := os.Getenv(spec.Name); val != "" {
			cfg.Vars[spec.Name] = val
		}
	}

	cfg.DatabaseURL = cfg.Vars["DATABASE_URL"]
	cfg.AppURL = cfg.Vars["NEXT_PUBLIC_APP_URL"]
	if cfg.AppURL == "" {
		cfg.AppURL = "http://localhost:3000"
	}

	return cfg, nil
}

// Get returns the value of an environment variable.
func (c *Config) Get(name string) string {
	return c.Vars[name]
}

// IsSet returns true if the variable has a non-empty value.
func (c *Config) IsSet(name string) bool {
	return c.Vars[name] != ""
}

// IsEnabled returns true if the variable is set to "true".
func (c *Config) IsEnabled(name string) bool {
	return strings.ToLower(c.Vars[name]) == "true"
}

// Validate checks that all required variables are set. Returns a list of
// missing variable names.
func (c *Config) Validate() []string {
	var missing []string
	for _, spec := range Schema {
		if spec.Required && !c.IsSet(spec.Name) {
			missing = append(missing, spec.Name)
		}
	}
	return missing
}

// resolveEnvPaths looks for .env and .env.local in standard locations relative
// to CWD. Returns paths in load order: .env first, then .env.local (at the
// same directory level). Stops walking up once the first .env is found.
func resolveEnvPaths() []string {
	cwd, err := os.Getwd()
	if err != nil {
		return nil
	}

	// Walk up to three levels to find .env (handles tool subdirectories).
	dirs := []string{
		cwd,
		filepath.Join(cwd, ".."),
		filepath.Join(cwd, "..", ".."),
	}

	for _, dir := range dirs {
		envPath := filepath.Join(dir, ".env")
		if _, err := os.Stat(envPath); err != nil {
			continue
		}
		abs, _ := filepath.Abs(envPath)
		paths := []string{abs}

		// Check for .env.local in the same directory.
		localPath := filepath.Join(dir, ".env.local")
		if _, err := os.Stat(localPath); err == nil {
			absLocal, _ := filepath.Abs(localPath)
			paths = append(paths, absLocal)
		}

		return paths
	}

	// No .env found — check for standalone .env.local (rare but valid).
	for _, dir := range dirs {
		localPath := filepath.Join(dir, ".env.local")
		if _, err := os.Stat(localPath); err == nil {
			absLocal, _ := filepath.Abs(localPath)
			return []string{absLocal}
		}
	}

	return nil
}
