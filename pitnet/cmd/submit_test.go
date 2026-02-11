package cmd

import (
	"bytes"
	"encoding/json"
	"io"
	"os"
	"strings"
	"testing"
)

// captureStdout redirects os.Stdout to a pipe and returns the captured output.
func captureStdout(t *testing.T, fn func()) string {
	t.Helper()

	oldStdout := os.Stdout
	r, w, err := os.Pipe()
	if err != nil {
		t.Fatal(err)
	}
	os.Stdout = w

	fn()

	w.Close()
	os.Stdout = oldStdout

	var buf bytes.Buffer
	io.Copy(&buf, r)
	r.Close()
	return buf.String()
}

func TestRunSubmitCLIArgs(t *testing.T) {
	promptHash := "0x" + strings.Repeat("aa", 32)
	manifestHash := "0x" + strings.Repeat("bb", 32)

	output := captureStdout(t, func() {
		RunSubmit([]string{
			"--agent-id", "test-agent-001",
			"--name", "Test Agent",
			"--prompt-hash", promptHash,
			"--manifest-hash", manifestHash,
			"--tier", "premium",
			"--preset-id", "roast-battle",
		})
	})

	checks := []string{
		"Attestation Payload",
		"test-agent-001",
		"Test Agent",
		"ABI-Encoded Data",
		"0x", // hex-encoded output
	}
	for _, want := range checks {
		if !strings.Contains(output, want) {
			t.Errorf("RunSubmit output missing %q", want)
		}
	}
}

func TestRunSubmitJSONFile(t *testing.T) {
	promptHash := "0x" + strings.Repeat("cc", 32)
	manifestHash := "0x" + strings.Repeat("dd", 32)

	manifest := map[string]interface{}{
		"agentId":      "json-agent-001",
		"name":         "JSON Agent",
		"presetId":     "shark-pit",
		"tier":         "free",
		"promptHash":   promptHash,
		"manifestHash": manifestHash,
		"parentId":     "",
		"ownerId":      "user-123",
		"createdAt":    1705598848,
	}

	dir := t.TempDir()
	path := dir + "/manifest.json"
	data, _ := json.Marshal(manifest)
	if err := os.WriteFile(path, data, 0644); err != nil {
		t.Fatal(err)
	}

	output := captureStdout(t, func() {
		RunSubmit([]string{"--json", path})
	})

	checks := []string{
		"Attestation Payload",
		"json-agent-001",
		"JSON Agent",
		"ABI-Encoded Data",
	}
	for _, want := range checks {
		if !strings.Contains(output, want) {
			t.Errorf("RunSubmit --json output missing %q", want)
		}
	}
}
