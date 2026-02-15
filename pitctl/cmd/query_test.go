package cmd

import (
	"bytes"
	"context"
	"database/sql"
	"io"
	"os"
	"strings"
	"testing"

	_ "github.com/lib/pq"
	"github.com/rickhallett/thepit/shared/db"
)

// openTestDB returns a *sql.DB opened with the postgres driver and a
// bogus DSN. sql.Open succeeds (connections are lazy), but any actual
// query will fail — exactly what we need to exercise the error path.
func openTestDB() (*sql.DB, error) {
	return sql.Open("postgres", "host=127.0.0.1 port=1 dbname=nonexistent sslmode=disable connect_timeout=1")
}

// captureStderr redirects os.Stderr to a pipe, runs fn, and returns
// whatever was written to stderr.
func captureStderr(t *testing.T, fn func()) string {
	t.Helper()

	oldStderr := os.Stderr
	r, w, err := os.Pipe()
	if err != nil {
		t.Fatal(err)
	}
	os.Stderr = w

	fn()

	w.Close()
	os.Stderr = oldStderr

	var buf bytes.Buffer
	io.Copy(&buf, r)
	r.Close()

	return buf.String()
}

func TestQueryWarnNilConnWritesWarning(t *testing.T) {
	// queryWarn with a nil connection should not panic and should
	// write a "warn:" message to stderr mentioning the query.
	var dest int64
	output := captureStderr(t, func() {
		queryWarn(context.Background(), nil, &dest, "SELECT count(*) FROM users")
	})

	if !strings.Contains(output, "warn:") {
		t.Errorf("expected stderr to contain 'warn:', got: %q", output)
	}
	if !strings.Contains(output, "no connection") {
		t.Errorf("expected stderr to mention 'no connection', got: %q", output)
	}
	if !strings.Contains(output, "SELECT count(*) FROM users") {
		t.Errorf("expected stderr to contain the query text, got: %q", output)
	}
	if dest != 0 {
		t.Errorf("dest should remain zero on nil conn, got %d", dest)
	}
}

func TestQueryWarnFailedQueryWritesWarning(t *testing.T) {
	// Create a real *db.DB wrapping an unopened *sql.DB (will fail on query).
	// sql.Open with postgres driver validates the DSN lazily — the actual
	// failure occurs on QueryVal when no real server is listening.
	rawDB, err := openTestDB()
	if err != nil {
		t.Skipf("cannot open test db stub: %v", err)
	}
	conn := &db.DB{DB: rawDB}
	defer conn.Close()

	var dest int64
	ctx, cancel := context.WithCancel(context.Background())
	cancel() // immediately cancel to guarantee failure

	output := captureStderr(t, func() {
		queryWarn(ctx, conn, &dest, "SELECT 1")
	})

	if !strings.Contains(output, "warn:") {
		t.Errorf("expected stderr to contain 'warn:', got: %q", output)
	}
	if !strings.Contains(output, "query failed") {
		t.Errorf("expected stderr to contain 'query failed', got: %q", output)
	}
	if dest != 0 {
		t.Errorf("dest should remain zero on failed query, got %d", dest)
	}
}

func TestQueryWarnHelperSignature(t *testing.T) {
	// Compile-time assertion: queryWarn has the expected signature.
	var fn func(context.Context, *db.DB, interface{}, string, ...interface{})
	fn = queryWarn
	if fn == nil {
		t.Error("queryWarn should not be nil")
	}
}
