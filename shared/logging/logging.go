package logging

import (
	"io"
	"log/slog"
	"os"
)

func NewJSONLogger(service string) *slog.Logger {
	handler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	})
	return slog.New(handler).With("service", service, "source", "cli")
}

func NewJSONLoggerWithWriter(service string, w io.Writer) *slog.Logger {
	handler := slog.NewJSONHandler(w, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	})
	return slog.New(handler).With("service", service, "source", "cli")
}
