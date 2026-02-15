package cmd

import (
	"bytes"
	"io"
	"os"
	"strings"
	"testing"
)

// captureStdout redirects os.Stdout to a pipe and returns captured output.
func captureStdout(t *testing.T, fn func()) string {
	t.Helper()

	oldStdout := os.Stdout
	r, w, err := os.Pipe()
	if err != nil {
		t.Fatal(err)
	}
	os.Stdout = w
	defer func() { os.Stdout = oldStdout }()

	fn()

	w.Close()
	os.Stdout = oldStdout

	var buf bytes.Buffer
	if _, err := io.Copy(&buf, r); err != nil {
		t.Errorf("failed to read captured stdout: %v", err)
	}
	r.Close()
	return buf.String()
}

func TestRunHashValidYAML(t *testing.T) {
	// Create a temp YAML file with a minimal agent definition.
	dir := t.TempDir()
	path := dir + "/test-agent.yaml"
	yaml := `name: Socrates
archetype: classical philosopher
tier: free
tone: inquisitive
`
	if err := os.WriteFile(path, []byte(yaml), 0644); err != nil {
		t.Fatal(err)
	}

	output := captureStdout(t, func() {
		RunHash([]string{path})
	})

	// Verify output contains the expected hash format markers.
	checks := []string{
		"promptHash:",
		"manifestHash:",
		"agentId:",
		"createdAt:",
		"0x", // hashes are 0x-prefixed
		"socrates-local",
	}
	for _, want := range checks {
		if !strings.Contains(output, want) {
			t.Errorf("RunHash output missing %q\n\nGot:\n%s", want, output)
		}
	}

	// Verify the prompt hash format is valid (0x + 64 hex chars).
	// Find the promptHash value in the output.
	for _, line := range strings.Split(output, "\n") {
		if strings.Contains(line, "promptHash:") {
			parts := strings.Fields(line)
			for _, part := range parts {
				if strings.HasPrefix(part, "0x") && len(part) == 66 {
					// Valid hash found.
					return
				}
			}
		}
	}
	t.Errorf("could not find valid promptHash in output:\n%s", output)
}

func TestRunHashExplicitSystemPrompt(t *testing.T) {
	dir := t.TempDir()
	path := dir + "/explicit.yaml"
	yaml := `name: Bot
tier: custom
systemPrompt: You are a custom agent.
`
	if err := os.WriteFile(path, []byte(yaml), 0644); err != nil {
		t.Fatal(err)
	}

	output := captureStdout(t, func() {
		RunHash([]string{path})
	})

	if !strings.Contains(output, "promptHash:") {
		t.Errorf("output missing promptHash:\n%s", output)
	}
	if !strings.Contains(output, "bot-local") {
		t.Errorf("output missing expected agentId 'bot-local':\n%s", output)
	}
}

func TestRunHashDeterministicPromptHash(t *testing.T) {
	dir := t.TempDir()
	path := dir + "/deterministic.yaml"
	yaml := `name: Hashy
tier: free
archetype: test agent
`
	if err := os.WriteFile(path, []byte(yaml), 0644); err != nil {
		t.Fatal(err)
	}

	// Run twice — promptHash should be the same (it's based on content only).
	extractPromptHash := func(output string) string {
		for _, line := range strings.Split(output, "\n") {
			if strings.Contains(line, "promptHash:") {
				parts := strings.Fields(line)
				for _, part := range parts {
					if strings.HasPrefix(part, "0x") && len(part) == 66 {
						return part
					}
				}
			}
		}
		return ""
	}

	out1 := captureStdout(t, func() { RunHash([]string{path}) })
	out2 := captureStdout(t, func() { RunHash([]string{path}) })

	h1 := extractPromptHash(out1)
	h2 := extractPromptHash(out2)

	if h1 == "" {
		t.Fatal("could not extract promptHash from first run")
	}
	if h1 != h2 {
		t.Errorf("promptHash not deterministic: %s != %s", h1, h2)
	}
}
