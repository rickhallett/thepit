package cmd

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/charmbracelet/lipgloss"
	"github.com/charmbracelet/lipgloss/table"

	"github.com/rickhallett/thepit/shared/config"
	"github.com/rickhallett/thepit/shared/db"
	"github.com/rickhallett/thepit/shared/format"
	"github.com/rickhallett/thepit/shared/theme"
)

// BoutsListOpts configures the bouts list command.
type BoutsListOpts struct {
	Status string
	Owner  string
	Limit  int
}

// RunBoutsList displays recent bouts.
func RunBoutsList(cfg *config.Config, opts BoutsListOpts) error {
	conn, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer conn.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if opts.Limit <= 0 {
		opts.Limit = 25
	}

	query := `SELECT id, preset_id, status, owner_id, created_at FROM bouts WHERE 1=1`
	var args []interface{}
	argN := 1

	if opts.Status != "" {
		query += fmt.Sprintf(` AND status = $%d`, argN)
		args = append(args, opts.Status)
		argN++
	}
	if opts.Owner != "" {
		query += fmt.Sprintf(` AND owner_id = $%d`, argN)
		args = append(args, opts.Owner)
		argN++
	}

	query += ` ORDER BY created_at DESC`
	query += fmt.Sprintf(` LIMIT $%d`, argN)
	args = append(args, opts.Limit)

	rows, err := conn.DB.QueryContext(ctx, query, args...)
	if err != nil {
		return fmt.Errorf("querying bouts: %w", err)
	}
	defer rows.Close()

	fmt.Println()
	fmt.Println(theme.Title.Render("bouts"))
	fmt.Println()

	var tableRows [][]string
	for rows.Next() {
		var id, presetID, status string
		var ownerID sql.NullString
		var createdAt time.Time

		if err := rows.Scan(&id, &presetID, &status, &ownerID, &createdAt); err != nil {
			return err
		}

		statusStr := status
		owner := nullStr(ownerID)

		tableRows = append(tableRows, []string{
			id,
			truncStr(presetID, 20),
			statusStr,
			truncStr(owner, 12),
			format.RelativeTime(createdAt),
		})
	}

	if len(tableRows) == 0 {
		fmt.Println(theme.Muted.Render("  No bouts found."))
		fmt.Println()
		return nil
	}

	t := table.New().
		Border(lipgloss.RoundedBorder()).
		BorderStyle(theme.BorderStyle()).
		Headers("ID", "Preset", "Status", "Owner", "Created").
		Rows(tableRows...).
		StyleFunc(func(row, col int) lipgloss.Style {
			base := lipgloss.NewStyle().Padding(0, 1)
			if row == -1 {
				return base.Bold(true).Foreground(theme.ColorBlue).Align(lipgloss.Center)
			}
			if col == 0 {
				return base.Foreground(theme.ColorGray)
			}
			if col == 2 {
				return base.Foreground(theme.ColorPurple)
			}
			return base.Foreground(theme.ColorFg)
		})

	fmt.Println(t.Render())
	fmt.Println()
	return nil
}

// RunBoutsInspect shows full detail for a single bout.
func RunBoutsInspect(cfg *config.Config, boutID string) error {
	conn, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer conn.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var id, presetID, status string
	var ownerID, topic, responseLength, responseFormat, shareLine sql.NullString
	var createdAt time.Time

	err = conn.DB.QueryRowContext(ctx, `
		SELECT id, preset_id, status, owner_id, topic,
		       response_length, response_format, share_line, created_at
		FROM bouts WHERE id = $1`, boutID).Scan(
		&id, &presetID, &status, &ownerID, &topic,
		&responseLength, &responseFormat, &shareLine, &createdAt)
	if err == sql.ErrNoRows {
		return fmt.Errorf("bout %q not found", boutID)
	}
	if err != nil {
		return err
	}

	// Reaction + vote counts.
	var reactionCount, voteCount int64
	conn.QueryVal(ctx, &reactionCount, `SELECT COUNT(*) FROM reactions WHERE bout_id = $1`, boutID)
	conn.QueryVal(ctx, &voteCount, `SELECT COUNT(*) FROM winner_votes WHERE bout_id = $1`, boutID)

	fmt.Println()
	fmt.Println(theme.Title.Render("bout detail"))
	fmt.Println()

	kv := func(label, value string) {
		fmt.Printf("  %-24s %s\n", theme.Muted.Render(label), theme.Value.Render(value))
	}

	kv("ID", id)
	kv("Preset", presetID)
	kv("Status", status)
	kv("Owner", nullStr(ownerID))
	kv("Topic", nullStr(topic))
	kv("Response Length", nullStr(responseLength))
	kv("Response Format", nullStr(responseFormat))
	kv("Share Line", nullStr(shareLine))
	kv("Reactions", format.Num(reactionCount))
	kv("Winner Votes", format.Num(voteCount))
	kv("Created", format.DateTime(createdAt))
	fmt.Println()

	return nil
}

