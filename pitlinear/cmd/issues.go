package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"text/tabwriter"

	"github.com/rickhallett/thepit/shared/theme"
)

// RunIssueCreate creates a new issue.
func RunIssueCreate(client *Client, input IssueInput, jsonOut bool) error {
	issue, err := client.IssueCreate(input)
	if err != nil {
		return err
	}

	if jsonOut {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(issue)
	}

	fmt.Fprintf(os.Stderr, "\n%s %s\n",
		theme.Success.Render("created"),
		theme.Bold.Render(issue.Identifier),
	)
	printIssue(issue)
	return nil
}

// RunIssueGet retrieves an issue by identifier (e.g. "OCE-22") or UUID.
func RunIssueGet(client *Client, ref string, jsonOut bool) error {
	var issue *Issue
	var err error

	if strings.Contains(ref, "-") && !strings.Contains(ref, " ") && len(ref) < 20 {
		issue, err = client.IssueGetByIdentifier(ref)
	} else {
		issue, err = client.IssueGet(ref)
	}
	if err != nil {
		return err
	}

	if jsonOut {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(issue)
	}

	printIssue(issue)
	return nil
}

// RunIssueUpdate updates an issue.
func RunIssueUpdate(client *Client, ref string, input IssueUpdateInput, teamKey string, jsonOut bool) error {
	// Resolve ref to UUID.
	id := ref
	var teamID string

	if strings.Contains(ref, "-") && !strings.Contains(ref, " ") && len(ref) < 20 {
		resolved, err := client.resolveIdentifier(ref)
		if err != nil {
			return err
		}
		id = resolved
	}

	// Resolve team for state/label lookups.
	if teamKey != "" {
		team, err := client.TeamByKey(teamKey)
		if err != nil {
			return err
		}
		teamID = team.ID
	} else if strings.Contains(ref, "-") {
		parts := strings.SplitN(ref, "-", 2)
		team, err := client.TeamByKey(parts[0])
		if err != nil {
			return err
		}
		teamID = team.ID
	}

	issue, err := client.IssueUpdate(id, input, teamID)
	if err != nil {
		return err
	}

	if jsonOut {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(issue)
	}

	fmt.Fprintf(os.Stderr, "\n%s %s\n",
		theme.Success.Render("updated"),
		theme.Bold.Render(issue.Identifier),
	)
	printIssue(issue)
	return nil
}

// RunIssueList lists issues for a team.
func RunIssueList(client *Client, teamKey string, opts ListOpts, jsonOut bool) error {
	team, err := client.TeamByKey(teamKey)
	if err != nil {
		return err
	}

	issues, err := client.IssueList(team.ID, opts)
	if err != nil {
		return err
	}

	if jsonOut {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(issues)
	}

	fmt.Fprintf(os.Stderr, "\n%s\n\n",
		theme.Title.Render(fmt.Sprintf("Issues — %s (%d)", team.Key, len(issues))),
	)

	w := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)
	fmt.Fprintf(w, "%s\t%s\t%s\t%s\n",
		theme.Bold.Render("ID"),
		theme.Bold.Render("PRIORITY"),
		theme.Bold.Render("STATE"),
		theme.Bold.Render("TITLE"),
	)
	for _, iss := range issues {
		pName := PriorityName[iss.Priority]
		pStyle := theme.Muted
		switch iss.Priority {
		case 1:
			pStyle = theme.Error
		case 2:
			pStyle = theme.Warning
		case 3:
			pStyle = theme.Value
		}
		fmt.Fprintf(w, "%s\t%s\t%s\t%s\n",
			theme.Accent.Render(iss.Identifier),
			pStyle.Render(pName),
			iss.StateName,
			iss.Title,
		)
	}
	w.Flush()
	fmt.Println()
	return nil
}

// RunIssueDelete deletes an issue by identifier or UUID.
func RunIssueDelete(client *Client, ref string) error {
	id := ref
	if strings.Contains(ref, "-") && !strings.Contains(ref, " ") && len(ref) < 20 {
		resolved, err := client.resolveIdentifier(ref)
		if err != nil {
			return err
		}
		id = resolved
	}

	if err := client.IssueDelete(id); err != nil {
		return err
	}

	fmt.Fprintf(os.Stderr, "\n%s %s\n\n",
		theme.Success.Render("deleted"),
		ref,
	)
	return nil
}

// RunIssueSetParent sets the parent of an issue.
func RunIssueSetParent(client *Client, childRef, parentRef string) error {
	childID := childRef
	if strings.Contains(childRef, "-") && !strings.Contains(childRef, " ") && len(childRef) < 20 {
		resolved, err := client.resolveIdentifier(childRef)
		if err != nil {
			return fmt.Errorf("resolve child %q: %w", childRef, err)
		}
		childID = resolved
	}

	parentID := parentRef
	if strings.Contains(parentRef, "-") && !strings.Contains(parentRef, " ") && len(parentRef) < 20 {
		resolved, err := client.resolveIdentifier(parentRef)
		if err != nil {
			return fmt.Errorf("resolve parent %q: %w", parentRef, err)
		}
		parentID = resolved
	}

	_, err := client.IssueSetParent(childID, parentID)
	if err != nil {
		return err
	}

	fmt.Fprintf(os.Stderr, "\n%s %s → parent %s\n\n",
		theme.Success.Render("linked"),
		childRef,
		parentRef,
	)
	return nil
}

// printIssue renders a single issue to stderr.
func printIssue(iss *Issue) {
	pName := PriorityName[iss.Priority]
	fmt.Fprintf(os.Stderr, "  %s  %s\n", theme.Accent.Render(iss.Identifier), iss.Title)
	fmt.Fprintf(os.Stderr, "  %s %s  %s %s\n",
		theme.Muted.Render("priority:"), pName,
		theme.Muted.Render("state:"), iss.StateName,
	)
	fmt.Fprintf(os.Stderr, "  %s %s\n\n", theme.Muted.Render("url:"), iss.URL)
}
