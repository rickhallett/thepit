package cmd

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"
)

const linearAPI = "https://api.linear.app/graphql"

// Client communicates with the Linear GraphQL API.
type Client struct {
	apiKey      string
	baseURL     string // overridable for tests
	http        *http.Client
	cache       *DiskCache
	teamsCache  []Team             // in-process cache
	statesCache map[string][]State // in-process cache keyed by teamID
	labelsCache map[string][]Label // in-process cache keyed by teamID
}

// NewClient returns a Linear API client with a 10-second timeout.
func NewClient(apiKey string) *Client {
	return &Client{
		apiKey:  apiKey,
		baseURL: linearAPI,
		http: &http.Client{
			Timeout: 10 * time.Second,
		},
		cache:       NewDiskCache(true),
		statesCache: make(map[string][]State),
		labelsCache: make(map[string][]Label),
	}
}

// SetCache replaces the disk cache. Used to disable caching (--no-cache)
// or inject a test cache.
func (c *Client) SetCache(cache *DiskCache) {
	c.cache = cache
}

// --- internal GraphQL execution ---

type gqlRequest struct {
	Query     string         `json:"query"`
	Variables map[string]any `json:"variables,omitempty"`
}

type gqlResponse struct {
	Data   json.RawMessage `json:"data"`
	Errors []struct {
		Message string `json:"message"`
	} `json:"errors"`
}

func (c *Client) do(query string, vars map[string]any) (json.RawMessage, error) {
	body, err := json.Marshal(gqlRequest{Query: query, Variables: vars})
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	req, err := http.NewRequest("POST", c.baseURL, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", c.apiKey)

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("execute request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode == 401 {
		return nil, fmt.Errorf("unauthorized: check LINEAR_API_KEY")
	}
	if resp.StatusCode == 429 {
		return nil, fmt.Errorf("rate limited: try again later")
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(respBody))
	}

	var gql gqlResponse
	if err := json.Unmarshal(respBody, &gql); err != nil {
		return nil, fmt.Errorf("unmarshal response: %w", err)
	}
	if len(gql.Errors) > 0 {
		msgs := make([]string, len(gql.Errors))
		for i, e := range gql.Errors {
			msgs[i] = e.Message
		}
		return nil, fmt.Errorf("graphql: %s", strings.Join(msgs, "; "))
	}

	return gql.Data, nil
}

// --- GraphQL queries ---

const qTeams = `query { teams { nodes { id name key } } }`

const qTeamStates = `query($id: String!) {
  team(id: $id) {
    states { nodes { id name type } }
  }
}`

const qTeamLabels = `query($id: String!) {
  team(id: $id) {
    labels { nodes { id name } }
  }
}`

const qIssueGet = `query($id: String!) {
  issue(id: $id) {
    id identifier title priority url
    state { name }
  }
}`

const qIssueSearch = `query($teamId: ID!, $number: Float!) {
  issues(filter: { team: { id: { eq: $teamId } }, number: { eq: $number } }) {
    nodes { id identifier title priority url state { name } }
  }
}`

const qIssueList = `query($teamId: ID!, $first: Int!, $stateFilter: WorkflowStateFilter, $labelFilter: IssueLabelCollectionFilter) {
  issues(
    filter: { team: { id: { eq: $teamId } }, state: $stateFilter, labels: $labelFilter }
    first: $first
    orderBy: updatedAt
  ) {
    nodes { id identifier title priority url state { name } }
  }
}`

const qCommentList = `query($issueId: String!) {
  issue(id: $issueId) {
    comments { nodes { id body createdAt user { name } } }
  }
}`

const mIssueCreate = `mutation($input: IssueCreateInput!) {
  issueCreate(input: $input) {
    success
    issue { id identifier title priority url state { name } }
  }
}`

const mIssueUpdate = `mutation($id: String!, $input: IssueUpdateInput!) {
  issueUpdate(id: $id, input: $input) {
    success
    issue { id identifier title priority url state { name } }
  }
}`

const mIssueDelete = `mutation($id: String!) {
  issueDelete(id: $id) { success }
}`

const mCommentCreate = `mutation($input: CommentCreateInput!) {
  commentCreate(input: $input) {
    success
    comment { id body createdAt user { name } }
  }
}`

// --- Teams ---

