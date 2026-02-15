package client

import (
	"errors"
	"strings"
	"testing"
)

// simulatedBoutStream builds a realistic 2-turn SSE stream.
func simulatedBoutStream() string {
	var b strings.Builder
	b.WriteString("data: {\"type\":\"start\",\"messageId\":\"bout1-0-socrates\"}\n\n")
	b.WriteString("data: {\"type\":\"data-turn\",\"data\":{\"turn\":0,\"agentId\":\"socrates\",\"agentName\":\"Socrates\",\"color\":\"#4A90D9\"}}\n\n")
	b.WriteString("data: {\"type\":\"text-start\",\"id\":\"bout1-0-socrates\"}\n\n")
	b.WriteString("data: {\"type\":\"text-delta\",\"id\":\"bout1-0-socrates\",\"delta\":\"Well, \"}\n\n")
	b.WriteString("data: {\"type\":\"text-delta\",\"id\":\"bout1-0-socrates\",\"delta\":\"my dear friend...\"}\n\n")
	b.WriteString("data: {\"type\":\"text-end\",\"id\":\"bout1-0-socrates\"}\n\n")
	b.WriteString("data: {\"type\":\"start\",\"messageId\":\"bout1-1-nietzsche\"}\n\n")
	b.WriteString("data: {\"type\":\"data-turn\",\"data\":{\"turn\":1,\"agentId\":\"nietzsche\",\"agentName\":\"Nietzsche\",\"color\":\"#E74C3C\"}}\n\n")
	b.WriteString("data: {\"type\":\"text-start\",\"id\":\"bout1-1-nietzsche\"}\n\n")
	b.WriteString("data: {\"type\":\"text-delta\",\"id\":\"bout1-1-nietzsche\",\"delta\":\"Ha! \"}\n\n")
	b.WriteString("data: {\"type\":\"text-delta\",\"id\":\"bout1-1-nietzsche\",\"delta\":\"You speak of...\"}\n\n")
	b.WriteString("data: {\"type\":\"text-end\",\"id\":\"bout1-1-nietzsche\"}\n\n")
	b.WriteString("data: {\"type\":\"data-share-line\",\"data\":{\"text\":\"Socrates meets Nietzsche in a battle of wills\"}}\n\n")
	b.WriteString("data: [DONE]\n\n")
	return b.String()
}

func TestParseSSEStreamFullBout(t *testing.T) {
	stream := simulatedBoutStream()
	r := strings.NewReader(stream)

	var events []SSEEvent
	result, err := ParseSSEStream(r, func(e SSEEvent) error {
		events = append(events, e)
		return nil
	})
	if err != nil {
		t.Fatalf("ParseSSEStream: %v", err)
	}

	// Check result summary.
	if len(result.Turns) != 2 {
		t.Fatalf("Turns = %d, want 2", len(result.Turns))
	}
	if result.DeltaCount != 4 {
		t.Errorf("DeltaCount = %d, want 4", result.DeltaCount)
	}
	if result.ShareLine != "Socrates meets Nietzsche in a battle of wills" {
		t.Errorf("ShareLine = %q", result.ShareLine)
	}

	// Check turn 0.
	turn0 := result.Turns[0]
	if turn0.AgentID != "socrates" {
		t.Errorf("turn0.AgentID = %q, want socrates", turn0.AgentID)
	}
	if turn0.AgentName != "Socrates" {
		t.Errorf("turn0.AgentName = %q, want Socrates", turn0.AgentName)
	}
	if turn0.Text != "Well, my dear friend..." {
		t.Errorf("turn0.Text = %q, want %q", turn0.Text, "Well, my dear friend...")
	}

	// Check turn 1.
	turn1 := result.Turns[1]
	if turn1.AgentID != "nietzsche" {
		t.Errorf("turn1.AgentID = %q, want nietzsche", turn1.AgentID)
	}
	if turn1.Text != "Ha! You speak of..." {
		t.Errorf("turn1.Text = %q, want %q", turn1.Text, "Ha! You speak of...")
	}

	// Check total event count (13 events: 2 start + 2 data-turn + 2 text-start + 4 text-delta + 2 text-end + 1 share-line).
	if result.EventCount != 13 {
		t.Errorf("EventCount = %d, want 13", result.EventCount)
	}

	// Check total chars.
	expectedChars := len("Well, ") + len("my dear friend...") + len("Ha! ") + len("You speak of...")
	if result.TotalChars != expectedChars {
		t.Errorf("TotalChars = %d, want %d", result.TotalChars, expectedChars)
	}

	// Check callback received all events.
	if len(events) != 13 {
		t.Errorf("callback received %d events, want 13", len(events))
	}

	// Duration and FirstByte should be populated.
	if result.Duration <= 0 {
		t.Error("Duration should be positive")
	}
	if result.FirstByte <= 0 {
		t.Error("FirstByte should be positive")
	}
}

