package license

import (
	"crypto/ed25519"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func generateTestKeys(t *testing.T) (ed25519.PublicKey, ed25519.PrivateKey) {
	t.Helper()
	pub, priv, err := GenerateKeyPair()
	if err != nil {
		t.Fatalf("GenerateKeyPair: %v", err)
	}
	return pub, priv
}

func TestSignAndVerify(t *testing.T) {
	pub, priv := generateTestKeys(t)

	token, err := Sign(priv, "user_test123", "lab")
	if err != nil {
		t.Fatalf("Sign: %v", err)
	}

	claims, err := Verify(token, pub)
	if err != nil {
		t.Fatalf("Verify: %v", err)
	}

	if claims.Sub != "user_test123" {
		t.Errorf("Sub = %q, want user_test123", claims.Sub)
	}
	if claims.Tier != "lab" {
		t.Errorf("Tier = %q, want lab", claims.Tier)
	}
	if claims.Iss != "thepit.cloud" {
		t.Errorf("Iss = %q, want thepit.cloud", claims.Iss)
	}
	if claims.Exp-claims.Iat != int64(DefaultExpiry.Seconds()) {
		t.Errorf("Exp-Iat = %d, want %d", claims.Exp-claims.Iat, int64(DefaultExpiry.Seconds()))
	}
}

func TestVerifyRejectsTamperedPayload(t *testing.T) {
	pub, priv := generateTestKeys(t)

	token, err := Sign(priv, "user_test123", "lab")
	if err != nil {
		t.Fatalf("Sign: %v", err)
	}

	// Tamper with the payload: change tier to "free".
	parts := strings.SplitN(string(token), ".", 3)
	payloadBytes, _ := b64.DecodeString(parts[1])
	var claims Claims
	json.Unmarshal(payloadBytes, &claims)
	claims.Tier = "free"
	tamperedPayload, _ := json.Marshal(claims)
	parts[1] = b64.EncodeToString(tamperedPayload)
	tampered := []byte(strings.Join(parts, "."))

	_, err = Verify(tampered, pub)
	if err == nil {
		t.Error("expected verification to fail for tampered token")
	}
	if !strings.Contains(err.Error(), "signature verification failed") {
		t.Errorf("unexpected error: %v", err)
	}
}

func TestVerifyRejectsWrongKey(t *testing.T) {
	_, priv := generateTestKeys(t)
	otherPub, _ := generateTestKeys(t)

	token, err := Sign(priv, "user_test123", "lab")
	if err != nil {
		t.Fatalf("Sign: %v", err)
	}

	_, err = Verify(token, otherPub)
	if err == nil {
		t.Error("expected verification to fail with wrong public key")
	}
}

func TestVerifyRejectsExpiredToken(t *testing.T) {
	pub, priv := generateTestKeys(t)

	// Create a token that's already expired.
	claims := Claims{
		Sub:  "user_expired",
		Tier: "lab",
		Iss:  "thepit.cloud",
		Iat:  time.Now().Add(-48 * time.Hour).Unix(),
		Exp:  time.Now().Add(-1 * time.Hour).Unix(),
	}

	payloadJSON, _ := json.Marshal(claims)
	headerB64 := b64.EncodeToString(headerJSON)
	payloadB64 := b64.EncodeToString(payloadJSON)
	signingInput := headerB64 + "." + payloadB64
	sig := ed25519.Sign(priv, []byte(signingInput))
	sigB64 := b64.EncodeToString(sig)
	token := []byte(signingInput + "." + sigB64)

	_, err := Verify(token, pub)
	if err == nil {
		t.Error("expected verification to fail for expired token")
	}
	if !strings.Contains(err.Error(), "expired") {
		t.Errorf("expected expiry error, got: %v", err)
	}
}

func TestVerifyRejectsMalformedToken(t *testing.T) {
	pub, _ := generateTestKeys(t)

	tests := []struct {
		name  string
		token string
	}{
		{"empty", ""},
		{"one part", "abc"},
		{"two parts", "abc.def"},
		{"invalid base64 header", "!!!.def.ghi"},
	}

	for _, tc := range tests {
		_, err := Verify([]byte(tc.token), pub)
		if err == nil {
			t.Errorf("%s: expected error for malformed token", tc.name)
		}
	}
}

func TestTokenFormat(t *testing.T) {
	_, priv := generateTestKeys(t)

	token, err := Sign(priv, "user_format", "lab")
	if err != nil {
		t.Fatalf("Sign: %v", err)
	}

	parts := strings.SplitN(string(token), ".", 3)
	if len(parts) != 3 {
		t.Fatalf("token has %d parts, want 3", len(parts))
	}

	// Header should decode to {"alg":"EdDSA","typ":"PIT"}
	headerBytes, err := b64.DecodeString(parts[0])
	if err != nil {
		t.Fatalf("decoding header: %v", err)
	}
	var header map[string]string
	if err := json.Unmarshal(headerBytes, &header); err != nil {
		t.Fatalf("parsing header: %v", err)
	}
	if header["alg"] != "EdDSA" {
		t.Errorf("header alg = %q, want EdDSA", header["alg"])
	}
	if header["typ"] != "PIT" {
		t.Errorf("header typ = %q, want PIT", header["typ"])
	}

	// Signature should be 64 bytes (Ed25519).
	sigBytes, err := b64.DecodeString(parts[2])
	if err != nil {
		t.Fatalf("decoding signature: %v", err)
	}
	if len(sigBytes) != ed25519.SignatureSize {
		t.Errorf("signature length = %d, want %d", len(sigBytes), ed25519.SignatureSize)
	}
}

func TestFileRoundTrip(t *testing.T) {
	_, priv := generateTestKeys(t)

	token, err := Sign(priv, "user_file", "lab")
	if err != nil {
		t.Fatalf("Sign: %v", err)
	}

	dir := t.TempDir()
	path := filepath.Join(dir, ".pit", "license.jwt")

	if err := SaveToFile(path, token); err != nil {
		t.Fatalf("SaveToFile: %v", err)
	}

	loaded, err := LoadFromFile(path)
	if err != nil {
		t.Fatalf("LoadFromFile: %v", err)
	}

	if string(loaded) != string(token) {
		t.Error("loaded token does not match original")
	}

	// Verify file permissions (should be 0600).
	info, err := os.Stat(path)
	if err != nil {
		t.Fatalf("stat: %v", err)
	}
	if info.Mode().Perm() != 0600 {
		t.Errorf("file permissions = %o, want 0600", info.Mode().Perm())
	}
}

func TestLoadFromFileTrimsWhitespace(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "license.jwt")
	if err := os.WriteFile(path, []byte("  token-content  \n\n"), 0600); err != nil {
		t.Fatal(err)
	}

	loaded, err := LoadFromFile(path)
	if err != nil {
		t.Fatalf("LoadFromFile: %v", err)
	}
	if string(loaded) != "token-content" {
		t.Errorf("loaded = %q, want %q", string(loaded), "token-content")
	}
}

