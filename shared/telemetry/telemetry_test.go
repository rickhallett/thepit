package telemetry

import (
	"os"
	"testing"

	posthog "github.com/posthog/posthog-go"
)

type fakeClient struct {
	msgs []posthog.Message
}

func (f *fakeClient) Enqueue(m posthog.Message) error {
	f.msgs = append(f.msgs, m)
	return nil
}

func (f *fakeClient) Close() error { return nil }

func resetState() {
	mu.Lock()
	defer mu.Unlock()
	client = nil
	enabled = false
	defaultTool = "unknown"
}

func TestInitNoKeyDisablesTelemetry(t *testing.T) {
	resetState()
	t.Setenv("POSTHOG_API_KEY", "")
	t.Setenv("NEXT_PUBLIC_POSTHOG_KEY", "")
	if err := Init("pitstorm"); err != nil {
		t.Fatalf("Init returned error: %v", err)
	}
	if Enabled() {
		t.Fatalf("Enabled() = true, want false")
	}
}

func TestTrackAndIdentifyEnqueueMessages(t *testing.T) {
	resetState()
	f := &fakeClient{}
	mu.Lock()
	client = f
	enabled = true
	defaultTool = "pitstorm"
	mu.Unlock()

	Track("cli:test", "pitstorm.command.started", map[string]any{"command": "run"})
	Identify("cli:test", map[string]any{"is_internal": true})

	if len(f.msgs) != 2 {
		t.Fatalf("message count = %d, want 2", len(f.msgs))
	}
	if _, ok := f.msgs[0].(posthog.Capture); !ok {
		t.Fatalf("first message type = %T, want posthog.Capture", f.msgs[0])
	}
	if _, ok := f.msgs[1].(posthog.Identify); !ok {
		t.Fatalf("second message type = %T, want posthog.Identify", f.msgs[1])
	}
}

func TestDistinctIDForToolDeterministic(t *testing.T) {
	resetState()
	host, _ := os.Hostname()
	if host == "" {
		t.Skip("hostname unavailable")
	}
	a := distinctIDForTool("pitctl")
	b := distinctIDForTool("pitctl")
	if a != b {
		t.Fatalf("distinct ids mismatch: %s vs %s", a, b)
	}
}
