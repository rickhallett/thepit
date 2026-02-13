package alert

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestHasFailuresAllOK(t *testing.T) {
	r := &Report{
		Checks: []Check{
			{Name: "db", Level: LevelOK, Message: "healthy"},
			{Name: "api", Level: LevelOK, Message: "healthy"},
		},
	}
	if r.HasFailures() {
		t.Error("expected no failures when all checks are OK")
	}
}

func TestHasFailuresWithWarn(t *testing.T) {
	r := &Report{
		Checks: []Check{
			{Name: "db", Level: LevelOK, Message: "healthy"},
			{Name: "errors", Level: LevelWarn, Message: "elevated error rate"},
		},
	}
	if !r.HasFailures() {
		t.Error("expected failures when a check is warn")
	}
}

func TestHasFailuresWithCrit(t *testing.T) {
	r := &Report{
		Checks: []Check{
			{Name: "db", Level: LevelCrit, Message: "unreachable"},
		},
	}
	if !r.HasFailures() {
		t.Error("expected failures when a check is critical")
	}
}

func TestHasFailuresEmpty(t *testing.T) {
	r := &Report{Checks: nil}
	if r.HasFailures() {
		t.Error("expected no failures for empty report")
	}
}

func TestWorstLevelAllOK(t *testing.T) {
	r := &Report{
		Checks: []Check{
			{Name: "a", Level: LevelOK},
			{Name: "b", Level: LevelOK},
		},
	}
	if r.WorstLevel() != LevelOK {
		t.Errorf("WorstLevel = %q, want %q", r.WorstLevel(), LevelOK)
	}
}

func TestWorstLevelWarn(t *testing.T) {
	r := &Report{
		Checks: []Check{
			{Name: "a", Level: LevelOK},
			{Name: "b", Level: LevelWarn},
		},
	}
	if r.WorstLevel() != LevelWarn {
		t.Errorf("WorstLevel = %q, want %q", r.WorstLevel(), LevelWarn)
	}
}

func TestWorstLevelCrit(t *testing.T) {
	r := &Report{
		Checks: []Check{
			{Name: "a", Level: LevelWarn},
			{Name: "b", Level: LevelCrit},
			{Name: "c", Level: LevelOK},
		},
	}
	if r.WorstLevel() != LevelCrit {
		t.Errorf("WorstLevel = %q, want %q", r.WorstLevel(), LevelCrit)
	}
}

func TestWorstLevelEmpty(t *testing.T) {
	r := &Report{}
	if r.WorstLevel() != LevelOK {
		t.Errorf("WorstLevel on empty = %q, want %q", r.WorstLevel(), LevelOK)
	}
}

func TestSummary(t *testing.T) {
	r := &Report{
		Checks: []Check{
			{Name: "a", Level: LevelOK},
			{Name: "b", Level: LevelWarn},
			{Name: "c", Level: LevelCrit},
			{Name: "d", Level: LevelOK},
		},
	}
	got := r.Summary()
	want := "2 ok, 1 warn, 1 critical"
	if got != want {
		t.Errorf("Summary() = %q, want %q", got, want)
	}
}

func TestSummaryAllOK(t *testing.T) {
	r := &Report{
		Checks: []Check{
			{Name: "a", Level: LevelOK},
		},
	}
	got := r.Summary()
	if !strings.Contains(got, "1 ok") {
		t.Errorf("Summary() = %q, expected to contain '1 ok'", got)
	}
	if !strings.Contains(got, "0 warn") {
		t.Errorf("Summary() = %q, expected to contain '0 warn'", got)
	}
}

func TestSummaryEmpty(t *testing.T) {
	r := &Report{}
	got := r.Summary()
	want := "0 ok, 0 warn, 0 critical"
	if got != want {
		t.Errorf("Summary() = %q, want %q", got, want)
	}
}

func TestFormatSlackAllOK(t *testing.T) {
	r := &Report{
		Timestamp: time.Now(),
		Checks: []Check{
			{Name: "db", Level: LevelOK, Message: "healthy"},
		},
	}
	payload := FormatSlack(r)
	text, ok := payload["text"].(string)
	if !ok {
		t.Fatal("payload missing 'text' key")
	}
	if !strings.Contains(text, ":white_check_mark:") {
		t.Error("all-OK payload should contain check mark emoji")
	}
	if !strings.Contains(text, "1 ok") {
		t.Error("payload should contain summary")
	}
	// OK checks should NOT appear in body.
	if strings.Contains(text, "db") {
		t.Error("OK checks should be omitted from Slack output")
	}
}

func TestFormatSlackWithWarn(t *testing.T) {
	r := &Report{
		Checks: []Check{
			{Name: "db", Level: LevelOK, Message: "healthy"},
			{Name: "errors", Level: LevelWarn, Message: "elevated"},
		},
	}
	payload := FormatSlack(r)
	text := payload["text"].(string)
	if !strings.Contains(text, ":warning:") {
		t.Error("warn payload should contain warning emoji")
	}
	if !strings.Contains(text, "errors") {
		t.Error("warn check name should appear in output")
	}
	if !strings.Contains(text, "elevated") {
		t.Error("warn check message should appear in output")
	}
}

func TestFormatSlackWithCrit(t *testing.T) {
	r := &Report{
		Checks: []Check{
			{Name: "db", Level: LevelCrit, Message: "down"},
		},
	}
	payload := FormatSlack(r)
	text := payload["text"].(string)
	if !strings.Contains(text, ":rotating_light:") {
		t.Error("crit payload should contain rotating light emoji")
	}
	if !strings.Contains(text, ":x:") {
		t.Error("crit check should have :x: prefix")
	}
}

func TestSendSlackSuccess(t *testing.T) {
	var receivedBody []byte
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedBody, _ = io.ReadAll(r.Body)
		if r.Header.Get("Content-Type") != "application/json" {
			t.Errorf("Content-Type = %q, want application/json", r.Header.Get("Content-Type"))
		}
		w.WriteHeader(200)
	}))
	defer srv.Close()

	payload := map[string]interface{}{"text": "test message"}
	if err := SendSlack(srv.URL, payload); err != nil {
		t.Fatalf("SendSlack: %v", err)
	}

	var parsed map[string]interface{}
	if err := json.Unmarshal(receivedBody, &parsed); err != nil {
		t.Fatalf("unmarshal request body: %v", err)
	}
	if parsed["text"] != "test message" {
		t.Errorf("received text = %q, want 'test message'", parsed["text"])
	}
}

func TestSendSlackNon200(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(500)
	}))
	defer srv.Close()

	payload := map[string]interface{}{"text": "test"}
	err := SendSlack(srv.URL, payload)
	if err == nil {
		t.Error("expected error for non-200 response")
	}
	if !strings.Contains(err.Error(), "500") {
		t.Errorf("error should mention status code, got: %v", err)
	}
}

func TestSendSlackConnectionRefused(t *testing.T) {
	payload := map[string]interface{}{"text": "test"}
	err := SendSlack("http://127.0.0.1:1", payload)
	if err == nil {
		t.Error("expected error for unreachable server")
	}
}

func TestLevelConstants(t *testing.T) {
	if LevelOK != "ok" {
		t.Errorf("LevelOK = %q", LevelOK)
	}
	if LevelWarn != "warn" {
		t.Errorf("LevelWarn = %q", LevelWarn)
	}
	if LevelCrit != "critical" {
		t.Errorf("LevelCrit = %q", LevelCrit)
	}
}
