// Package config handles .env file parsing and environment variable validation
// for THE PIT CLI tools. It reads the tspit project's .env file and provides
// typed access to all configuration values.
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
}

// Config holds resolved configuration values.
type Config struct {
	DatabaseURL string
	AppURL      string
	Loaded      bool
	EnvPath     string
	Vars        map[string]string // all loaded vars
}

// Load reads the .env file and merges with environment variables.
// envPath can be empty to use default resolution (CWD/../.env or CWD/.env).
func Load(envPath string) (*Config, error) {
	cfg := &Config{
		Vars: make(map[string]string),
	}

	// Resolve .env path.
	if envPath != "" {
		cfg.EnvPath = envPath
	} else {
		cfg.EnvPath = resolveEnvPath()
	}

	// Load .env file if it exists.
	if cfg.EnvPath != "" {
		envMap, err := godotenv.Read(cfg.EnvPath)
		if err != nil {
			return nil, fmt.Errorf("reading %s: %w", cfg.EnvPath, err)
		}
		for k, v := range envMap {
			cfg.Vars[k] = v
		}
		cfg.Loaded = true
	}

	// Environment variables override .env values.
	for _, spec := range Schema {
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

// resolveEnvPath looks for .env in standard locations relative to CWD.
func resolveEnvPath() string {
	cwd, err := os.Getwd()
	if err != nil {
		return ""
	}

	// Walk up to three levels to find .env (handles tool subdirectories).
	candidates := []string{
		filepath.Join(cwd, ".env"),
		filepath.Join(cwd, "..", ".env"),
		filepath.Join(cwd, "..", "..", ".env"),
	}

	for _, p := range candidates {
		if _, err := os.Stat(p); err == nil {
			abs, _ := filepath.Abs(p)
			return abs
		}
	}

	return ""
}
