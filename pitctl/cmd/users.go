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

// UsersListOpts configures the users list command.
type UsersListOpts struct {
	Tier   string
	Search string
	Sort   string
	Limit  int
}

// RunUsersList displays a paginated list of users.
func RunUsersList(cfg *config.Config, opts UsersListOpts) error {
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

	query := `
		SELECT u.id, u.email, u.display_name, u.subscription_tier,
		       COALESCE(c.balance_micro, 0) AS balance,
		       u.free_bouts_used, u.created_at
		FROM users u
		LEFT JOIN credits c ON c.user_id = u.id
		WHERE 1=1`
	var args []interface{}
	argN := 1

	if opts.Tier != "" {
		query += fmt.Sprintf(` AND u.subscription_tier = $%d`, argN)
		args = append(args, opts.Tier)
		argN++
	}
	if opts.Search != "" {
		query += fmt.Sprintf(` AND (u.email ILIKE $%d OR u.display_name ILIKE $%d)`, argN, argN)
		args = append(args, "%"+opts.Search+"%")
		argN++
	}

	switch opts.Sort {
	case "credits":
		query += ` ORDER BY balance DESC`
	case "bouts":
		query += ` ORDER BY u.free_bouts_used DESC`
	case "newest":
		query += ` ORDER BY u.created_at DESC`
	default:
		query += ` ORDER BY u.created_at DESC`
	}

	query += fmt.Sprintf(` LIMIT $%d`, argN)
	args = append(args, opts.Limit)

	rows, err := conn.DB.QueryContext(ctx, query, args...)
	if err != nil {
		return fmt.Errorf("querying users: %w", err)
	}
	defer rows.Close()

	fmt.Println()
	fmt.Println(theme.Title.Render("users"))
	fmt.Println()

	var tableRows [][]string
	for rows.Next() {
		var id, tier string
		var email, displayName sql.NullString
		var balance int64
		var boutsUsed int
		var createdAt time.Time

		if err := rows.Scan(&id, &email, &displayName, &tier, &balance, &boutsUsed, &createdAt); err != nil {
			return err
		}

		name := ""
		if displayName.Valid {
			name = displayName.String
		} else if email.Valid {
			name = email.String
		}

		tableRows = append(tableRows, []string{
			format.TruncateID(id),
			truncStr(name, 24),
			tier,
			format.Credits(balance),
			fmt.Sprintf("%d", boutsUsed),
			format.Date(createdAt),
		})
	}
	if err := rows.Err(); err != nil {
		return err
	}

	if len(tableRows) == 0 {
		fmt.Println(theme.Warning.Render("  No users found."))
		fmt.Println()
		return nil
	}

	t := table.New().
		Border(lipgloss.RoundedBorder()).
		BorderStyle(theme.BorderStyle()).
		Headers("ID", "Name / Email", "Tier", "Credits", "Bouts", "Joined").
		Rows(tableRows...).
		StyleFunc(func(row, col int) lipgloss.Style {
			base := lipgloss.NewStyle().Padding(0, 1)
			if row == -1 {
				return base.Bold(true).Foreground(theme.ColorBlue).Align(lipgloss.Center)
			}
			switch col {
			case 0:
				return base.Foreground(theme.ColorGray)
			case 1:
				return base.Foreground(theme.ColorCyan)
			case 2:
				return base.Foreground(theme.ColorPurple)
			case 3, 4:
				return base.Foreground(theme.ColorFg).Align(lipgloss.Right)
			default:
				return base.Foreground(theme.ColorFg)
			}
		})

	fmt.Println(t.Render())
	fmt.Println()
	return nil
}

