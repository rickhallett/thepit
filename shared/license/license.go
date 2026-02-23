// Package license provides Ed25519-based license token creation and
// verification for The Pit CLI tools. Lab-tier users receive a signed
// license file (JWT-like structure) that tools verify offline using
// the bundled public key.
//
// Token format: base64url(header) "." base64url(payload) "." base64url(signature)
// Header:  {"alg":"EdDSA","typ":"PIT"}
// Payload: {"sub":"<userId>","tier":"lab","iss":"thepit.cloud","iat":<unix>,"exp":<unix>}
// Signature: Ed25519 over (header "." payload)
package license

import (
	"crypto/ed25519"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// Header is the fixed token header.
var headerJSON = []byte(`{"alg":"EdDSA","typ":"PIT"}`)

// Claims holds the payload of a license token.
type Claims struct {
	Sub  string `json:"sub"`  // User ID
	Tier string `json:"tier"` // Subscription tier (must be "lab")
	Iss  string `json:"iss"`  // Issuer (thepit.cloud)
	Iat  int64  `json:"iat"`  // Issued at (unix seconds)
	Exp  int64  `json:"exp"`  // Expires at (unix seconds)
}

// IsExpired returns true if the token has expired.
func (c *Claims) IsExpired() bool {
	return time.Now().Unix() > c.Exp
}

// DefaultExpiry is the license validity period.
const DefaultExpiry = 7 * 24 * time.Hour

// b64 is the URL-safe, no-padding base64 encoding used in tokens.
var b64 = base64.RawURLEncoding

// Sign creates a signed license token for the given user and tier.
func Sign(privateKey ed25519.PrivateKey, userID, tier string) ([]byte, error) {
	if len(privateKey) != ed25519.PrivateKeySize {
		return nil, fmt.Errorf("invalid private key size: %d", len(privateKey))
	}

	now := time.Now()
	claims := Claims{
		Sub:  userID,
		Tier: tier,
		Iss:  "thepit.cloud",
		Iat:  now.Unix(),
		Exp:  now.Add(DefaultExpiry).Unix(),
	}

	payloadJSON, err := json.Marshal(claims)
	if err != nil {
		return nil, fmt.Errorf("marshaling claims: %w", err)
	}

	headerB64 := b64.EncodeToString(headerJSON)
	payloadB64 := b64.EncodeToString(payloadJSON)
	signingInput := headerB64 + "." + payloadB64

	sig := ed25519.Sign(privateKey, []byte(signingInput))
	sigB64 := b64.EncodeToString(sig)

	token := signingInput + "." + sigB64
	return []byte(token), nil
}

// Verify validates a license token against the given public key.
// Returns the decoded claims if valid.
func Verify(token []byte, publicKey ed25519.PublicKey) (*Claims, error) {
	if len(publicKey) != ed25519.PublicKeySize {
		return nil, fmt.Errorf("invalid public key size: %d", len(publicKey))
	}

	parts := strings.SplitN(string(token), ".", 3)
	if len(parts) != 3 {
		return nil, fmt.Errorf("malformed token: expected 3 parts, got %d", len(parts))
	}

	headerB64, payloadB64, sigB64 := parts[0], parts[1], parts[2]

	// Verify header matches expected.
	headerBytes, err := b64.DecodeString(headerB64)
	if err != nil {
		return nil, fmt.Errorf("decoding header: %w", err)
	}
	var header map[string]string
	if err := json.Unmarshal(headerBytes, &header); err != nil {
		return nil, fmt.Errorf("parsing header: %w", err)
	}
	if header["alg"] != "EdDSA" || header["typ"] != "PIT" {
		return nil, fmt.Errorf("unexpected header: alg=%q typ=%q", header["alg"], header["typ"])
	}

	// Verify signature.
	signingInput := headerB64 + "." + payloadB64
	sig, err := b64.DecodeString(sigB64)
	if err != nil {
		return nil, fmt.Errorf("decoding signature: %w", err)
	}
	if !ed25519.Verify(publicKey, []byte(signingInput), sig) {
		return nil, fmt.Errorf("signature verification failed")
	}

	// Decode claims.
	payloadBytes, err := b64.DecodeString(payloadB64)
	if err != nil {
		return nil, fmt.Errorf("decoding payload: %w", err)
	}
	var claims Claims
	if err := json.Unmarshal(payloadBytes, &claims); err != nil {
		return nil, fmt.Errorf("parsing claims: %w", err)
	}

	// Check expiry.
	if claims.IsExpired() {
		return nil, fmt.Errorf("license expired at %s", time.Unix(claims.Exp, 0).Format(time.RFC3339))
	}

	// Verify issuer.
	if claims.Iss != "thepit.cloud" {
		return nil, fmt.Errorf("unexpected issuer: %q", claims.Iss)
	}

	return &claims, nil
}

// GenerateKeyPair creates a new Ed25519 key pair for license signing.
func GenerateKeyPair() (ed25519.PublicKey, ed25519.PrivateKey, error) {
	pub, priv, err := ed25519.GenerateKey(nil)
	if err != nil {
		return nil, nil, fmt.Errorf("generating key pair: %w", err)
	}
	return pub, priv, nil
}

// DefaultLicensePath returns the default license file path.
// Checks $PITLAB_LICENSE env var first, then falls back to ~/.pit/license.jwt.
func DefaultLicensePath() string {
	if p := os.Getenv("PITLAB_LICENSE"); p != "" {
		return p
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return ""
	}
	return filepath.Join(home, ".pit", "license.jwt")
}

// LoadFromFile reads a license token from the filesystem.
func LoadFromFile(path string) ([]byte, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("reading license file %s: %w", path, err)
	}
	// Trim any trailing whitespace/newlines.
	return []byte(strings.TrimSpace(string(data))), nil
}

// SaveToFile writes a license token to the filesystem, creating directories as needed.
func SaveToFile(path string, token []byte) error {
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0700); err != nil {
		return fmt.Errorf("creating license directory: %w", err)
	}
	if err := os.WriteFile(path, token, 0600); err != nil {
		return fmt.Errorf("writing license file: %w", err)
	}
	return nil
}

// RequireLabTier loads and verifies a license token, exiting with an error
// message if the user is not a lab-tier subscriber.
func RequireLabTier(publicKey ed25519.PublicKey) (*Claims, error) {
	path := DefaultLicensePath()
	if path == "" {
		return nil, fmt.Errorf("cannot determine license path: set PITLAB_LICENSE env var")
	}

	token, err := LoadFromFile(path)
	if err != nil {
		return nil, fmt.Errorf("lab tier license required — run `pitctl license issue` or download from your dashboard\n  %w", err)
	}

	claims, err := Verify(token, publicKey)
	if err != nil {
		return nil, fmt.Errorf("invalid or expired license — renew at thepit.cloud/dashboard\n  %w", err)
	}

	if claims.Tier != "lab" {
		return nil, fmt.Errorf("lab tier required, got %q — upgrade at thepit.cloud/pricing", claims.Tier)
	}

	return claims, nil
}