// Teams returns all teams. Results are cached in-process and on disk.
func (c *Client) Teams() ([]Team, error) {
	if c.teamsCache != nil {
		return c.teamsCache, nil
	}

	// Check disk cache.
	if cached := c.cache.Get("teams"); cached != nil {
		var teams []Team
		if json.Unmarshal(cached, &teams) == nil && len(teams) > 0 {
			c.teamsCache = teams
			return teams, nil
		}
	}

	data, err := c.do(qTeams, nil)
	if err != nil {
		return nil, err
	}
	var resp struct {
		Teams struct {
			Nodes []Team `json:"nodes"`
		} `json:"teams"`
	}
	if err := json.Unmarshal(data, &resp); err != nil {
		return nil, fmt.Errorf("parse teams: %w", err)
	}
	c.teamsCache = resp.Teams.Nodes
	c.cache.Set(TTLMetadata, "teams", c.teamsCache)
	return c.teamsCache, nil
}

// TeamByKey finds a team by its key (e.g. "OCE") or name (e.g. "Oceanheartai").
func (c *Client) TeamByKey(key string) (*Team, error) {
	teams, err := c.Teams()
	if err != nil {
		return nil, err
	}
	upper := strings.ToUpper(key)
	lower := strings.ToLower(key)
	for _, t := range teams {
		if strings.ToUpper(t.Key) == upper || strings.ToLower(t.Name) == lower {
			return &t, nil
		}
	}
	return nil, fmt.Errorf("team %q not found", key)
}

// --- States & Labels ---

// States returns workflow states for a team. Cached in-process and on disk.
func (c *Client) States(teamID string) ([]State, error) {
	// In-process cache.
	if cached, ok := c.statesCache[teamID]; ok {
		return cached, nil
	}

	// Disk cache.
	if cached := c.cache.Get("states", teamID); cached != nil {
		var states []State
		if json.Unmarshal(cached, &states) == nil && len(states) > 0 {
			c.statesCache[teamID] = states
			return states, nil
		}
	}

	data, err := c.do(qTeamStates, map[string]any{"id": teamID})
	if err != nil {
		return nil, err
	}
	var resp struct {
		Team struct {
			States struct {
				Nodes []State `json:"nodes"`
			} `json:"states"`
		} `json:"team"`
	}
	if err := json.Unmarshal(data, &resp); err != nil {
		return nil, fmt.Errorf("parse states: %w", err)
	}
	c.statesCache[teamID] = resp.Team.States.Nodes
	c.cache.Set(TTLMetadata, "states", resp.Team.States.Nodes, teamID)
	return resp.Team.States.Nodes, nil
}

// Labels returns labels for a team. Cached in-process and on disk.
func (c *Client) Labels(teamID string) ([]Label, error) {
	// In-process cache.
	if cached, ok := c.labelsCache[teamID]; ok {
		return cached, nil
	}

	// Disk cache.
	if cached := c.cache.Get("labels", teamID); cached != nil {
		var labels []Label
		if json.Unmarshal(cached, &labels) == nil && len(labels) > 0 {
			c.labelsCache[teamID] = labels
			return labels, nil
		}
	}

	data, err := c.do(qTeamLabels, map[string]any{"id": teamID})
	if err != nil {
		return nil, err
	}
	var resp struct {
		Team struct {
			Labels struct {
				Nodes []Label `json:"nodes"`
			} `json:"labels"`
		} `json:"team"`
	}
	if err := json.Unmarshal(data, &resp); err != nil {
		return nil, fmt.Errorf("parse labels: %w", err)
	}
	c.labelsCache[teamID] = resp.Team.Labels.Nodes
	c.cache.Set(TTLMetadata, "labels", resp.Team.Labels.Nodes, teamID)
	return resp.Team.Labels.Nodes, nil
}

// resolveStateID finds a state UUID by name within a team.
func (c *Client) resolveStateID(teamID, name string) (string, error) {
	states, err := c.States(teamID)
	if err != nil {
		return "", err
	}
	lower := strings.ToLower(name)
	for _, s := range states {
		if strings.ToLower(s.Name) == lower {
			return s.ID, nil
		}
	}
	names := make([]string, len(states))
	for i, s := range states {
		names[i] = s.Name
	}
	return "", fmt.Errorf("state %q not found (available: %s)", name, strings.Join(names, ", "))
}

