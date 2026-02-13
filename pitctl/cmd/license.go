package cmd

import (
	"context"
	"crypto/ed25519"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/rickhallett/thepit/shared/config"
	"github.com/rickhallett/thepit/shared/db"
	"github.com/rickhallett/thepit/shared/license"
	"github.com/rickhallett/thepit/shared/theme"
)

// RunLicenseGenerateKeys generates an Ed25519 key pair for license signing.
func RunLicenseGenerateKeys(cfg *config.Config) error {
	pub, priv, err := license.GenerateKeyPair()
	if err != nil {
		return err
	}

	dir := "keys"
	if err := os.MkdirAll(dir, 0700); err != nil {
		return fmt.Errorf("creating keys directory: %w", err)
	}

	pubHex := hex.EncodeToString(pub)
	privHex := hex.EncodeToString(priv)

	pubPath := filepath.Join(dir, "license-key.pub")
	privPath := filepath.Join(dir, "license-key.priv")

	if err := os.WriteFile(pubPath, []byte(pubHex+"\n"), 0600); err != nil {
		return fmt.Errorf("writing public key: %w", err)
	}
	if err := os.WriteFile(privPath, []byte(privHex+"\n"), 0600); err != nil {
		return fmt.Errorf("writing private key: %w", err)
	}

	fmt.Printf("\n  %s\n\n", theme.Success.Render("Key pair generated"))
	fmt.Printf("  Public key:  %s\n", pubPath)
	fmt.Printf("  Private key: %s\n\n", privPath)
	fmt.Printf("  %s\n", theme.Muted.Render("Add to .env: LICENSE_SIGNING_KEY="+privHex))
	fmt.Printf("  %s\n\n", theme.Muted.Render("Embed in CLI tools: "+pubHex))

	return nil
}

// RunLicenseIssue creates a signed license for a lab-tier user.
func RunLicenseIssue(cfg *config.Config, userID string, confirmed bool) error {
	if !confirmed {
		return fmt.Errorf("license issuance is a write operation — pass --yes to confirm")
	}

	// Load signing key from config.
	privHex := cfg.Get("LICENSE_SIGNING_KEY")
	if privHex == "" {
		return fmt.Errorf("LICENSE_SIGNING_KEY not set — run `pitctl license generate-keys` first")
	}

	privBytes, err := hex.DecodeString(privHex)
	if err != nil {
		return fmt.Errorf("decoding LICENSE_SIGNING_KEY: %w", err)
	}
	if len(privBytes) != ed25519.PrivateKeySize {
		return fmt.Errorf("invalid LICENSE_SIGNING_KEY: expected %d bytes, got %d", ed25519.PrivateKeySize, len(privBytes))
	}
	priv := ed25519.PrivateKey(privBytes)

	// Verify user exists and is lab tier.
	conn, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer conn.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	var tier string
	err = conn.QueryVal(ctx, &tier,
		`SELECT subscription_tier FROM users WHERE id = $1`, userID)
	if err != nil {
		return fmt.Errorf("looking up user %s: %w", userID, err)
	}

	if tier != "lab" {
		return fmt.Errorf("user %s has tier %q — lab tier required for license", userID, tier)
	}

	// Sign token.
	token, err := license.Sign(priv, userID, "lab")
	if err != nil {
		return fmt.Errorf("signing license: %w", err)
	}

	fmt.Printf("\n  %s\n\n", theme.Success.Render("License issued"))
	fmt.Printf("  User:    %s\n", userID)
	fmt.Printf("  Tier:    lab\n")
	fmt.Printf("  Expires: %s\n\n", time.Now().Add(license.DefaultExpiry).Format("2006-01-02 15:04:05"))
	fmt.Printf("  %s\n\n", theme.Muted.Render("Save to ~/.pit/license.jwt or set PITLAB_LICENSE"))
	fmt.Printf("  %s\n\n", string(token))

	return nil
}

// RunLicenseVerify checks a license token against the signing key.
func RunLicenseVerify(cfg *config.Config) error {
	privHex := cfg.Get("LICENSE_SIGNING_KEY")
	if privHex == "" {
		return fmt.Errorf("LICENSE_SIGNING_KEY not set — cannot derive public key")
	}

	privBytes, err := hex.DecodeString(privHex)
	if err != nil {
		return fmt.Errorf("decoding LICENSE_SIGNING_KEY: %w", err)
	}
	if len(privBytes) != ed25519.PrivateKeySize {
		return fmt.Errorf("invalid LICENSE_SIGNING_KEY: expected %d bytes, got %d", ed25519.PrivateKeySize, len(privBytes))
	}
	priv := ed25519.PrivateKey(privBytes)
	pub, ok := priv.Public().(ed25519.PublicKey)
	if !ok {
		return fmt.Errorf("failed to derive public key from private key")
	}

	path := license.DefaultLicensePath()
	if path == "" {
		return fmt.Errorf("no license path — set PITLAB_LICENSE env var")
	}

	token, err := license.LoadFromFile(path)
	if err != nil {
		return err
	}

	claims, err := license.Verify(token, pub)
	if err != nil {
		return fmt.Errorf("verification failed: %w", err)
	}

	fmt.Printf("\n  %s\n\n", theme.Success.Render("License valid"))
	fmt.Printf("  User:    %s\n", claims.Sub)
	fmt.Printf("  Tier:    %s\n", claims.Tier)
	fmt.Printf("  Issued:  %s\n", time.Unix(claims.Iat, 0).Format("2006-01-02 15:04:05"))
	fmt.Printf("  Expires: %s\n", time.Unix(claims.Exp, 0).Format("2006-01-02 15:04:05"))
	fmt.Printf("  Path:    %s\n\n", path)

	return nil
}
