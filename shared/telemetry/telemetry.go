package telemetry

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"os"
	"strings"
	"time"
)

type Client struct {
	apiKey   string
	host     string
	service  string
	distinct string
	enabled  bool
	http     *http.Client
}

func New(service string) *Client {
	key := strings.TrimSpace(os.Getenv("POSTHOG_API_KEY"))
	if key == "" {
		key = strings.TrimSpace(os.Getenv("NEXT_PUBLIC_POSTHOG_KEY"))
	}
	host := strings.TrimSpace(os.Getenv("POSTHOG_PRIVATE_API"))
	if host == "" {
		host = strings.TrimSpace(os.Getenv("NEXT_PUBLIC_POSTHOG_HOST"))
	}
	if host == "" {
		host = "https://us.i.posthog.com"
	}
	host = strings.TrimRight(host, "/")
	if !strings.HasPrefix(host, "http://") && !strings.HasPrefix(host, "https://") {
		host = "https://" + host
	}
	hostname, _ := os.Hostname()
	if hostname == "" {
		hostname = "unknown-host"
	}
	distinct := "cli:" + service + ":" + hostname
	return &Client{
		apiKey:   key,
		host:     host,
		service:  service,
		distinct: distinct,
		enabled:  key != "",
		http:     &http.Client{Timeout: 2 * time.Second},
	}
}

func (c *Client) Enabled() bool {
	return c != nil && c.enabled
}

func (c *Client) Capture(ctx context.Context, event string, properties map[string]any) error {
	if !c.Enabled() {
		return nil
	}
	props := map[string]any{
		"service": c.service,
		"source":  "cli",
		"$lib":    "pit-cli",
	}
	for k, v := range properties {
		props[k] = v
	}
	body := map[string]any{
		"api_key":     c.apiKey,
		"event":       event,
		"distinct_id": c.distinct,
		"properties":  props,
	}
	raw, err := json.Marshal(body)
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, "POST", c.host+"/capture/", bytes.NewReader(raw))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.http.Do(req)
	if err != nil {
		return err
	}
	_ = resp.Body.Close()
	return nil
}
