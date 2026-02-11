package cmd

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/charmbracelet/lipgloss"
	"github.com/charmbracelet/lipgloss/table"

	"github.com/rickhallett/thepit/pitctl/internal/config"
	"github.com/rickhallett/thepit/pitctl/internal/db"
	"github.com/rickhallett/thepit/pitctl/internal/format"
	"github.com/rickhallett/thepit/pitctl/internal/theme"
)

// RunCreditsBalance shows a user's credit balance and recent transactions.
func RunCreditsBalance(cfg *config.Config, userID string) error {
	conn, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer conn.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var balanceMicro int64
	err = conn.QueryVal(ctx, &balanceMicro,
		`SELECT balance_micro FROM credits WHERE user_id = $1`, userID)
	if err == sql.ErrNoRows {
		return fmt.Errorf("no credit account for user %q", userID)
	}
	if err != nil {
		return err
	}

	fmt.Println()
	fmt.Printf("  %s %s %s\n",
		theme.Muted.Render("Balance for"),
		theme.Value.Render(format.TruncateID(userID)),
		theme.Bold.Render(format.Credits(balanceMicro)+" credits"))
	fmt.Println()
	return nil
}

// RunCreditsGrant adds credits to a user's account.
func RunCreditsGrant(cfg *config.Config, userID string, amount int64, confirmed bool) error {
	if amount <= 0 {
		return fmt.Errorf("amount must be positive")
	}
	if !confirmed {
		return fmt.Errorf("granting %s credits to %s requires --yes flag", format.Num(amount), format.TruncateID(userID))
	}

	conn, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer conn.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	microAmount := amount * 100 // 1 credit = 100 micro

	// Ensure credit account exists.
	_, err = conn.DB.ExecContext(ctx, `
		INSERT INTO credits (user_id, balance_micro, created_at, updated_at)
		VALUES ($1, 0, NOW(), NOW())
		ON CONFLICT (user_id) DO NOTHING`, userID)
	if err != nil {
		return err
	}

	// Update balance.
	_, err = conn.DB.ExecContext(ctx, `
		UPDATE credits SET balance_micro = balance_micro + $1, updated_at = NOW()
		WHERE user_id = $2`, microAmount, userID)
	if err != nil {
		return err
	}

	// Record transaction.
	_, err = conn.DB.ExecContext(ctx, `
		INSERT INTO credit_transactions (user_id, delta_micro, source, metadata, created_at)
		VALUES ($1, $2, 'admin_grant', '{"tool":"pitctl"}'::jsonb, NOW())`,
		userID, microAmount)
	if err != nil {
		return err
	}

	fmt.Printf("\n  %s\n\n",
		theme.Success.Render(fmt.Sprintf("Granted %s credits to %s", format.Num(amount), format.TruncateID(userID))))
	return nil
}

// RunCreditsLedger shows full transaction history for a user.
func RunCreditsLedger(cfg *config.Config, userID string, limit int) error {
	conn, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer conn.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if limit <= 0 {
		limit = 50
	}

	rows, err := conn.DB.QueryContext(ctx, `
		SELECT delta_micro, source, reference_id, created_at
		FROM credit_transactions
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2`, userID, limit)
	if err != nil {
		return err
	}
	defer rows.Close()

	fmt.Println()
	fmt.Println(theme.Title.Render(fmt.Sprintf("credit ledger for %s", format.TruncateID(userID))))
	fmt.Println()

	var tableRows [][]string
	for rows.Next() {
		var delta int64
		var source string
		var refID sql.NullString
		var createdAt time.Time

		if err := rows.Scan(&delta, &source, &refID, &createdAt); err != nil {
			return err
		}
		tableRows = append(tableRows, []string{
			format.Credits(delta),
			source,
			nullStr(refID),
			format.DateTime(createdAt),
		})
	}

	if len(tableRows) == 0 {
		fmt.Println(theme.Muted.Render("  No transactions."))
		fmt.Println()
		return nil
	}

	t := table.New().
		Border(lipgloss.RoundedBorder()).
		BorderStyle(theme.BorderStyle()).
		Headers("Delta", "Source", "Reference", "Time").
		Rows(tableRows...).
		StyleFunc(func(row, col int) lipgloss.Style {
			base := lipgloss.NewStyle().Padding(0, 1)
			if row == -1 {
				return base.Bold(true).Foreground(theme.ColorBlue).Align(lipgloss.Center)
			}
			if col == 0 {
				return base.Foreground(theme.ColorFg).Align(lipgloss.Right)
			}
			return base.Foreground(theme.ColorFg)
		})

	fmt.Println(t.Render())
	fmt.Println()
	return nil
}

// RunCreditsSummary shows economy-wide credit statistics.
func RunCreditsSummary(cfg *config.Config) error {
	conn, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer conn.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	var totalAccounts int64
	var totalBalance, totalGranted, totalSpent int64
	var zeroBalance int64

	conn.QueryVal(ctx, &totalAccounts, `SELECT COUNT(*) FROM credits`)
	conn.QueryVal(ctx, &totalBalance, `SELECT COALESCE(SUM(balance_micro), 0) FROM credits`)
	conn.QueryVal(ctx, &totalGranted,
		`SELECT COALESCE(SUM(delta_micro), 0) FROM credit_transactions WHERE delta_micro > 0`)
	conn.QueryVal(ctx, &totalSpent,
		`SELECT COALESCE(ABS(SUM(delta_micro)), 0) FROM credit_transactions WHERE delta_micro < 0`)
	conn.QueryVal(ctx, &zeroBalance, `SELECT COUNT(*) FROM credits WHERE balance_micro <= 0`)

	avgBalance := int64(0)
	if totalAccounts > 0 {
		avgBalance = totalBalance / totalAccounts
	}

	fmt.Println()
	fmt.Println(theme.Title.Render("credit economy"))
	fmt.Println()

	rows := [][]string{
		{"Total accounts", format.Num(totalAccounts)},
		{"Total balance", format.Credits(totalBalance)},
		{"Total granted", format.Credits(totalGranted)},
		{"Total spent", format.Credits(totalSpent)},
		{"Avg balance", format.Credits(avgBalance)},
		{"Zero-balance", format.Num(zeroBalance)},
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
