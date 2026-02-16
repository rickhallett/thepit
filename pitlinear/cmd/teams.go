package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"text/tabwriter"

	"github.com/rickhallett/thepit/shared/theme"
)

// RunTeams lists all Linear teams.
func RunTeams(client *Client, jsonOut bool) error {
	teams, err := client.Teams()
	if err != nil {
		return err
	}

	if jsonOut {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(teams)
	}

	fmt.Fprintf(os.Stderr, "\n%s\n\n", theme.Title.Render("Linear Teams"))

	w := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)
	fmt.Fprintf(w, "%s\t%s\t%s\n",
		theme.Bold.Render("KEY"),
		theme.Bold.Render("NAME"),
		theme.Bold.Render("ID"),
	)
	for _, t := range teams {
		fmt.Fprintf(w, "%s\t%s\t%s\n",
			theme.Accent.Render(t.Key),
			t.Name,
			theme.Muted.Render(t.ID),
		)
	}
	w.Flush()
	fmt.Println()
	return nil
}

// RunStates lists workflow states for a team.
func RunStates(client *Client, teamKey string, jsonOut bool) error {
	team, err := client.TeamByKey(teamKey)
	if err != nil {
		return err
	}

	states, err := client.States(team.ID)
	if err != nil {
		return err
	}

	if jsonOut {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(states)
	}

	fmt.Fprintf(os.Stderr, "\n%s\n\n", theme.Title.Render(fmt.Sprintf("Workflow States — %s", team.Key)))

	w := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)
	fmt.Fprintf(w, "%s\t%s\t%s\n",
		theme.Bold.Render("NAME"),
		theme.Bold.Render("TYPE"),
		theme.Bold.Render("ID"),
	)
	for _, s := range states {
		fmt.Fprintf(w, "%s\t%s\t%s\n",
			s.Name,
			theme.Muted.Render(s.Type),
			theme.Muted.Render(s.ID),
		)
	}
	w.Flush()
	fmt.Println()
	return nil
}
