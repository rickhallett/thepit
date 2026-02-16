package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"text/tabwriter"

	"github.com/rickhallett/thepit/shared/theme"
)

// RunLabels lists labels for a team.
func RunLabels(client *Client, teamKey string, jsonOut bool) error {
	team, err := client.TeamByKey(teamKey)
	if err != nil {
		return err
	}

	labels, err := client.Labels(team.ID)
	if err != nil {
		return err
	}

	if jsonOut {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(labels)
	}

	fmt.Fprintf(os.Stderr, "\n%s\n\n", theme.Title.Render(fmt.Sprintf("Labels — %s", team.Key)))

	w := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)
	fmt.Fprintf(w, "%s\t%s\n",
		theme.Bold.Render("NAME"),
		theme.Bold.Render("ID"),
	)
	for _, l := range labels {
		fmt.Fprintf(w, "%s\t%s\n",
			l.Name,
			theme.Muted.Render(l.ID),
		)
	}
	w.Flush()
	fmt.Println()
	return nil
}
