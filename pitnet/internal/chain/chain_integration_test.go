//go:build chain

// Integration tests that make REAL calls to Base L2 mainnet.
//
// These tests are slow and network-dependent. They are NOT part of the
// default test suite and require an explicit build tag:
//
//	go test -tags chain -v -count=1 ./internal/chain/
//
// They verify the chain client against live on-chain attestations
// created by THE PIT's EAS pipeline.
package chain

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/rickhallett/thepit/pitnet/internal/abi"
)

const (
	// Known attestation on Base mainnet created by THE PIT.
	knownUID      = "0x13da22148f63504eac18935143f20349a619b7ebeaf416f0fa5362db923f0724"
	knownSchema   = "0x026a50b7a0728afcedaa43113558312d894333f705028153eceafd8084e544d2"
	knownAttester = "0xf951daD46F0A7d7402556DCaa70Ee4F8bC979824"
)

// newMainnetClient creates a client pointed at the real Base L2 mainnet.
func newMainnetClient() *Client {
	return New(Config{
		RPCURL:  DefaultRPCURL,
		ChainID: DefaultChainID,
	})
}

// mainnetCtx returns a context with a generous timeout for RPC calls.
func mainnetCtx(t *testing.T) context.Context {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	t.Cleanup(cancel)
	return ctx
}

// getAttestationWithRetry fetches an attestation with automatic retry on 429.
// Base mainnet's public RPC is rate-limited; retries prevent flaky failures.
func getAttestationWithRetry(t *testing.T, c *Client, uid string, maxRetries int) *Attestation {
	t.Helper()
	for attempt := 0; attempt <= maxRetries; attempt++ {
		ctx := mainnetCtx(t)
		att, err := c.GetAttestation(ctx, uid)
		if err == nil {
			return att
		}
		if strings.Contains(err.Error(), "429") || strings.Contains(err.Error(), "rate limit") {
			if attempt < maxRetries {
				wait := time.Duration(attempt+1) * 3 * time.Second
				t.Logf("Rate limited (attempt %d/%d), waiting %s...", attempt+1, maxRetries+1, wait)
				time.Sleep(wait)
				continue
			}
		}
		t.Fatalf("GetAttestation(%s): %v (after %d attempts)", uid, err, attempt+1)
	}
	t.Fatal("unreachable")
	return nil
}

func TestLiveBlockNumber(t *testing.T) {
	c := newMainnetClient()
	ctx := mainnetCtx(t)

	num, err := c.BlockNumber(ctx)
	if err != nil {
		t.Fatalf("BlockNumber: %v", err)
	}

	if num == 0 {
		t.Fatal("BlockNumber returned 0 — expected a recent block on Base L2")
	}

	// Base L2 has been running since mid-2023; block numbers are well into
	// the millions by now. A sanity floor of 1,000,000 catches zero/stale.
	if num < 1_000_000 {
		t.Errorf("BlockNumber = %d — suspiciously low for Base mainnet", num)
	}

	t.Logf("Current Base L2 block: %d", num)
}

func TestLiveChainID(t *testing.T) {
	c := newMainnetClient()
	ctx := mainnetCtx(t)

	id, err := c.ChainID(ctx)
	if err != nil {
		t.Fatalf("ChainID: %v", err)
	}

	if id != 8453 {
		t.Errorf("ChainID = %d, want 8453 (Base mainnet)", id)
	}
}

func TestLiveGetAttestation(t *testing.T) {
	time.Sleep(1 * time.Second) // Rate-limit buffer after prior tests.
	c := newMainnetClient()
	ctx := mainnetCtx(t)

	att, err := c.GetAttestation(ctx, knownUID)
	if err != nil {
		t.Fatalf("GetAttestation(%s): %v", knownUID, err)
	}

	// UID must match what we queried.
	if !strings.EqualFold(att.UID, knownUID) {
		t.Errorf("UID = %q, want %q", att.UID, knownUID)
	}

	// Schema must match the expected PIT schema.
	if !strings.EqualFold(att.Schema, knownSchema) {
		t.Errorf("Schema = %q, want %q", att.Schema, knownSchema)
	}

	// Attester must match (case-insensitive — EVM addresses are case-insensitive).
	if !strings.EqualFold(att.Attester, knownAttester) {
		t.Errorf("Attester = %q, want %q (case-insensitive)", att.Attester, knownAttester)
	}

	// Time must be non-zero.
	if att.Time == 0 {
		t.Error("Time = 0, expected a non-zero unix timestamp")
	}

	// Data must be non-empty and reasonable for ABI-encoded agent identity.
	if len(att.Data) == 0 {
		t.Fatal("Data is empty — expected ABI-encoded agent identity")
	}
	if len(att.Data) < 100 {
		t.Errorf("Data length = %d, expected > 100 bytes for ABI-encoded agent data", len(att.Data))
	}

	t.Logf("Attestation found: UID=%s, Time=%d, DataLen=%d", att.UID, att.Time, len(att.Data))
}

