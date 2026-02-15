package cmd

import (
	"context"
	"fmt"
	"os"

	"github.com/rickhallett/thepit/shared/db"
	"github.com/rickhallett/thepit/shared/theme"
)

// queryWarn executes a QueryVal and prints a warning to stderr on failure.
// The destination retains its zero value on error, allowing dashboard commands
// to render partial data rather than aborting entirely.
func queryWarn(ctx context.Context, conn *db.DB, dest interface{}, query string, args ...interface{}) {
	if conn == nil {
		fmt.Fprintf(os.Stderr, "  %s query skipped (no connection): %s\n", theme.StatusWarn.Render("warn:"), query)
		return
	}
	if err := conn.QueryVal(ctx, dest, query, args...); err != nil {
		fmt.Fprintf(os.Stderr, "  %s query failed: %v\n", theme.StatusWarn.Render("warn:"), err)
	}
}