// resolveLabelID finds a label UUID by name within a team.
func (c *Client) resolveLabelID(teamID, name string) (string, error) {
	labels, err := c.Labels(teamID)
	if err != nil {
		return "", err
	}
	lower := strings.ToLower(name)
	for _, l := range labels {
		if strings.ToLower(l.Name) == lower {
			return l.ID, nil
		}
	}
	names := make([]string, len(labels))
	for i, l := range labels {
		names[i] = l.Name
	}
	return "", fmt.Errorf("label %q not found (available: %s)", name, strings.Join(names, ", "))
}

// resolveIdentifier converts "OCE-22" to an issue UUID. Cached on disk.
func (c *Client) resolveIdentifier(identifier string) (string, error) {
	// Check disk cache for identifier → UUID mapping.
	upper := strings.ToUpper(identifier)
	if cached := c.cache.Get("ident", upper); cached != nil {
		var id string
		if json.Unmarshal(cached, &id) == nil && id != "" {
			return id, nil
		}
	}

	parts := strings.SplitN(identifier, "-", 2)
	if len(parts) != 2 {
		return "", fmt.Errorf("invalid identifier %q (expected TEAM-123)", identifier)
	}
	teamKey := parts[0]
	num, err := strconv.ParseFloat(parts[1], 64)
	if err != nil {
		return "", fmt.Errorf("invalid number in identifier %q: %w", identifier, err)
	}

	team, err := c.TeamByKey(teamKey)
	if err != nil {
		return "", err
	}

	data, err := c.do(qIssueSearch, map[string]any{
		"teamId": team.ID,
		"number": num,
	})
	if err != nil {
		return "", err
	}

	var resp struct {
		Issues struct {
			Nodes []struct {
				ID string `json:"id"`
			} `json:"nodes"`
		} `json:"issues"`
	}
	if err := json.Unmarshal(data, &resp); err != nil {
		return "", fmt.Errorf("parse issue search: %w", err)
	}
	if len(resp.Issues.Nodes) == 0 {
		return "", fmt.Errorf("issue %q not found", identifier)
	}

	id := resp.Issues.Nodes[0].ID
	c.cache.Set(TTLIdentifier, "ident", id, upper)
	return id, nil
}

// --- Issues ---

func parseIssue(raw json.RawMessage) (*Issue, error) {
	var data struct {
		ID         string `json:"id"`
		Identifier string `json:"identifier"`
		Title      string `json:"title"`
		Priority   int    `json:"priority"`
		URL        string `json:"url"`
		State      struct {
			Name string `json:"name"`
		} `json:"state"`
	}
	if err := json.Unmarshal(raw, &data); err != nil {
		return nil, err
	}
	return &Issue{
		ID:         data.ID,
		Identifier: data.Identifier,
		Title:      data.Title,
		Priority:   data.Priority,
		URL:        data.URL,
		StateName:  data.State.Name,
	}, nil
}

func parseIssueList(raw json.RawMessage) ([]Issue, error) {
	var items []json.RawMessage
	if err := json.Unmarshal(raw, &items); err != nil {
		return nil, err
	}
	issues := make([]Issue, 0, len(items))
	for _, item := range items {
		iss, err := parseIssue(item)
		if err != nil {
			return nil, err
		}
		issues = append(issues, *iss)
	}
	return issues, nil
}

// IssueGet returns an issue by UUID. Results are cached on disk.
func (c *Client) IssueGet(id string) (*Issue, error) {
	// Check disk cache.
	if cached := c.cache.Get("issue", id); cached != nil {
		var issue Issue
		if json.Unmarshal(cached, &issue) == nil && issue.ID != "" {
			return &issue, nil
		}
	}

	data, err := c.do(qIssueGet, map[string]any{"id": id})
	if err != nil {
		return nil, err
	}
	var resp struct {
		Issue json.RawMessage `json:"issue"`
	}
	if err := json.Unmarshal(data, &resp); err != nil {
		return nil, fmt.Errorf("parse issue: %w", err)
	}
	issue, err := parseIssue(resp.Issue)
	if err != nil {
		return nil, err
	}
	c.cache.Set(TTLIssueRead, "issue", issue, id)
	return issue, nil
}

// IssueGetByIdentifier returns an issue by identifier (e.g. "OCE-22").
func (c *Client) IssueGetByIdentifier(identifier string) (*Issue, error) {
	id, err := c.resolveIdentifier(identifier)
	if err != nil {
		return nil, err
	}
	return c.IssueGet(id)
}