func TestDefaultLicensePathFromEnv(t *testing.T) {
	t.Setenv("PITLAB_LICENSE", "/custom/path/license.jwt")
	got := DefaultLicensePath()
	if got != "/custom/path/license.jwt" {
		t.Errorf("DefaultLicensePath() = %q, want /custom/path/license.jwt", got)
	}
}

func TestDefaultLicensePathFallback(t *testing.T) {
	t.Setenv("PITLAB_LICENSE", "")
	got := DefaultLicensePath()
	if got == "" {
		t.Skip("no home directory available")
	}
	if !strings.HasSuffix(got, filepath.Join(".pit", "license.jwt")) {
		t.Errorf("DefaultLicensePath() = %q, expected to end with .pit/license.jwt", got)
	}
}

func TestSignRejectsInvalidKey(t *testing.T) {
	_, err := Sign([]byte("too-short"), "user", "lab")
	if err == nil {
		t.Error("expected error for invalid private key")
	}
}

func TestVerifyRejectsInvalidPublicKey(t *testing.T) {
	_, err := Verify([]byte("a.b.c"), []byte("too-short"))
	if err == nil {
		t.Error("expected error for invalid public key")
	}
}

func TestRequireLabTierSuccess(t *testing.T) {
	pub, priv := generateTestKeys(t)

	token, err := Sign(priv, "user_lab", "lab")
	if err != nil {
		t.Fatalf("Sign: %v", err)
	}

	dir := t.TempDir()
	path := filepath.Join(dir, "license.jwt")
	if err := SaveToFile(path, token); err != nil {
		t.Fatalf("SaveToFile: %v", err)
	}

	t.Setenv("PITLAB_LICENSE", path)

	claims, err := RequireLabTier(pub)
	if err != nil {
		t.Fatalf("RequireLabTier: %v", err)
	}
	if claims.Sub != "user_lab" {
		t.Errorf("Sub = %q, want user_lab", claims.Sub)
	}
	if claims.Tier != "lab" {
		t.Errorf("Tier = %q, want lab", claims.Tier)
	}
}

