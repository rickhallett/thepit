// Package db provides PostgreSQL connectivity for pitctl.
// It wraps database/sql with lib/pq for Neon serverless Postgres.
package db

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	_ "github.com/lib/pq"
)

// DB wraps a sql.DB connection pool with convenience methods.
type DB struct {
	*sql.DB
}

// Connect opens a connection to the database and verifies it with a ping.
func Connect(databaseURL string) (*DB, error) {
	if databaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL is not set")
	}

	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		return nil, fmt.Errorf("opening database: %w", err)
	}

	db.SetMaxOpenConns(5)
	db.SetMaxIdleConns(2)
	db.SetConnMaxLifetime(5 * time.Minute)

	return &DB{db}, nil
}

// Ping tests connectivity and returns the round-trip latency.
func (d *DB) Ping(ctx context.Context) (time.Duration, error) {
	start := time.Now()
	if err := d.DB.PingContext(ctx); err != nil {
		return 0, err
	}
	return time.Since(start), nil
}

// QueryVal executes a query that returns a single scalar value.
func (d *DB) QueryVal(ctx context.Context, dest interface{}, query string, args ...interface{}) error {
	return d.DB.QueryRowContext(ctx, query, args...).Scan(dest)
}

// TableStats holds size and row count information for a database table.
type TableStats struct {
	Name    string
	Rows    int64
	SizeStr string
}

// GetTableStats returns row counts and sizes for all application tables.
func (d *DB) GetTableStats(ctx context.Context) ([]TableStats, error) {
	query := `
		SELECT
			relname AS name,
			n_live_tup AS rows,
			pg_size_pretty(pg_total_relation_size(relid)) AS size
		FROM pg_stat_user_tables
		ORDER BY n_live_tup DESC`

	rows, err := d.DB.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var stats []TableStats
	for rows.Next() {
		var s TableStats
		if err := rows.Scan(&s.Name, &s.Rows, &s.SizeStr); err != nil {
			return nil, err
		}
		stats = append(stats, s)
	}
	return stats, rows.Err()
}

// TotalSize returns the total database size as a human-readable string.
func (d *DB) TotalSize(ctx context.Context) (string, error) {
	var size string
	err := d.QueryVal(ctx, &size, `SELECT pg_size_pretty(pg_database_size(current_database()))`)
	return size, err
}
