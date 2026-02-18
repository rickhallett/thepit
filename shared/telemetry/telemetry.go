package telemetry

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os"
	"strings"
	"sync"
	"time"

	posthog "github.com/posthog/posthog-go"
)

type enqueueClient interface {
	Enqueue(posthog.Message) error
	Close() error
}

var (
	mu          sync.RWMutex
	client      enqueueClient
	enabled     bool
	defaultTool = "unknown"
)

// Init sets up a shared PostHog client for CLI tools. Safe to call multiple times.
func Init(tool string) error {
	mu.Lock()
	defer mu.Unlock()
	if client != nil {
		return nil
	}

	key := strings.TrimSpace(os.Getenv("POSTHOG_API_KEY"))
	if key == "" {
		key = strings.TrimSpace(os.Getenv("NEXT_PUBLIC_POSTHOG_KEY"))
	}
	if key == "" {
		enabled = false
		defaultTool = toolOrDefault(tool)
		return nil
	}

	host := strings.TrimSpace(os.Getenv("POSTHOG_PRIVATE_API"))
	if host == "" {
		host = strings.TrimSpace(os.Getenv("NEXT_PUBLIC_POSTHOG_HOST"))
	}
	if host == "" {
		host = "https://us.i.posthog.com"
	}
	if !strings.HasPrefix(host, "http://") && !strings.HasPrefix(host, "https://") {
		host = "https://" + host
	}
	cfg := posthog.Config{
		Endpoint:        strings.TrimRight(host, "/") + "/batch/",
		Interval:        2 * time.Second,
		BatchSize:       20,
		ShutdownTimeout: 5 * time.Second,
	}

	phClient, err := posthog.NewWithConfig(key, cfg)
	if err != nil {
		return err
	}

	client = phClient
	enabled = true
	defaultTool = toolOrDefault(tool)
	return nil
}

func toolOrDefault(tool string) string {
	if strings.TrimSpace(tool) == "" {
		return "unknown"
	}
	return strings.TrimSpace(tool)
}

// Enabled reports whether telemetry is configured with a key.
func Enabled() bool {
	mu.RLock()
	defer mu.RUnlock()
	return enabled && client != nil
}

func distinctIDForTool(tool string) string {
	host, _ := os.Hostname()
	if host == "" {
		host = "unknown-host"
	}
	sum := sha256.Sum256([]byte(host))
	hostHash := hex.EncodeToString(sum[:8])
	return fmt.Sprintf("cli:%s:%s", toolOrDefault(tool), hostHash)
}

// Track emits a CLI event. No-op when telemetry is disabled.
func Track(distinctID string, event string, properties map[string]any) {
	mu.RLock()
	c := client
	ok := enabled
	tool := defaultTool
	mu.RUnlock()
	if !ok || c == nil || strings.TrimSpace(event) == "" {
		return
	}
	if strings.TrimSpace(distinctID) == "" {
		distinctID = distinctIDForTool(tool)
	}
	props := posthog.NewProperties().Set("source", "cli").Set("tool", tool)
	for k, v := range properties {
		props[k] = v
	}
	_ = c.Enqueue(posthog.Capture{
		DistinctId: distinctID,
		Event:      event,
		Properties: props,
	})
}

// Identify updates person properties for a CLI distinct id.
func Identify(distinctID string, properties map[string]any) {
	mu.RLock()
	c := client
	ok := enabled
	tool := defaultTool
	mu.RUnlock()
	if !ok || c == nil {
		return
	}
	if strings.TrimSpace(distinctID) == "" {
		distinctID = distinctIDForTool(tool)
	}
	props := posthog.NewProperties()
	for k, v := range properties {
		props[k] = v
	}
	_ = c.Enqueue(posthog.Identify{DistinctId: distinctID, Properties: props})
}

// Flush forces best-effort delivery by closing and reinitializing the client.
func Flush() {
	mu.Lock()
	defer mu.Unlock()
	if !enabled || client == nil {
		return
	}
	_ = client.Close()
	client = nil
	_ = Init(defaultTool)
}

// Close flushes and shuts down the telemetry client.
func Close() {
	mu.Lock()
	defer mu.Unlock()
	if client != nil {
		_ = client.Close()
	}
	client = nil
	enabled = false
}

// Client is a compatibility wrapper used by existing pit* call sites.
type Client struct {
	tool string
}

func New(tool string) *Client {
	_ = Init(tool)
	return &Client{tool: toolOrDefault(tool)}
}

func (c *Client) Enabled() bool { return Enabled() }

func (c *Client) Capture(_ any, event string, properties map[string]any) error {
	distinctID := distinctIDForTool(c.tool)
	Track(distinctID, event, properties)
	return nil
}