func TestParseSSEStreamErrorEvent(t *testing.T) {
	stream := `data: {"type":"error","errorText":"The arena short-circuited."}` + "\n\n" +
		"data: [DONE]\n\n"
	r := strings.NewReader(stream)

	result, err := ParseSSEStream(r, nil)
	if err != nil {
		t.Fatalf("ParseSSEStream: %v", err)
	}
	if result.Error != "The arena short-circuited." {
		t.Errorf("Error = %q, want %q", result.Error, "The arena short-circuited.")
	}
}

func TestParseSSEStreamEmpty(t *testing.T) {
	r := strings.NewReader("data: [DONE]\n\n")

	result, err := ParseSSEStream(r, nil)
	if err != nil {
		t.Fatalf("ParseSSEStream: %v", err)
	}
	if len(result.Turns) != 0 {
		t.Errorf("Turns = %d, want 0", len(result.Turns))
	}
	if result.EventCount != 0 {
		t.Errorf("EventCount = %d, want 0", result.EventCount)
	}
}

func TestParseSSEStreamNoDone(t *testing.T) {
	// Stream that ends without [DONE] — should not error.
	stream := `data: {"type":"start","messageId":"abc"}` + "\n\n"
	r := strings.NewReader(stream)

	result, err := ParseSSEStream(r, nil)
	if err != nil {
		t.Fatalf("ParseSSEStream: %v", err)
	}
	if result.EventCount != 1 {
		t.Errorf("EventCount = %d, want 1", result.EventCount)
	}
}

func TestParseSSEStreamInvalidJSON(t *testing.T) {
	stream := "data: {invalid json}\n\ndata: [DONE]\n\n"
	r := strings.NewReader(stream)

	_, err := ParseSSEStream(r, nil)
	if err == nil {
		t.Fatal("expected error for invalid JSON")
	}
	if !strings.Contains(err.Error(), "parse SSE event") {
		t.Errorf("error = %q, want it to contain 'parse SSE event'", err.Error())
	}
}

func TestParseSSEStreamCallbackAbort(t *testing.T) {
	stream := simulatedBoutStream()
	r := strings.NewReader(stream)

	abortErr := errors.New("budget exceeded")
	eventCount := 0

	_, err := ParseSSEStream(r, func(e SSEEvent) error {
		eventCount++
		if eventCount >= 3 {
			return abortErr
		}
		return nil
	})

	if err == nil {
		t.Fatal("expected error from aborted callback")
	}
	if !strings.Contains(err.Error(), "callback aborted") {
		t.Errorf("error = %q, want it to contain 'callback aborted'", err.Error())
	}
	if !errors.Is(err, abortErr) {
		t.Errorf("error should wrap abortErr")
	}
	if eventCount != 3 {
		t.Errorf("eventCount = %d, want 3", eventCount)
	}
}

func TestParseSSEStreamNilCallback(t *testing.T) {
	stream := simulatedBoutStream()
	r := strings.NewReader(stream)

	result, err := ParseSSEStream(r, nil)
	if err != nil {
		t.Fatalf("ParseSSEStream: %v", err)
	}
	if len(result.Turns) != 2 {
		t.Errorf("Turns = %d, want 2", len(result.Turns))
	}
}