func TestRequireLabTierWrongTier(t *testing.T) {
	pub, priv := generateTestKeys(t)

	// Sign with "free" tier instead of "lab".
	token, err := Sign(priv, "user_free", "free")
	if err != nil {
		t.Fatalf("Sign: %v", err)
	}

	dir := t.TempDir()
	path := filepath.Join(dir, "license.jwt")
	if err := SaveToFile(path, token); err != nil {
		t.Fatalf("SaveToFile: %v", err)
	}

	t.Setenv("PITLAB_LICENSE", path)

	_, err = RequireLabTier(pub)
	if err == nil {
		t.Error("expected error for non-lab tier")
	}
	if !strings.Contains(err.Error(), "lab tier required") {
		t.Errorf("error should mention tier requirement, got: %v", err)
	}
}

func TestRequireLabTierMissingFile(t *testing.T) {
	pub, _ := generateTestKeys(t)
	t.Setenv("PITLAB_LICENSE", "/tmp/nonexistent_license_file.jwt")

	_, err := RequireLabTier(pub)
	if err == nil {
		t.Error("expected error for missing license file")
	}
	if !strings.Contains(err.Error(), "lab tier license required") {
		t.Errorf("error should mention license required, got: %v", err)
	}
}

func TestRequireLabTierNoPath(t *testing.T) {
	pub, _ := generateTestKeys(t)
	t.Setenv("PITLAB_LICENSE", "")
	// Also clear HOME to force DefaultLicensePath to return ""
	t.Setenv("HOME", "")

	_, err := RequireLabTier(pub)
	if err == nil {
		t.Error("expected error when license path cannot be determined")
	}
	if !strings.Contains(err.Error(), "cannot determine license path") {
		t.Errorf("error should mention path determination, got: %v", err)
	}
}

func TestRequireLabTierExpired(t *testing.T) {
	pub, priv := generateTestKeys(t)

	// Manually create an expired lab token.
	claims := Claims{
		Sub:  "user_expired",
		Tier: "lab",
		Iss:  "thepit.cloud",
		Iat:  time.Now().Add(-48 * time.Hour).Unix(),
		Exp:  time.Now().Add(-1 * time.Hour).Unix(),
	}
	payloadJSON, _ := json.Marshal(claims)
	headerB64 := b64.EncodeToString(headerJSON)
	payloadB64 := b64.EncodeToString(payloadJSON)
	signingInput := headerB64 + "." + payloadB64
	sig := ed25519.Sign(priv, []byte(signingInput))
	sigB64 := b64.EncodeToString(sig)
	token := []byte(signingInput + "." + sigB64)

	dir := t.TempDir()
	path := filepath.Join(dir, "license.jwt")
	if err := SaveToFile(path, token); err != nil {
		t.Fatalf("SaveToFile: %v", err)
	}

	t.Setenv("PITLAB_LICENSE", path)

	_, err := RequireLabTier(pub)
	if err == nil {
		t.Error("expected error for expired license")
	}
	if !strings.Contains(err.Error(), "invalid or expired license") {
		t.Errorf("error should mention expired, got: %v", err)
	}
}

func TestClaimsIsExpired(t *testing.T) {
	expired := Claims{Exp: time.Now().Add(-time.Hour).Unix()}
	if !expired.IsExpired() {
		t.Error("expected IsExpired() = true for past expiry")
	}

	valid := Claims{Exp: time.Now().Add(time.Hour).Unix()}
	if valid.IsExpired() {
		t.Error("expected IsExpired() = false for future expiry")
	}
}
