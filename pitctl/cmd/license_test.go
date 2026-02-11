package cmd

import (
	"crypto/ed25519"
	"encoding/hex"
	"os"
	"path/filepath"
	"testing"

	"github.com/rickhallett/thepit/shared/config"
)

func TestLicenseGenerateKeys(t *testing.T) {
	// Run in temp dir so keys don't pollute the project.
	orig, _ := os.Getwd()
	dir := t.TempDir()
	os.Chdir(dir)
	defer os.Chdir(orig)

	cfg := &config.Config{Vars: make(map[string]string)}
	if err := RunLicenseGenerateKeys(cfg); err != nil {
		t.Fatalf("RunLicenseGenerateKeys: %v", err)
	}

	// Verify files were created.
	pubBytes, err := os.ReadFile(filepath.Join("keys", "license-key.pub"))
	if err != nil {
		t.Fatalf("reading public key: %v", err)
	}
	privBytes, err := os.ReadFile(filepath.Join("keys", "license-key.priv"))
	if err != nil {
		t.Fatalf("reading private key: %v", err)
	}

	// Verify they decode to valid Ed25519 keys.
	pubHex := string(pubBytes[:len(pubBytes)-1]) // trim newline
	privHex := string(privBytes[:len(privBytes)-1])

	pub, err := hex.DecodeString(pubHex)
	if err != nil {
		t.Fatalf("decoding public key hex: %v", err)
	}
	priv, err := hex.DecodeString(privHex)
	if err != nil {
		t.Fatalf("decoding private key hex: %v", err)
	}

	if len(pub) != ed25519.PublicKeySize {
		t.Errorf("public key size = %d, want %d", len(pub), ed25519.PublicKeySize)
	}
	if len(priv) != ed25519.PrivateKeySize {
		t.Errorf("private key size = %d, want %d", len(priv), ed25519.PrivateKeySize)
	}

	// Verify private key permissions.
	info, err := os.Stat(filepath.Join("keys", "license-key.priv"))
	if err != nil {
		t.Fatalf("stat private key: %v", err)
	}
	if info.Mode().Perm() != 0600 {
		t.Errorf("private key permissions = %o, want 0600", info.Mode().Perm())
	}
}

func TestLicenseIssueRequiresConfirmation(t *testing.T) {
	cfg := &config.Config{
		Vars: map[string]string{
			"LICENSE_SIGNING_KEY": "abc123",
		},
	}
	err := RunLicenseIssue(cfg, "user_test", false)
	if err == nil {
		t.Error("expected error when confirmed=false")
	}
}

func TestLicenseIssueRequiresSigningKey(t *testing.T) {
	cfg := &config.Config{Vars: make(map[string]string)}
	err := RunLicenseIssue(cfg, "user_test", true)
	if err == nil {
		t.Error("expected error when LICENSE_SIGNING_KEY not set")
	}
}
