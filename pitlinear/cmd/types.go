// Package cmd implements pitlinear commands and the Linear GraphQL client.
package cmd

// Team represents a Linear team.
type Team struct {
	ID     string  `json:"id"`
	Name   string  `json:"name"`
	Key    string  `json:"key"`
	States []State `json:"states,omitempty"`
	Labels []Label `json:"labels,omitempty"`
}

// State represents a Linear workflow state.
type State struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Type string `json:"type"` // backlog, unstarted, started, completed, canceled
}

// Label represents a Linear issue label.
type Label struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// Issue represents a Linear issue.
type Issue struct {
	ID         string `json:"id"`
	Identifier string `json:"identifier"`
	Title      string `json:"title"`
	Priority   int    `json:"priority"`
	URL        string `json:"url"`
	StateName  string `json:"state"`
	TeamID     string `json:"teamId,omitempty"`
}

// Comment represents a Linear comment.
type Comment struct {
	ID        string `json:"id"`
	Body      string `json:"body"`
	CreatedAt string `json:"createdAt"`
	UserName  string `json:"userName,omitempty"`
}

// IssueInput is used to create issues.
type IssueInput struct {
	TeamKey  string
	Title    string
	Desc     string
	Priority string // none, urgent, high, medium, low
	Labels   []string
	State    string
	ParentID string // resolved UUID
}

// IssueUpdateInput is used to update issues.
type IssueUpdateInput struct {
	Title    *string
	Desc     *string
	Priority *string
	State    *string
	Labels   []string
	ParentID *string
}

// ListOpts controls issue listing.
type ListOpts struct {
	State string
	Label string
	Limit int
}

// PriorityMap maps human names to Linear priority integers.
var PriorityMap = map[string]int{
	"none":   0,
	"urgent": 1,
	"high":   2,
	"medium": 3,
	"low":    4,
}

// PriorityName maps integers back to names.
var PriorityName = map[int]string{
	0: "None",
	1: "Urgent",
	2: "High",
	3: "Medium",
	4: "Low",
}

// Ptr returns a pointer to the given string.
func Ptr(s string) *string { return &s }