// RunBoutsStats shows aggregated bout statistics.
func RunBoutsStats(cfg *config.Config) error {
	conn, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer conn.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	var totalBouts, completedBouts, errorBouts, todayBouts, weekBouts int64
	var uniquePlayers int64

	queryWarn(ctx, conn, &totalBouts, `SELECT COUNT(*) FROM bouts`)
	queryWarn(ctx, conn, &completedBouts, `SELECT COUNT(*) FROM bouts WHERE status = 'completed'`)
	queryWarn(ctx, conn, &errorBouts, `SELECT COUNT(*) FROM bouts WHERE status = 'error'`)
	queryWarn(ctx, conn, &todayBouts, `SELECT COUNT(*) FROM bouts WHERE created_at >= CURRENT_DATE`)
	queryWarn(ctx, conn, &weekBouts, `SELECT COUNT(*) FROM bouts WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'`)
	queryWarn(ctx, conn, &uniquePlayers, `SELECT COUNT(DISTINCT owner_id) FROM bouts WHERE owner_id IS NOT NULL`)

	completionRate := format.Percent(completedBouts, totalBouts)

	// Top preset.
	var topPreset sql.NullString
	var topPresetCount int64
	conn.DB.QueryRowContext(ctx, `
		SELECT preset_id, COUNT(*) as c FROM bouts
		GROUP BY preset_id ORDER BY c DESC LIMIT 1`).Scan(&topPreset, &topPresetCount)
	topPresetStr := "-"
	if topPreset.Valid {
		topPresetStr = fmt.Sprintf("%s (%s)", topPreset.String, format.Num(topPresetCount))
	}

	fmt.Println()
	fmt.Println(theme.Title.Render("bout statistics"))
	fmt.Println()

	rows := [][]string{
		{"Total bouts", format.Num(totalBouts)},
		{"Completion rate", completionRate},
		{"Errored", format.Num(errorBouts)},
		{"Bouts today", format.Num(todayBouts)},
		{"Bouts this week", format.Num(weekBouts)},
		{"Unique players", format.Num(uniquePlayers)},
		{"Top preset", topPresetStr},
	}

	t := table.New().
		Border(lipgloss.RoundedBorder()).
		BorderStyle(theme.BorderStyle()).
		Headers("Metric", "Value").
		Rows(rows...).
		StyleFunc(func(row, col int) lipgloss.Style {
			base := lipgloss.NewStyle().Padding(0, 1)
			if row == -1 {
				return base.Bold(true).Foreground(theme.ColorBlue).Align(lipgloss.Center)
			}
			if col == 0 {
				return base.Foreground(theme.ColorPurple)
			}
			return base.Foreground(theme.ColorFg).Align(lipgloss.Right)
		})

	fmt.Println(t.Render())
	fmt.Println()
	return nil
}

// RunBoutsPurgeErrors deletes all errored bouts.
func RunBoutsPurgeErrors(cfg *config.Config, confirmed bool) error {
	conn, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer conn.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var errorCount int64
	conn.QueryVal(ctx, &errorCount, `SELECT COUNT(*) FROM bouts WHERE status = 'error'`)

	if errorCount == 0 {
		fmt.Printf("\n  %s\n\n", theme.Muted.Render("No errored bouts to purge."))
		return nil
	}

	if !confirmed {
		return fmt.Errorf("purging %d errored bouts requires --yes flag", errorCount)
	}

	result, err := conn.DB.ExecContext(ctx, `DELETE FROM bouts WHERE status = 'error'`)
	if err != nil {
		return err
	}

	deleted, _ := result.RowsAffected()
	fmt.Printf("\n  %s\n\n",
		theme.Success.Render(fmt.Sprintf("Purged %d errored bouts", deleted)))
	return nil
}