// IssueCreate creates a new issue.
func (c *Client) IssueCreate(input IssueInput) (*Issue, error) {
	team, err := c.TeamByKey(input.TeamKey)
	if err != nil {
		return nil, err
	}

	inp := map[string]any{
		"teamId": team.ID,
		"title":  input.Title,
	}
	if input.Desc != "" {
		inp["description"] = input.Desc
	}
	if input.Priority != "" {
		p, ok := PriorityMap[strings.ToLower(input.Priority)]
		if !ok {
			return nil, fmt.Errorf("unknown priority %q", input.Priority)
		}
		inp["priority"] = p
	}
	if input.State != "" {
		stateID, err := c.resolveStateID(team.ID, input.State)
		if err != nil {
			return nil, err
		}
		inp["stateId"] = stateID
	}
	if len(input.Labels) > 0 {
		ids := make([]string, 0, len(input.Labels))
		for _, name := range input.Labels {
			id, err := c.resolveLabelID(team.ID, name)
			if err != nil {
				return nil, err
			}
			ids = append(ids, id)
		}
		inp["labelIds"] = ids
	}
	if input.ParentID != "" {
		inp["parentId"] = input.ParentID
	}

	data, err := c.do(mIssueCreate, map[string]any{"input": inp})
	if err != nil {
		return nil, err
	}

	var resp struct {
		IssueCreate struct {
			Success bool            `json:"success"`
			Issue   json.RawMessage `json:"issue"`
		} `json:"issueCreate"`
	}
	if err := json.Unmarshal(data, &resp); err != nil {
		return nil, fmt.Errorf("parse create response: %w", err)
	}
	if !resp.IssueCreate.Success {
		return nil, fmt.Errorf("issueCreate returned success=false")
	}
	return parseIssue(resp.IssueCreate.Issue)
}

// IssueUpdate updates an existing issue by UUID.
func (c *Client) IssueUpdate(id string, input IssueUpdateInput, teamID string) (*Issue, error) {
	inp := map[string]any{}
	if input.Title != nil {
		inp["title"] = *input.Title
	}
	if input.Desc != nil {
		inp["description"] = *input.Desc
	}
	if input.Priority != nil {
		p, ok := PriorityMap[strings.ToLower(*input.Priority)]
		if !ok {
			return nil, fmt.Errorf("unknown priority %q", *input.Priority)
		}
		inp["priority"] = p
	}
	if input.State != nil {
		if teamID == "" {
			return nil, fmt.Errorf("teamID required for state updates")
		}
		stateID, err := c.resolveStateID(teamID, *input.State)
		if err != nil {
			return nil, err
		}
		inp["stateId"] = stateID
	}
	if len(input.Labels) > 0 {
		if teamID == "" {
			return nil, fmt.Errorf("teamID required for label updates")
		}
		ids := make([]string, 0, len(input.Labels))
		for _, name := range input.Labels {
			lid, err := c.resolveLabelID(teamID, name)
			if err != nil {
				return nil, err
			}
			ids = append(ids, lid)
		}
		inp["labelIds"] = ids
	}
	if input.ParentID != nil {
		inp["parentId"] = *input.ParentID
	}

	if len(inp) == 0 {
		return nil, fmt.Errorf("no fields to update")
	}

	data, err := c.do(mIssueUpdate, map[string]any{"id": id, "input": inp})
	if err != nil {
		return nil, err
	}

	var resp struct {
		IssueUpdate struct {
			Success bool            `json:"success"`
			Issue   json.RawMessage `json:"issue"`
		} `json:"issueUpdate"`
	}
	if err := json.Unmarshal(data, &resp); err != nil {
		return nil, fmt.Errorf("parse update response: %w", err)
	}
	if !resp.IssueUpdate.Success {
		return nil, fmt.Errorf("issueUpdate returned success=false")
	}
	// Invalidate cached issue data after mutation.
	c.cache.Delete("issue", id)
	return parseIssue(resp.IssueUpdate.Issue)
}

