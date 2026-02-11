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

// AgentsListOpts configures the agents list command.
type AgentsListOpts struct {
	Archived bool
	Flagged  bool
	Limit    int
}

// RunAgentsList displays agents.
func RunAgentsList(cfg *config.Config, opts AgentsListOpts) error {
	conn, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer conn.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if opts.Limit <= 0 {
		opts.Limit = 50
	}

	var query string
	var args []interface{}

	if opts.Flagged {
		query = `
			SELECT a.id, a.name, a.tier, a.archived, COUNT(f.id) as flags, a.created_at
			FROM agents a
			INNER JOIN agent_flags f ON f.agent_id = a.id
			GROUP BY a.id, a.name, a.tier, a.archived, a.created_at
			ORDER BY flags DESC
			LIMIT $1`
		args = []interface{}{opts.Limit}
	} else if opts.Archived {
		query = `
			SELECT a.id, a.name, a.tier, a.archived,
			       (SELECT COUNT(*) FROM agent_flags f WHERE f.agent_id = a.id) as flags,
			       a.created_at
			FROM agents a WHERE a.archived = true
			ORDER BY a.created_at DESC LIMIT $1`
		args = []interface{}{opts.Limit}
	} else {
		query = `
			SELECT a.id, a.name, a.tier, a.archived,
			       (SELECT COUNT(*) FROM agent_flags f WHERE f.agent_id = a.id) as flags,
			       a.created_at
			FROM agents a WHERE a.archived = false
			ORDER BY a.created_at DESC LIMIT $1`
		args = []interface{}{opts.Limit}
	}

	rows, err := conn.DB.QueryContext(ctx, query, args...)
	if err != nil {
		return fmt.Errorf("querying agents: %w", err)
	}
	defer rows.Close()

	heading := "agents"
	if opts.Flagged {
		heading = "flagged agents"
	} else if opts.Archived {
		heading = "archived agents"
	}

	fmt.Println()
	fmt.Println(theme.Title.Render(heading))
	fmt.Println()

	var tableRows [][]string
	for rows.Next() {
		var id, name, tier string
		var archived bool
		var flags int64
		var createdAt time.Time

		if err := rows.Scan(&id, &name, &tier, &archived, &flags, &createdAt); err != nil {
			return err
		}

		archStr := ""
		if archived {
			archStr = "yes"
		}

		tableRows = append(tableRows, []string{
			truncStr(id, 20),
			truncStr(name, 20),
			tier,
			archStr,
			fmt.Sprintf("%d", flags),
			format.Date(createdAt),
		})
	}

	if len(tableRows) == 0 {
		fmt.Println(theme.Muted.Render("  No agents found."))
		fmt.Println()
		return nil
	}

	t := table.New().
		Border(lipgloss.RoundedBorder()).
		BorderStyle(theme.BorderStyle()).
		Headers("ID", "Name", "Tier", "Archived", "Flags", "Created").
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
			case 4:
				return base.Foreground(theme.ColorFg).Align(lipgloss.Right)
			default:
				return base.Foreground(theme.ColorFg)
			}
		})

	fmt.Println(t.Render())
	fmt.Println()
	return nil
}

// RunAgentsInspect shows full detail for a single agent.
func RunAgentsInspect(cfg *config.Config, agentID string) error {
	conn, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer conn.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var id, name, tier, promptHash, manifestHash string
	var systemPrompt string
	var presetID, ownerID, parentID, attestationUID sql.NullString
	var archived bool
	var createdAt time.Time

	err = conn.DB.QueryRowContext(ctx, `
		SELECT id, name, system_prompt, tier, preset_id, owner_id, parent_id,
		       prompt_hash, manifest_hash, attestation_uid, archived, created_at
		FROM agents WHERE id = $1`, agentID).Scan(
		&id, &name, &systemPrompt, &tier, &presetID, &ownerID, &parentID,
		&promptHash, &manifestHash, &attestationUID, &archived, &createdAt)
	if err == sql.ErrNoRows {
		return fmt.Errorf("agent %q not found", agentID)
	}
	if err != nil {
		return err
	}

	// Flag count.
	var flagCount int64
	conn.QueryVal(ctx, &flagCount, `SELECT COUNT(*) FROM agent_flags WHERE agent_id = $1`, agentID)

	// Bout appearances.
	var boutCount int64
	conn.QueryVal(ctx, &boutCount,
		`SELECT COUNT(*) FROM bouts WHERE agent_lineup::text LIKE '%' || $1 || '%'`, agentID)

	fmt.Println()
	fmt.Println(theme.Title.Render("agent detail"))
	fmt.Println()

	kv := func(label, value string) {
		fmt.Printf("  %-24s %s\n", theme.Muted.Render(label), theme.Value.Render(value))
	}

	kv("ID", id)
	kv("Name", name)
	kv("Tier", tier)
	kv("Preset", nullStr(presetID))
	kv("Owner", nullStr(ownerID))
	kv("Parent", nullStr(parentID))
	kv("Archived", fmt.Sprintf("%v", archived))
	kv("Flags", format.Num(flagCount))
	kv("Bout Appearances", format.Num(boutCount))
	kv("Prompt Hash", promptHash)
	kv("Manifest Hash", manifestHash)
	kv("Attestation UID", nullStr(attestationUID))
	kv("Created", format.DateTime(createdAt))

	// Truncated system prompt.
	fmt.Println()
	fmt.Println(theme.Accent.Render("  system prompt (first 200 chars)"))
	prompt := systemPrompt
	if len(prompt) > 200 {
		prompt = prompt[:200] + "..."
	}
	fmt.Printf("  %s\n", theme.Muted.Render(prompt))
	fmt.Println()

	return nil
}

// RunAgentsArchive sets the archived flag on an agent.
func RunAgentsArchive(cfg *config.Config, agentID string, confirmed bool) error {
	return setAgentArchived(cfg, agentID, true, confirmed)
}

// RunAgentsRestore clears the archived flag on an agent.
func RunAgentsRestore(cfg *config.Config, agentID string, confirmed bool) error {
	return setAgentArchived(cfg, agentID, false, confirmed)
}

func setAgentArchived(cfg *config.Config, agentID string, archived bool, confirmed bool) error {
	conn, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer conn.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Verify agent exists.
	var name string
	err = conn.QueryVal(ctx, &name, `SELECT name FROM agents WHERE id = $1`, agentID)
	if err == sql.ErrNoRows {
		return fmt.Errorf("agent %q not found", agentID)
	}
	if err != nil {
		return err
	}

	action := "archive"
	if !archived {
		action = "restore"
	}

	if !confirmed {
		return fmt.Errorf("%s agent %q (%s) requires --yes flag", action, name, agentID)
	}

	_, err = conn.DB.ExecContext(ctx,
		`UPDATE agents SET archived = $1 WHERE id = $2`, archived, agentID)
	if err != nil {
		return err
	}

	msg := fmt.Sprintf("Agent %q %sd", name, action)
	fmt.Printf("\n  %s\n\n", theme.Success.Render(msg))
	return nil
}
