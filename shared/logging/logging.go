package logging

import (
	"io"
	"log/slog"
	"os"
	"strings"
)

func parseLevel(level string) slog.Level {
	switch strings.ToLower(strings.TrimSpace(level)) {
	case "debug":
		return slog.LevelDebug
	case "warn":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}

// Setup configures a structured logger for pit* tools.
func Setup(service, level string, jsonMode bool) *slog.Logger {
	if strings.TrimSpace(level) == "" {
		level = os.Getenv("LOG_LEVEL")
	}
	if strings.TrimSpace(service) == "" {
		service = "pit"
	}
	return setupWithWriter(service, level, jsonMode, os.Stderr)
}

func setupWithWriter(service, level string, jsonMode bool, w io.Writer) *slog.Logger {
	opts := &slog.HandlerOptions{Level: parseLevel(level)}
	var handler slog.Handler
	if jsonMode {
		handler = slog.NewJSONHandler(w, opts)
	} else {
		handler = slog.NewTextHandler(w, opts)
	}
	return slog.New(handler).With("service", service, "source", "cli")
}

// Backward-compatible helper retained for existing call sites.
func NewJSONLogger(service string) *slog.Logger {
	return setupWithWriter(service, "info", true, os.Stdout)
}

// Backward-compatible helper retained for tests/custom sinks.
func NewJSONLoggerWithWriter(service string, w io.Writer) *slog.Logger {
	return setupWithWriter(service, "info", true, w)
}
