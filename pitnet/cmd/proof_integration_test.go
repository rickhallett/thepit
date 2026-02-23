//go:build chain

// Integration test for the `pitnet proof` end-to-end pipeline.
//
// This test builds the pitnet binary and runs it as a subprocess to capture
// full stdout output, because RunProof() calls os.Exit() on completion.
//
// Run with:
//
//	go test -tags chain -v -count=1 ./cmd/
//
// NOT included in the default test suite (no -tags chain = skipped).
package cmd

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

const knownAttestationUID = "0x13da22148f63504eac18935143f20349a619b7ebeaf416f0fa5362db923f0724"

func TestLiveProofEndToEnd(t *testing.T) {
	// Build the pitnet binary to a temp directory.
	tmpDir := t.TempDir()
	binPath := filepath.Join(tmpDir, "pitnet-test")

	// Build from the pitnet module root (parent of cmd/).
	pitnetDir := filepath.Join(getCmdDir(t), "..")
	buildCmd := exec.Command("go", "build", "-o", binPath, ".")
	buildCmd.Dir = pitnetDir
	buildCmd.Env = append(os.Environ(), "CGO_ENABLED=0")

	buildOut, err := buildCmd.CombinedOutput()
	if err != nil {
		t.Fatalf("Failed to build pitnet binary: %v\n%s", err, buildOut)
	}

	// Run: pitnet proof <uid>
	proofCmd := exec.Command(binPath, "proof", knownAttestationUID)
	proofCmd.Env = os.Environ()

	output, err := proofCmd.CombinedOutput()
	outputStr := string(output)

	// RunProof exits 0 on success. If it exits non-zero, the attestation
	// wasn't found or couldn't decode — that's a test failure.
	if err != nil {
		t.Fatalf("pitnet proof exited with error: %v\nOutput:\n%s", err, outputStr)
	}

	// Verify key sections of the proof output.
	expectedStrings := []string{
		"The Pit — On-Chain Attestation Verification Proof",
		"Base L2 Mainnet",
		"FOUND on Base L2 mainnet",
		"SUCCESS (all 9 schema fields decoded)",
		"MATCHES expected PIT schema",
	}

	for _, want := range expectedStrings {
		if !strings.Contains(outputStr, want) {
			t.Errorf("proof output missing expected string: %q", want)
		}
	}

	// The decoded agent name should appear in the output.
	// From the known attestation, the agent is "StormAgent-3581".
	if !strings.Contains(outputStr, "StormAgent-3581") {
		t.Error("proof output missing decoded agent name 'StormAgent-3581'")
	}

	// Log full output for inspection.
	t.Logf("Full proof output (%d bytes):\n%s", len(outputStr), outputStr)
}

func TestLiveProofInvalidUID(t *testing.T) {
	// Build the pitnet binary.
	tmpDir := t.TempDir()
	binPath := filepath.Join(tmpDir, "pitnet-test")

	pitnetDir := filepath.Join(getCmdDir(t), "..")
	buildCmd := exec.Command("go", "build", "-o", binPath, ".")
	buildCmd.Dir = pitnetDir
	buildCmd.Env = append(os.Environ(), "CGO_ENABLED=0")

	buildOut, err := buildCmd.CombinedOutput()
	if err != nil {
		t.Fatalf("Failed to build pitnet binary: %v\n%s", err, buildOut)
	}

	// Run with an invalid UID — should exit 2.
	proofCmd := exec.Command(binPath, "proof", "not-a-valid-uid")
	output, err := proofCmd.CombinedOutput()
	if err == nil {
		t.Fatal("expected non-zero exit for invalid UID, got exit 0")
	}

	outputStr := string(output)
	if !strings.Contains(outputStr, "invalid attestation UID") {
		t.Errorf("output should mention 'invalid attestation UID', got:\n%s", outputStr)
	}
}

func TestLiveProofNonExistentUID(t *testing.T) {
	// Build the pitnet binary.
	tmpDir := t.TempDir()
	binPath := filepath.Join(tmpDir, "pitnet-test")

	pitnetDir := filepath.Join(getCmdDir(t), "..")
	buildCmd := exec.Command("go", "build", "-o", binPath, ".")
	buildCmd.Dir = pitnetDir
	buildCmd.Env = append(os.Environ(), "CGO_ENABLED=0")

	buildOut, err := buildCmd.CombinedOutput()
	if err != nil {
		t.Fatalf("Failed to build pitnet binary: %v\n%s", err, buildOut)
	}

	// Run with a valid-format but non-existent UID — should exit 1.
	fakeUID := "0x" + strings.Repeat("f", 64)
	proofCmd := exec.Command(binPath, "proof", fakeUID)
	output, err := proofCmd.CombinedOutput()
	if err == nil {
		t.Fatal("expected non-zero exit for non-existent UID, got exit 0")
	}

	outputStr := string(output)
	if !strings.Contains(outputStr, "NOT FOUND") && !strings.Contains(outputStr, "FAILED") {
		t.Errorf("output should mention NOT FOUND or FAILED, got:\n%s", outputStr)
	}
}

// getCmdDir returns the absolute path to the cmd/ directory.
func getCmdDir(t *testing.T) string {
	t.Helper()
	dir, err := os.Getwd()
	if err != nil {
		t.Fatalf("Getwd: %v", err)
	}
	// If we're already in the cmd directory, return it.
	if filepath.Base(dir) == "cmd" {
		return dir
	}
	// Otherwise, look for cmd/ as a subdirectory.
	cmdDir := filepath.Join(dir, "cmd")
	if _, err := os.Stat(cmdDir); err == nil {
		return cmdDir
	}
	// Fallback: assume we're in the right place.
	return dir
}
