package logging

import (
	"bytes"
	"strings"
	"testing"
)

func TestSetupJSONMode(t *testing.T) {
	var buf bytes.Buffer
	logger := setupWithWriter("pitctl", "debug", true, &buf)
	logger.Debug("hello", "command", "list")
	out := buf.String()
	if !strings.Contains(out, "\"service\":\"pitctl\"") {
		t.Fatalf("missing service field in output: %s", out)
	}
	if !strings.Contains(out, "\"command\":\"list\"") {
		t.Fatalf("missing command field in output: %s", out)
	}
}

func TestSetupLevelFiltering(t *testing.T) {
	var buf bytes.Buffer
	logger := setupWithWriter("pitctl", "error", true, &buf)
	logger.Info("ignored")
	if got := buf.String(); got != "" {
		t.Fatalf("expected empty output for filtered info log, got: %s", got)
	}
}