func TestLiveGetAttestationAndDecode(t *testing.T) {
	c := newMainnetClient()

	att := getAttestationWithRetry(t, c, knownUID, 3)

	decoded, err := abi.Decode(att.Data)
	if err != nil {
		t.Fatalf("abi.Decode: %v", err)
	}

	// AgentID must be a non-empty string.
	if decoded.AgentID == "" {
		t.Error("decoded.AgentID is empty")
	}

	// Name must be a non-empty string.
	if decoded.Name == "" {
		t.Error("decoded.Name is empty")
	}

	// PromptHash must be a valid bytes32.
	if !abi.IsValidBytes32(decoded.PromptHash) {
		t.Errorf("decoded.PromptHash is not a valid bytes32: %q", decoded.PromptHash)
	}

	// ManifestHash must be a valid bytes32.
	if !abi.IsValidBytes32(decoded.ManifestHash) {
		t.Errorf("decoded.ManifestHash is not a valid bytes32: %q", decoded.ManifestHash)
	}

	// CreatedAt must be non-zero.
	if decoded.CreatedAt == 0 {
		t.Error("decoded.CreatedAt = 0, expected a non-zero unix timestamp")
	}

	t.Logf("Decoded agent: ID=%s, Name=%s, Tier=%s, CreatedAt=%d",
		decoded.AgentID, decoded.Name, decoded.Tier, decoded.CreatedAt)
}

func TestLiveNonExistentAttestation(t *testing.T) {
	c := newMainnetClient()

	// A made-up UID — all 0's with a single different byte.
	// EAS returns a zeroed struct for non-existent attestations.
	// The chain client detects this when the entire response is zeros,
	// OR the caller checks for a zero UID in the returned struct.
	fakeUID := "0xdead" + strings.Repeat("00", 30)

	// Use retry-aware fetch — but expect either an error or a zeroed struct.
	var att *Attestation
	var err error
	for attempt := 0; attempt <= 3; attempt++ {
		if attempt > 0 {
			time.Sleep(time.Duration(attempt) * 3 * time.Second)
		}
		ctx := mainnetCtx(t)
		att, err = c.GetAttestation(ctx, fakeUID)
		if err != nil && (strings.Contains(err.Error(), "429") || strings.Contains(err.Error(), "rate limit")) {
			t.Logf("Rate limited (attempt %d/4), retrying...", attempt+1)
			continue
		}
		break
	}
	if err != nil {
		// GetAttestation returned an error — could be "not found" from
		// the all-zeros detection, which is correct behavior.
		if !strings.Contains(err.Error(), "not found") {
			t.Fatalf("unexpected error (expected 'not found'): %v", err)
		}
		t.Logf("Correctly rejected non-existent UID with error: %v", err)
		return
	}

	// If no error: the EAS contract returned a struct. For non-existent
	// attestations, the UID field is zero and Time is zero.
	// This is valid — the caller (RunProof) checks isZeroUID().
	if att.Time != 0 {
		t.Errorf("non-existent attestation returned Time=%d, expected 0", att.Time)
	}
	isZero := true
	uid := strings.TrimPrefix(att.UID, "0x")
	for _, c := range uid {
		if c != '0' {
			isZero = false
			break
		}
	}
	if !isZero {
		t.Errorf("non-existent attestation returned non-zero UID: %s", att.UID)
	}

	t.Logf("Non-existent UID returned zeroed struct (UID=%s, Time=%d)", att.UID, att.Time)
}

func TestLiveSchemaMatch(t *testing.T) {
	c := newMainnetClient()

	att := getAttestationWithRetry(t, c, knownUID, 3)

	if !strings.EqualFold(att.Schema, knownSchema) {
		t.Errorf("Schema mismatch:\n  on-chain: %s\n  expected: %s", att.Schema, knownSchema)
	}

	t.Logf("Schema verified: %s", att.Schema)
}

func TestLiveMultipleAttestations(t *testing.T) {
	// Pre-sleep: prior tests in this package already consumed RPC quota.
	// Base mainnet public RPC allows ~5 req/s; by this test we've used ~6.
	time.Sleep(5 * time.Second)

	c := newMainnetClient()

	type result struct {
		uid      string
		schema   string
		attester string
		dataLen  int
	}

	results := make([]result, 3)
	for i := 0; i < 3; i++ {
		// Rate-limit: Base mainnet public RPC throttles rapid requests.
		if i > 0 {
			time.Sleep(3 * time.Second)
		}

		att := getAttestationWithRetry(t, c, knownUID, 3)
		results[i] = result{
			uid:      att.UID,
			schema:   att.Schema,
			attester: att.Attester,
			dataLen:  len(att.Data),
		}
		t.Logf("Fetch %d: %s (data=%d bytes)", i+1, att.UID, len(att.Data))
	}

	// All three fetches must return consistent data.
	for i := 1; i < 3; i++ {
		if !strings.EqualFold(results[i].uid, results[0].uid) {
			t.Errorf("Fetch %d: UID %q != Fetch 1 UID %q", i+1, results[i].uid, results[0].uid)
		}
		if !strings.EqualFold(results[i].schema, results[0].schema) {
			t.Errorf("Fetch %d: Schema %q != Fetch 1 Schema %q", i+1, results[i].schema, results[0].schema)
		}
		if !strings.EqualFold(results[i].attester, results[0].attester) {
			t.Errorf("Fetch %d: Attester %q != Fetch 1 Attester %q", i+1, results[i].attester, results[0].attester)
		}
		if results[i].dataLen != results[0].dataLen {
			t.Errorf("Fetch %d: DataLen %d != Fetch 1 DataLen %d", i+1, results[i].dataLen, results[0].dataLen)
		}
	}
}