func TestParseSSEStreamIgnoresComments(t *testing.T) {
	// SSE spec allows comment lines starting with ":".
	stream := ": this is a comment\ndata: {\"type\":\"start\",\"messageId\":\"x\"}\n\ndata: [DONE]\n\n"
	r := strings.NewReader(stream)

	result, err := ParseSSEStream(r, nil)
	if err != nil {
		t.Fatalf("ParseSSEStream: %v", err)
	}
	if result.EventCount != 1 {
		t.Errorf("EventCount = %d, want 1", result.EventCount)
	}
}

func TestParseSSEStreamDataTurnParsing(t *testing.T) {
	stream := `data: {"type":"data-turn","data":{"turn":3,"agentId":"kant","agentName":"Immanuel Kant","color":"#FFFFFF"}}` + "\n\n" +
		"data: [DONE]\n\n"
	r := strings.NewReader(stream)

	var gotTurn *TurnData
	_, err := ParseSSEStream(r, func(e SSEEvent) error {
		if e.Type == EventDataTurn {
			gotTurn = e.Turn
		}
		return nil
	})
	if err != nil {
		t.Fatalf("ParseSSEStream: %v", err)
	}
	if gotTurn == nil {
		t.Fatal("expected Turn data")
	}
	if gotTurn.Turn != 3 {
		t.Errorf("Turn = %d, want 3", gotTurn.Turn)
	}
	if gotTurn.AgentID != "kant" {
		t.Errorf("AgentID = %q, want kant", gotTurn.AgentID)
	}
	if gotTurn.AgentName != "Immanuel Kant" {
		t.Errorf("AgentName = %q, want %q", gotTurn.AgentName, "Immanuel Kant")
	}
	if gotTurn.Color != "#FFFFFF" {
		t.Errorf("Color = %q, want #FFFFFF", gotTurn.Color)
	}
}

func TestParseSSEStreamShareLineParsing(t *testing.T) {
	stream := `data: {"type":"data-share-line","data":{"text":"Epic debate unfolds"}}` + "\n\n" +
		"data: [DONE]\n\n"
	r := strings.NewReader(stream)

	var gotShareLine string
	_, err := ParseSSEStream(r, func(e SSEEvent) error {
		if e.Type == EventDataShareLine && e.ShareLine != nil {
			gotShareLine = e.ShareLine.Text
		}
		return nil
	})
	if err != nil {
		t.Fatalf("ParseSSEStream: %v", err)
	}
	if gotShareLine != "Epic debate unfolds" {
		t.Errorf("ShareLine = %q, want %q", gotShareLine, "Epic debate unfolds")
	}
}

func TestParseSSEStreamTextDeltaAccumulation(t *testing.T) {
	stream := `data: {"type":"data-turn","data":{"turn":0,"agentId":"a","agentName":"A","color":"#000"}}` + "\n\n" +
		`data: {"type":"text-delta","id":"x","delta":"Hello "}` + "\n\n" +
		`data: {"type":"text-delta","id":"x","delta":"World"}` + "\n\n" +
		"data: [DONE]\n\n"
	r := strings.NewReader(stream)

	result, err := ParseSSEStream(r, nil)
	if err != nil {
		t.Fatalf("ParseSSEStream: %v", err)
	}
	if len(result.Turns) != 1 {
		t.Fatalf("Turns = %d, want 1", len(result.Turns))
	}
	if result.Turns[0].Text != "Hello World" {
		t.Errorf("Text = %q, want %q", result.Turns[0].Text, "Hello World")
	}
}

func TestTruncate(t *testing.T) {
	tests := []struct {
		input  string
		maxLen int
		want   string
	}{
		{"short", 10, "short"},
		{"exactly10!", 10, "exactly10!"},
		{"this is longer than ten", 10, "this is lo..."},
		{"", 5, ""},
	}
	for _, tt := range tests {
		got := truncate(tt.input, tt.maxLen)
		if got != tt.want {
			t.Errorf("truncate(%q, %d) = %q, want %q", tt.input, tt.maxLen, got, tt.want)
		}
	}
}
