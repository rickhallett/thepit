package cmd

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/rickhallett/thepit/shared/config"
	"github.com/rickhallett/thepit/shared/db"
	"github.com/rickhallett/thepit/shared/theme"
)

// RunExportBouts exports completed bouts as JSONL.
func RunExportBouts(cfg *config.Config, since string) error {
	conn, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer conn.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 120*time.Second)
	defer cancel()

	query := `
		SELECT id, preset_id, status, transcript, agent_lineup, owner_id,
		       topic, share_line, created_at
		FROM bouts
		WHERE status = 'completed'`
	var args []interface{}

	if since != "" {
		query += ` AND created_at >= $1`
		args = append(args, since)
	}
	query += ` ORDER BY created_at ASC`

	rows, err := conn.DB.QueryContext(ctx, query, args...)
	if err != nil {
		return fmt.Errorf("querying bouts: %w", err)
	}
	defer rows.Close()

	outPath, err := exportPath("bouts", "jsonl")
	if err != nil {
		return err
	}
	f, err := os.Create(outPath)
	if err != nil {
		return err
	}
	defer f.Close()

	enc := json.NewEncoder(f)
	count := 0

	for rows.Next() {
		var id, presetID, status string
		var transcript, agentLineup json.RawMessage
		var ownerID, topic, shareLine sql.NullString
		var createdAt time.Time

		if err := rows.Scan(&id, &presetID, &status, &transcript, &agentLineup,
			&ownerID, &topic, &shareLine, &createdAt); err != nil {
			return err
		}

		record := map[string]interface{}{
			"id":           id,
			"preset_id":    presetID,
			"status":       status,
			"transcript":   transcript,
			"agent_lineup": agentLineup,
			"owner_id":     nullVal(ownerID),
			"topic":        nullVal(topic),
			"share_line":   nullVal(shareLine),
			"created_at":   createdAt.Format(time.RFC3339),
		}

		if err := enc.Encode(record); err != nil {
			return err
		}
		count++
	}

	fmt.Printf("\n  %s\n\n",
		theme.Success.Render(fmt.Sprintf("Exported %d bouts to %s", count, outPath)))
	return nil
}

// RunExportAgents exports agents as JSON array.
func RunExportAgents(cfg *config.Config) error {
	conn, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer conn.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	rows, err := conn.DB.QueryContext(ctx, `
		SELECT id, name, tier, system_prompt, preset_id, owner_id, parent_id,
		       prompt_hash, manifest_hash, attestation_uid, archived, created_at
		FROM agents ORDER BY created_at ASC`)
	if err != nil {
		return fmt.Errorf("querying agents: %w", err)
	}
	defer rows.Close()

	var agents []map[string]interface{}

	for rows.Next() {
		var id, name, tier, systemPrompt, promptHash, manifestHash string
		var presetID, ownerID, parentID, attestationUID sql.NullString
		var archived bool
		var createdAt time.Time

		if err := rows.Scan(&id, &name, &tier, &systemPrompt, &presetID, &ownerID, &parentID,
			&promptHash, &manifestHash, &attestationUID, &archived, &createdAt); err != nil {
			return err
		}

		agents = append(agents, map[string]interface{}{
			"id":              id,
			"name":            name,
			"tier":            tier,
			"system_prompt":   systemPrompt,
			"preset_id":       nullVal(presetID),
			"owner_id":        nullVal(ownerID),
			"parent_id":       nullVal(parentID),
			"prompt_hash":     promptHash,
			"manifest_hash":   manifestHash,
			"attestation_uid": nullVal(attestationUID),
			"archived":        archived,
			"created_at":      createdAt.Format(time.RFC3339),
		})
	}

	outPath, err := exportPath("agents", "json")
	if err != nil {
		return err
	}

	data, err := json.MarshalIndent(agents, "", "  ")
	if err != nil {
		return err
	}

	if err := os.WriteFile(outPath, data, 0644); err != nil {
		return err
	}

	fmt.Printf("\n  %s\n\n",
		theme.Success.Render(fmt.Sprintf("Exported %d agents to %s", len(agents), outPath)))
	return nil
}

func exportPath(dataType, ext string) (string, error) {
	dir := "export"
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", fmt.Errorf("creating export dir: %w", err)
	}
	filename := fmt.Sprintf("%s_%s.%s", time.Now().Format("2006-01-02"), dataType, ext)
	return filepath.Join(dir, filename), nil
}

func nullVal(ns sql.NullString) interface{} {
	if ns.Valid {
		return ns.String
	}
	return nil
}