// RunUsersInspect shows full detail for a single user.
func RunUsersInspect(cfg *config.Config, userID string) error {
	conn, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer conn.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// User record.
	var id, tier string
	var email, displayName, referralCode, subStatus, subID, stripeID sql.NullString
	var boutsUsed int
	var createdAt, updatedAt time.Time

	err = conn.DB.QueryRowContext(ctx, `
		SELECT id, email, display_name, subscription_tier, subscription_status,
		       subscription_id, stripe_customer_id, referral_code,
		       free_bouts_used, created_at, updated_at
		FROM users WHERE id = $1`, userID).Scan(
		&id, &email, &displayName, &tier, &subStatus,
		&subID, &stripeID, &referralCode,
		&boutsUsed, &createdAt, &updatedAt)
	if err == sql.ErrNoRows {
		return fmt.Errorf("user %q not found", userID)
	}
	if err != nil {
		return err
	}

	// Credits.
	var balanceMicro int64
	err = conn.QueryVal(ctx, &balanceMicro,
		`SELECT COALESCE(balance_micro, 0) FROM credits WHERE user_id = $1`, userID)
	if err == sql.ErrNoRows {
		balanceMicro = 0
	} else if err != nil {
		return err
	}

	// Bout count.
	var boutCount int64
	conn.QueryVal(ctx, &boutCount, `SELECT COUNT(*) FROM bouts WHERE owner_id = $1`, userID)

	fmt.Println()
	fmt.Println(theme.Title.Render("user detail"))
	fmt.Println()

	kv := func(label, value string) {
		fmt.Printf("  %-24s %s\n", theme.Muted.Render(label), theme.Value.Render(value))
	}

	kv("ID", id)
	kv("Email", nullStr(email))
	kv("Display Name", nullStr(displayName))
	kv("Tier", tier)
	kv("Subscription Status", nullStr(subStatus))
	kv("Stripe Customer", nullStr(stripeID))
	kv("Referral Code", nullStr(referralCode))
	kv("Credits", format.Credits(balanceMicro))
	kv("Bouts (owned)", format.Num(boutCount))
	kv("Free Bouts Used", fmt.Sprintf("%d", boutsUsed))
	kv("Joined", format.DateTime(createdAt))
	kv("Updated", format.DateTime(updatedAt))

	// Recent transactions.
	fmt.Println()
	fmt.Println(theme.Accent.Render("  recent transactions"))
	fmt.Println()

	txRows, err := conn.DB.QueryContext(ctx, `
		SELECT delta_micro, source, created_at
		FROM credit_transactions
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT 10`, userID)
	if err != nil {
		return err
	}
	defer txRows.Close()

	var txTableRows [][]string
	for txRows.Next() {
		var delta int64
		var source string
		var txTime time.Time
		if err := txRows.Scan(&delta, &source, &txTime); err != nil {
			return err
		}
		txTableRows = append(txTableRows, []string{
			format.Credits(delta),
			source,
			format.RelativeTime(txTime),
		})
	}

	if len(txTableRows) == 0 {
		fmt.Println(theme.Muted.Render("  No transactions."))
	} else {
		t := table.New().
			Border(lipgloss.RoundedBorder()).
			BorderStyle(theme.BorderStyle()).
			Headers("Delta", "Source", "When").
			Rows(txTableRows...).
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
	}

	fmt.Println()
	return nil
}

// RunUsersSetTier changes a user's subscription tier.
func RunUsersSetTier(cfg *config.Config, userID, newTier string, confirmed bool) error {
	validTiers := map[string]bool{"free": true, "pass": true, "lab": true}
	if !validTiers[newTier] {
		return fmt.Errorf("invalid tier %q — must be one of: free, pass, lab", newTier)
	}

	conn, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer conn.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Verify user exists.
	var currentTier string
	err = conn.QueryVal(ctx, &currentTier, `SELECT subscription_tier FROM users WHERE id = $1`, userID)
	if err == sql.ErrNoRows {
		return fmt.Errorf("user %q not found", userID)
	}
	if err != nil {
		return err
	}

	if currentTier == newTier {
		fmt.Printf("\n  %s\n\n", theme.Muted.Render(fmt.Sprintf("User already on %q tier, no change.", newTier)))
		return nil
	}

	if !confirmed {
		return fmt.Errorf("changing tier from %q to %q requires --yes flag", currentTier, newTier)
	}

	_, err = conn.DB.ExecContext(ctx, `
		UPDATE users SET subscription_tier = $1, updated_at = NOW() WHERE id = $2`,
		newTier, userID)
	if err != nil {
		return err
	}

	fmt.Printf("\n  %s\n\n",
		theme.Success.Render(fmt.Sprintf("User %s tier changed: %s -> %s", format.TruncateID(userID), currentTier, newTier)))
	return nil
}

func truncStr(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max-3] + "..."
}

func nullStr(ns sql.NullString) string {
	if ns.Valid {
		return ns.String
	}
	return "-"
}