// IssueList returns issues for a team with optional filters.
func (c *Client) IssueList(teamID string, opts ListOpts) ([]Issue, error) {
	limit := opts.Limit
	if limit <= 0 {
		limit = 50
	}

	vars := map[string]any{
		"teamId": teamID,
		"first":  limit,
	}

	if opts.State != "" {
		vars["stateFilter"] = map[string]any{
			"name": map[string]any{"eq": opts.State},
		}
	}
	if opts.Label != "" {
		vars["labelFilter"] = map[string]any{
			"some": map[string]any{
				"name": map[string]any{"eq": opts.Label},
			},
		}
	}

	data, err := c.do(qIssueList, vars)
	if err != nil {
		return nil, err
	}

	var resp struct {
		Issues struct {
			Nodes []json.RawMessage `json:"nodes"`
		} `json:"issues"`
	}
	if err := json.Unmarshal(data, &resp); err != nil {
		return nil, fmt.Errorf("parse issue list: %w", err)
	}

	issues := make([]Issue, 0, len(resp.Issues.Nodes))
	for _, node := range resp.Issues.Nodes {
		iss, err := parseIssue(node)
		if err != nil {
			return nil, err
		}
		issues = append(issues, *iss)
	}
	return issues, nil
}

// IssueDelete permanently deletes an issue by UUID.
func (c *Client) IssueDelete(id string) error {
	data, err := c.do(mIssueDelete, map[string]any{"id": id})
	if err != nil {
		return err
	}
	var resp struct {
		IssueDelete struct {
			Success bool `json:"success"`
		} `json:"issueDelete"`
	}
	if err := json.Unmarshal(data, &resp); err != nil {
		return fmt.Errorf("parse delete response: %w", err)
	}
	if !resp.IssueDelete.Success {
		return fmt.Errorf("issueDelete returned success=false")
	}
	// Invalidate cached issue data after deletion.
	c.cache.Delete("issue", id)
	return nil
}

// IssueSetParent sets the parent of an issue.
func (c *Client) IssueSetParent(childID, parentID string) (*Issue, error) {
	return c.IssueUpdate(childID, IssueUpdateInput{
		ParentID: &parentID,
	}, "") // teamID not needed for parent-only update
}

// --- Comments ---

// CommentAdd adds a comment to an issue.
func (c *Client) CommentAdd(issueID, body string) (*Comment, error) {
	data, err := c.do(mCommentCreate, map[string]any{
		"input": map[string]any{
			"issueId": issueID,
			"body":    body,
		},
	})
	if err != nil {
		return nil, err
	}

	var resp struct {
		CommentCreate struct {
			Success bool `json:"success"`
			Comment struct {
				ID        string `json:"id"`
				Body      string `json:"body"`
				CreatedAt string `json:"createdAt"`
				User      *struct {
					Name string `json:"name"`
				} `json:"user"`
			} `json:"comment"`
		} `json:"commentCreate"`
	}
	if err := json.Unmarshal(data, &resp); err != nil {
		return nil, fmt.Errorf("parse comment response: %w", err)
	}
	if !resp.CommentCreate.Success {
		return nil, fmt.Errorf("commentCreate returned success=false")
	}

	comment := &Comment{
		ID:        resp.CommentCreate.Comment.ID,
		Body:      resp.CommentCreate.Comment.Body,
		CreatedAt: resp.CommentCreate.Comment.CreatedAt,
	}
	if resp.CommentCreate.Comment.User != nil {
		comment.UserName = resp.CommentCreate.Comment.User.Name
	}
	return comment, nil
}

// CommentList returns comments for an issue.
func (c *Client) CommentList(issueID string) ([]Comment, error) {
	data, err := c.do(qCommentList, map[string]any{"issueId": issueID})
	if err != nil {
		return nil, err
	}

	var resp struct {
		Issue struct {
			Comments struct {
				Nodes []struct {
					ID        string `json:"id"`
					Body      string `json:"body"`
					CreatedAt string `json:"createdAt"`
					User      *struct {
						Name string `json:"name"`
					} `json:"user"`
				} `json:"nodes"`
			} `json:"comments"`
		} `json:"issue"`
	}
	if err := json.Unmarshal(data, &resp); err != nil {
		return nil, fmt.Errorf("parse comments: %w", err)
	}

	comments := make([]Comment, 0, len(resp.Issue.Comments.Nodes))
	for _, n := range resp.Issue.Comments.Nodes {
		c := Comment{
			ID:        n.ID,
			Body:      n.Body,
			CreatedAt: n.CreatedAt,
		}
		if n.User != nil {
			c.UserName = n.User.Name
		}
		comments = append(comments, c)
	}
	return comments, nil
}
