package client

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"strings"
	"time"
)

// SSE event types emitted by THE PIT's /api/run-bout endpoint.
// The stream uses Vercel AI SDK UIMessageStream v1 format:
// each line is "data: <JSON>\n\n" with no "event:" field lines.
const (
	EventStart         = "start"
	EventDataTurn      = "data-turn"
	EventTextStart     = "text-start"
	EventTextDelta     = "text-delta"
	EventTextEnd       = "text-end"
	EventDataShareLine = "data-share-line"
	EventError         = "error"
	EventDone          = "[DONE]"
)

// SSEEvent represents a single parsed event from the stream.
type SSEEvent struct {
	Type string `json:"type"`

	// For start events.
	MessageID string `json:"messageId,omitempty"`

	// For data-turn events.
	Turn *TurnData `json:"-"`

	// For text-start / text-delta / text-end events.
	ID    string `json:"id,omitempty"`
	Delta string `json:"delta,omitempty"`

	// For data-share-line events.
	ShareLine *ShareLineData `json:"-"`

	// For error events.
	ErrorText string `json:"errorText,omitempty"`

	// Raw JSON for custom processing.
	Raw json.RawMessage `json:"-"`
}

// TurnData carries metadata for a data-turn event.
type TurnData struct {
	Turn      int    `json:"turn"`
	AgentID   string `json:"agentId"`
	AgentName string `json:"agentName"`
	Color     string `json:"color"`
}

// ShareLineData carries the bout share line.
type ShareLineData struct {
	Text string `json:"text"`
}

// StreamResult summarises a completed SSE stream.
type StreamResult struct {
	Turns      []TurnResult
	ShareLine  string
	Error      string
	EventCount int
	DeltaCount int
	TotalChars int
	Duration   time.Duration
	FirstByte  time.Duration // time to first text-delta
}

// TurnResult holds the accumulated text for a single turn.
type TurnResult struct {
	Turn      int
	AgentID   string
	AgentName string
	Color     string
	Text      string
}

// SSECallback is invoked for each parsed event during streaming.
// Return a non-nil error to abort the stream.
type SSECallback func(event SSEEvent) error

// ParseSSEStream reads a UIMessageStream SSE body and invokes the
// callback for each event. It returns a StreamResult summarising the
// full stream.
//
// The stream format is:
//
//	data: {"type":"...","...":"..."}\n
//	\n
//	...
//	data: [DONE]\n
//	\n
func ParseSSEStream(r io.Reader, onEvent SSECallback) (*StreamResult, error) {
	scanner := bufio.NewScanner(r)
	// Enlarge buffer for large SSE data payloads.
	scanner.Buffer(make([]byte, 64*1024), 512*1024)

	result := &StreamResult{}
	start := time.Now()
	firstDelta := false
	var currentTurn *TurnResult

	for scanner.Scan() {
		line := scanner.Text()

		// Skip blank lines (SSE event delimiters).
		if line == "" {
			continue
		}

		// All data lines start with "data: ".
		if !strings.HasPrefix(line, "data: ") {
			// Ignore non-data lines (e.g. comments starting with ":").
			continue
		}

		data := strings.TrimPrefix(line, "data: ")

		// Stream terminator.
		if data == "[DONE]" {
			result.Duration = time.Since(start)
			return result, nil
		}

		result.EventCount++

		// Parse the JSON envelope to get the type.
		var event SSEEvent
		if err := json.Unmarshal([]byte(data), &event); err != nil {
			return result, fmt.Errorf("parse SSE event: %w (data: %s)", err, truncate(data, 200))
		}
		event.Raw = json.RawMessage(data)

		// Parse type-specific nested data.
		switch event.Type {
		case EventDataTurn:
			var envelope struct {
				Data TurnData `json:"data"`
			}
			if err := json.Unmarshal([]byte(data), &envelope); err != nil {
				return result, fmt.Errorf("parse data-turn: %w", err)
			}
			event.Turn = &envelope.Data
			currentTurn = &TurnResult{
				Turn:      envelope.Data.Turn,
				AgentID:   envelope.Data.AgentID,
				AgentName: envelope.Data.AgentName,
				Color:     envelope.Data.Color,
			}
			result.Turns = append(result.Turns, *currentTurn)

		case EventTextDelta:
			result.DeltaCount++
			result.TotalChars += len(event.Delta)
			if !firstDelta {
				firstDelta = true
				result.FirstByte = time.Since(start)
			}
			// Append delta text to the current turn.
			if len(result.Turns) > 0 {
				result.Turns[len(result.Turns)-1].Text += event.Delta
			}

		case EventDataShareLine:
			var envelope struct {
				Data ShareLineData `json:"data"`
			}
			if err := json.Unmarshal([]byte(data), &envelope); err != nil {
				return result, fmt.Errorf("parse data-share-line: %w", err)
			}
			event.ShareLine = &envelope.Data
			result.ShareLine = envelope.Data.Text

		case EventError:
			result.Error = event.ErrorText

		case EventStart, EventTextStart, EventTextEnd:
			// No additional parsing needed.
		}

		// Fire callback if provided.
		if onEvent != nil {
			if err := onEvent(event); err != nil {
				result.Duration = time.Since(start)
				return result, fmt.Errorf("callback aborted stream: %w", err)
			}
		}
	}

	if err := scanner.Err(); err != nil {
		return result, fmt.Errorf("reading stream: %w", err)
	}

	// Stream ended without [DONE] — may indicate an incomplete response.
	result.Duration = time.Since(start)
	return result, nil
}

// truncate shortens a string to maxLen, appending "..." if truncated.
func truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "..."
}
