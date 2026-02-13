package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/rickhallett/thepit/shared/theme"
)

// PresetIndex represents the presets/index.json structure.
type PresetIndex struct {
	Version string        `json:"version"`
	Presets []PresetEntry `json:"presets"`
}

// PresetEntry is a single entry in the preset index.
type PresetEntry struct {
	ID            string `json:"id"`
	File          string `json:"file"`
	Hero          bool   `json:"hero"`
	Agents        int    `json:"agents"`
	RequiresInput bool   `json:"requires_input"`
}

// PresetFile represents a full preset JSON file.
type PresetFile struct {
	PresetID    string        `json:"preset_id"`
	Name        string        `json:"name"`
	Description string        `json:"description"`
	Agents      []PresetAgent `json:"agents"`
	TurnOrder   string        `json:"turn_order"`
	MaxTurns    struct {
		Standard  int `json:"standard"`
		Juiced    int `json:"juiced"`
		Unleashed int `json:"unleashed"`
	} `json:"max_turns"`
}

// PresetAgent is an agent within a preset.
type PresetAgent struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	SystemPrompt string `json:"system_prompt"`
	Color        string `json:"color"`
	Avatar       string `json:"avatar"`
}

// RunCatalog implements the "catalog" command.
func RunCatalog(args []string) {
	// Find presets directory relative to cwd.
	presetsDir := findPresetsDir()
	if presetsDir == "" {
		fmt.Fprintf(os.Stderr, "\n  %s cannot find presets/ directory\n", theme.Error.Render("error:"))
		fmt.Fprintf(os.Stderr, "  Looked in: ./presets, ../presets, ../../presets\n\n")
		os.Exit(1)
	}

	indexPath := filepath.Join(presetsDir, "index.json")
	data, err := os.ReadFile(indexPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "\n  %s reading index.json: %v\n\n", theme.Error.Render("error:"), err)
		os.Exit(1)
	}

	var index PresetIndex
	if err := json.Unmarshal(data, &index); err != nil {
		fmt.Fprintf(os.Stderr, "\n  %s parsing index.json: %v\n\n", theme.Error.Render("error:"), err)
		os.Exit(1)
	}

	// If a specific preset is requested, show details.
	if len(args) > 0 {
		showPresetDetail(presetsDir, args[0], &index)
		return
	}

	// List all presets.
	fmt.Printf("\n  %s\n\n", theme.Title.Render("Preset Catalog"))
	fmt.Printf("  %-20s %-8s %-6s %s\n",
		theme.Muted.Render("ID"),
		theme.Muted.Render("Agents"),
		theme.Muted.Render("Hero"),
		theme.Muted.Render("File"))
	fmt.Printf("  %s\n", strings.Repeat("─", 60))

	for _, p := range index.Presets {
		hero := " "
		if p.Hero {
			hero = "★"
		}
		fmt.Printf("  %-20s %-8d %-6s %s\n", p.ID, p.Agents, hero, p.File)
	}
	fmt.Printf("\n  %s %d presets (v%s)\n", theme.Muted.Render("total:"), len(index.Presets), index.Version)
	fmt.Printf("  %s pitforge catalog <preset-id> for details\n\n", theme.Muted.Render("hint:"))
}

func showPresetDetail(presetsDir, id string, index *PresetIndex) {
	// Find the preset entry.
	var entry *PresetEntry
	for i := range index.Presets {
		if index.Presets[i].ID == id {
			entry = &index.Presets[i]
			break
		}
	}
	if entry == nil {
		fmt.Fprintf(os.Stderr, "\n  %s unknown preset %q\n\n", theme.Error.Render("error:"), id)
		os.Exit(1)
	}

	// Load the preset file.
	path := filepath.Join(presetsDir, entry.File)
	data, err := os.ReadFile(path)
	if err != nil {
		fmt.Fprintf(os.Stderr, "\n  %s reading %s: %v\n\n", theme.Error.Render("error:"), entry.File, err)
		os.Exit(1)
	}

	var preset PresetFile
	if err := json.Unmarshal(data, &preset); err != nil {
		fmt.Fprintf(os.Stderr, "\n  %s parsing %s: %v\n\n", theme.Error.Render("error:"), entry.File, err)
		os.Exit(1)
	}

	fmt.Printf("\n  %s\n", theme.Title.Render(preset.Name))
	fmt.Printf("  %s\n\n", preset.Description)

	fmt.Printf("  %-20s %s\n", theme.Muted.Render("preset_id:"), preset.PresetID)
	fmt.Printf("  %-20s %s\n", theme.Muted.Render("turn_order:"), preset.TurnOrder)
	fmt.Printf("  %-20s %d / %d / %d\n", theme.Muted.Render("max_turns:"),
		preset.MaxTurns.Standard, preset.MaxTurns.Juiced, preset.MaxTurns.Unleashed)
	fmt.Printf("  %-20s %d\n\n", theme.Muted.Render("agents:"), len(preset.Agents))

	for _, a := range preset.Agents {
		fmt.Printf("  %s %s\n", theme.Warning.Render("▸"), a.Name)
		fmt.Printf("    %-14s %s\n", theme.Muted.Render("id:"), a.ID)
		fmt.Printf("    %-14s %s\n", theme.Muted.Render("color:"), a.Color)
		fmt.Printf("    %-14s %s\n", theme.Muted.Render("avatar:"), a.Avatar)

		// Show truncated system prompt.
		sp := strings.ReplaceAll(a.SystemPrompt, "\n", " ")
		runes := []rune(sp)
		if len(runes) > 100 {
			sp = string(runes[:97]) + "..."
		}
		fmt.Printf("    %-14s %s\n\n", theme.Muted.Render("prompt:"), sp)
	}
}

func findPresetsDir() string {
	candidates := []string{
		"presets",
		"../presets",
		"../../presets",
	}
	for _, c := range candidates {
		abs, err := filepath.Abs(c)
		if err != nil {
			continue
		}
		if info, err := os.Stat(abs); err == nil && info.IsDir() {
			return abs
		}
	}
	return ""
}
