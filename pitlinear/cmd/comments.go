package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"

	"github.com/rickhallett/thepit/shared/theme"
)

// RunCommentAdd adds a comment to an issue.
func RunCommentAdd(client *Client, ref, body string, jsonOut bool) error {
	id := ref
	if strings.Contains(ref, "-") && !strings.Contains(ref, " ") && len(ref) < 20 {
		resolved, err := client.resolveIdentifier(ref)
		if err != nil {
			return err
		}
		id = resolved
	}

	comment, err := client.CommentAdd(id, body)
	if err != nil {
		return err
	}

	if jsonOut {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(comment)
	}

	fmt.Fprintf(os.Stderr, "\n%s comment on %s\n",
		theme.Success.Render("added"),
		theme.Bold.Render(ref),
	)
	fmt.Fprintf(os.Stderr, "  %s\n\n", theme.Muted.Render(comment.ID))
	return nil
}

// RunCommentList lists comments on an issue.
func RunCommentList(client *Client, ref string, jsonOut bool) error {
	id := ref
	if strings.Contains(ref, "-") && !strings.Contains(ref, " ") && len(ref) < 20 {
		resolved, err := client.resolveIdentifier(ref)
		if err != nil {
			return err
		}
		id = resolved
	}

	comments, err := client.CommentList(id)
	if err != nil {
		return err
	}

	if jsonOut {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(comments)
	}

	fmt.Fprintf(os.Stderr, "\n%s\n\n",
		theme.Title.Render(fmt.Sprintf("Comments — %s (%d)", ref, len(comments))),
	)

	for _, c := range comments {
		author := c.UserName
		if author == "" {
			author = "unknown"
		}
		fmt.Fprintf(os.Stderr, "  %s  %s  %s\n",
			theme.Accent.Render(author),
			theme.Muted.Render(c.CreatedAt),
			theme.Muted.Render(c.ID),
		)
		// Indent body lines.
		for _, line := range strings.Split(c.Body, "\n") {
			fmt.Fprintf(os.Stderr, "    %s\n", line)
		}
		fmt.Fprintln(os.Stderr)
	}
	return nil
}
