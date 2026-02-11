package cmd

import (
	"database/sql"
	"fmt"
	"os"

	"github.com/rickhallett/thepit/shared/config"
	"github.com/rickhallett/thepit/shared/db"
	"github.com/rickhallett/thepit/shared/theme"
)

// lineageNode is an agent in the lineage tree.
type lineageNode struct {
	ID       string
	Name     string
	ParentID sql.NullString
	Tier     string
	Children []*lineageNode
}

// RunLineage implements the "lineage" command.
func RunLineage(args []string, cfg *config.Config) {
	if len(args) == 0 {
		fmt.Fprintf(os.Stderr, "%s lineage requires an agentId argument\n", theme.Error.Render("error:"))
		fmt.Fprintf(os.Stderr, "\n  Usage: pitforge lineage <agentId>\n\n")
		os.Exit(1)
	}

	agentID := args[0]

	conn, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		fmt.Fprintf(os.Stderr, "\n  %s connecting to database: %v\n\n", theme.Error.Render("error:"), err)
		os.Exit(1)
	}
	defer conn.Close()

	// Find the root of this agent's lineage chain.
	rootID, err := findRoot(conn, agentID)
	if err != nil {
		fmt.Fprintf(os.Stderr, "\n  %s %v\n\n", theme.Error.Render("error:"), err)
		os.Exit(1)
	}

	// Load all agents in this lineage tree.
	nodes, err := loadLineage(conn, rootID)
	if err != nil {
		fmt.Fprintf(os.Stderr, "\n  %s loading lineage: %v\n\n", theme.Error.Render("error:"), err)
		os.Exit(1)
	}

	if len(nodes) == 0 {
		fmt.Fprintf(os.Stderr, "\n  %s no agents found for lineage starting at %s\n\n",
			theme.Error.Render("error:"), rootID)
		os.Exit(1)
	}

	// Build tree.
	nodeMap := make(map[string]*lineageNode)
	for i := range nodes {
		nodeMap[nodes[i].ID] = &nodes[i]
	}

	var roots []*lineageNode
	for i := range nodes {
		n := &nodes[i]
		if n.ParentID.Valid {
			if parent, ok := nodeMap[n.ParentID.String]; ok {
				parent.Children = append(parent.Children, n)
			} else {
				roots = append(roots, n)
			}
		} else {
			roots = append(roots, n)
		}
	}

	// Print tree.
	fmt.Printf("\n  %s\n\n", theme.Title.Render("Agent Lineage Tree"))
	for _, root := range roots {
		printTree(root, "", true, agentID)
	}
	fmt.Println()
}

func findRoot(conn *db.DB, agentID string) (string, error) {
	current := agentID
	for {
		var parentID sql.NullString
		err := conn.QueryRow(
			"SELECT parent_id FROM agents WHERE id = $1", current,
		).Scan(&parentID)
		if err == sql.ErrNoRows {
			return "", fmt.Errorf("agent %q not found", current)
		}
		if err != nil {
			return "", err
		}
		if !parentID.Valid {
			return current, nil
		}
		current = parentID.String
	}
}

func loadLineage(conn *db.DB, rootID string) ([]lineageNode, error) {
	// Use a recursive CTE to get all descendants.
	rows, err := conn.Query(`
		WITH RECURSIVE lineage AS (
			SELECT id, name, parent_id, tier
			FROM agents
			WHERE id = $1
			UNION ALL
			SELECT a.id, a.name, a.parent_id, a.tier
			FROM agents a
			INNER JOIN lineage l ON a.parent_id = l.id
		)
		SELECT id, name, parent_id, tier FROM lineage
		ORDER BY id
	`, rootID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var nodes []lineageNode
	for rows.Next() {
		var n lineageNode
		if err := rows.Scan(&n.ID, &n.Name, &n.ParentID, &n.Tier); err != nil {
			return nil, err
		}
		nodes = append(nodes, n)
	}
	return nodes, rows.Err()
}

func printTree(node *lineageNode, prefix string, isLast bool, highlightID string) {
	connector := "├── "
	if isLast {
		connector = "└── "
	}

	// Highlight the queried agent.
	nameStyle := theme.Value
	if node.ID == highlightID {
		nameStyle = theme.Bold
	}

	tierBadge := theme.Muted.Render("[" + node.Tier + "]")

	idTrunc := node.ID
	if len(idTrunc) > 20 {
		idTrunc = idTrunc[:17] + "..."
	}

	fmt.Printf("  %s%s%s %s %s\n",
		prefix, connector,
		nameStyle.Render(node.Name),
		tierBadge,
		theme.Muted.Render(idTrunc))

	childPrefix := prefix + "│   "
	if isLast {
		childPrefix = prefix + "    "
	}

	for i, child := range node.Children {
		printTree(child, childPrefix, i == len(node.Children)-1, highlightID)
	}
}
