package cmd

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

// mockLinear returns an httptest server that responds to GraphQL queries.
func mockLinear(t *testing.T, handler func(r gqlRequest) (any, int)) (*httptest.Server, *Client) {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") == "" {
			w.WriteHeader(401)
			json.NewEncoder(w).Encode(map[string]any{"errors": []map[string]any{{"message": "unauthorized"}}})
			return
		}

		var req gqlRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.WriteHeader(400)
			return
		}

		data, status := handler(req)
		w.WriteHeader(status)
		json.NewEncoder(w).Encode(map[string]any{"data": data})
	}))

	client := NewClient("test-api-key")
	client.baseURL = srv.URL

	t.Cleanup(srv.Close)
	return srv, client
}

func TestTeams(t *testing.T) {
	_, client := mockLinear(t, func(r gqlRequest) (any, int) {
		return map[string]any{
			"teams": map[string]any{
				"nodes": []map[string]any{
					{"id": "team-1", "name": "Alpha", "key": "ALP"},
					{"id": "team-2", "name": "Beta", "key": "BET"},
				},
			},
		}, 200
	})

	teams, err := client.Teams()
	if err != nil {
		t.Fatalf("Teams() error: %v", err)
	}
	if len(teams) != 2 {
		t.Fatalf("expected 2 teams, got %d", len(teams))
	}
	if teams[0].Key != "ALP" {
		t.Errorf("expected key ALP, got %s", teams[0].Key)
	}
}

func TestTeamByKey(t *testing.T) {
	_, client := mockLinear(t, func(r gqlRequest) (any, int) {
		return map[string]any{
			"teams": map[string]any{
				"nodes": []map[string]any{
					{"id": "team-1", "name": "Alpha", "key": "ALP"},
				},
			},
		}, 200
	})

	team, err := client.TeamByKey("alp") // case-insensitive
	if err != nil {
		t.Fatalf("TeamByKey() error: %v", err)
	}
	if team.ID != "team-1" {
		t.Errorf("expected team-1, got %s", team.ID)
	}

	_, err = client.TeamByKey("NOPE")
	if err == nil {
		t.Fatal("expected error for unknown team")
	}
}

func TestStates(t *testing.T) {
	_, client := mockLinear(t, func(r gqlRequest) (any, int) {
		return map[string]any{
			"team": map[string]any{
				"states": map[string]any{
					"nodes": []map[string]any{
						{"id": "s1", "name": "Todo", "type": "unstarted"},
						{"id": "s2", "name": "Done", "type": "completed"},
					},
				},
			},
		}, 200
	})

	states, err := client.States("team-1")
	if err != nil {
		t.Fatalf("States() error: %v", err)
	}
	if len(states) != 2 {
		t.Fatalf("expected 2 states, got %d", len(states))
	}
}

func TestLabels(t *testing.T) {
	_, client := mockLinear(t, func(r gqlRequest) (any, int) {
		return map[string]any{
			"team": map[string]any{
				"labels": map[string]any{
					"nodes": []map[string]any{
						{"id": "l1", "name": "Bug"},
						{"id": "l2", "name": "Feature"},
					},
				},
			},
		}, 200
	})

	labels, err := client.Labels("team-1")
	if err != nil {
		t.Fatalf("Labels() error: %v", err)
	}
	if len(labels) != 2 {
		t.Fatalf("expected 2 labels, got %d", len(labels))
	}
	if labels[0].Name != "Bug" {
		t.Errorf("expected Bug, got %s", labels[0].Name)
	}
}

func TestResolveStateID(t *testing.T) {
	_, client := mockLinear(t, func(r gqlRequest) (any, int) {
		return map[string]any{
			"team": map[string]any{
				"states": map[string]any{
					"nodes": []map[string]any{
						{"id": "s1", "name": "Todo", "type": "unstarted"},
						{"id": "s2", "name": "In Progress", "type": "started"},
					},
				},
			},
		}, 200
	})

	id, err := client.resolveStateID("team-1", "todo") // case-insensitive
	if err != nil {
		t.Fatalf("resolveStateID() error: %v", err)
	}
	if id != "s1" {
		t.Errorf("expected s1, got %s", id)
	}

	_, err = client.resolveStateID("team-1", "Nonexistent")
	if err == nil {
		t.Fatal("expected error for unknown state")
	}
}

func TestResolveLabelID(t *testing.T) {
	_, client := mockLinear(t, func(r gqlRequest) (any, int) {
		return map[string]any{
			"team": map[string]any{
				"labels": map[string]any{
					"nodes": []map[string]any{
						{"id": "l1", "name": "Bug"},
					},
				},
			},
		}, 200
	})

	id, err := client.resolveLabelID("team-1", "bug") // case-insensitive
	if err != nil {
		t.Fatalf("resolveLabelID() error: %v", err)
	}
	if id != "l1" {
		t.Errorf("expected l1, got %s", id)
	}
}

func TestIssueCreate(t *testing.T) {
	_, client := mockLinear(t, func(r gqlRequest) (any, int) {
		// Handle teams query (for TeamByKey).
		if _, ok := r.Variables["input"]; !ok {
			return map[string]any{
				"teams": map[string]any{
					"nodes": []map[string]any{
						{"id": "team-1", "name": "Test", "key": "TST"},
					},
				},
			}, 200
		}
		return map[string]any{
			"issueCreate": map[string]any{
				"success": true,
				"issue": map[string]any{
					"id":         "iss-1",
					"identifier": "TST-1",
					"title":      "Test Issue",
					"priority":   2,
					"url":        "https://linear.app/test/issue/TST-1",
					"state":      map[string]any{"name": "Todo"},
				},
			},
		}, 200
	})

	issue, err := client.IssueCreate(IssueInput{
		TeamKey:  "TST",
		Title:    "Test Issue",
		Priority: "high",
	})
	if err != nil {
		t.Fatalf("IssueCreate() error: %v", err)
	}
	if issue.Identifier != "TST-1" {
		t.Errorf("expected TST-1, got %s", issue.Identifier)
	}
	if issue.Priority != 2 {
		t.Errorf("expected priority 2, got %d", issue.Priority)
	}
}

func TestIssueGet(t *testing.T) {
	_, client := mockLinear(t, func(r gqlRequest) (any, int) {
		return map[string]any{
			"issue": map[string]any{
				"id":         "iss-1",
				"identifier": "TST-1",
				"title":      "Test Issue",
				"priority":   2,
				"url":        "https://linear.app/test/issue/TST-1",
				"state":      map[string]any{"name": "Todo"},
			},
		}, 200
	})

	issue, err := client.IssueGet("iss-1")
	if err != nil {
		t.Fatalf("IssueGet() error: %v", err)
	}
	if issue.Title != "Test Issue" {
		t.Errorf("expected 'Test Issue', got %q", issue.Title)
	}
	if issue.StateName != "Todo" {
		t.Errorf("expected state Todo, got %q", issue.StateName)
	}
}

func TestIssueDelete(t *testing.T) {
	_, client := mockLinear(t, func(r gqlRequest) (any, int) {
		return map[string]any{
			"issueDelete": map[string]any{
				"success": true,
			},
		}, 200
	})

	err := client.IssueDelete("iss-1")
	if err != nil {
		t.Fatalf("IssueDelete() error: %v", err)
	}
}

func TestCommentAdd(t *testing.T) {
	_, client := mockLinear(t, func(r gqlRequest) (any, int) {
		return map[string]any{
			"commentCreate": map[string]any{
				"success": true,
				"comment": map[string]any{
					"id":        "com-1",
					"body":      "Test comment",
					"createdAt": "2026-02-16T00:00:00Z",
					"user":      map[string]any{"name": "Bot"},
				},
			},
		}, 200
	})

	comment, err := client.CommentAdd("iss-1", "Test comment")
	if err != nil {
		t.Fatalf("CommentAdd() error: %v", err)
	}
	if comment.Body != "Test comment" {
		t.Errorf("expected 'Test comment', got %q", comment.Body)
	}
	if comment.UserName != "Bot" {
		t.Errorf("expected user Bot, got %q", comment.UserName)
	}
}

func TestCommentList(t *testing.T) {
	_, client := mockLinear(t, func(r gqlRequest) (any, int) {
		return map[string]any{
			"issue": map[string]any{
				"comments": map[string]any{
					"nodes": []map[string]any{
						{
							"id":        "com-1",
							"body":      "First comment",
							"createdAt": "2026-02-16T00:00:00Z",
							"user":      map[string]any{"name": "Alice"},
						},
						{
							"id":        "com-2",
							"body":      "Second comment",
							"createdAt": "2026-02-16T01:00:00Z",
							"user":      nil,
						},
					},
				},
			},
		}, 200
	})

	comments, err := client.CommentList("iss-1")
	if err != nil {
		t.Fatalf("CommentList() error: %v", err)
	}
	if len(comments) != 2 {
		t.Fatalf("expected 2 comments, got %d", len(comments))
	}
	if comments[0].UserName != "Alice" {
		t.Errorf("expected Alice, got %q", comments[0].UserName)
	}
	if comments[1].UserName != "" {
		t.Errorf("expected empty username for nil user, got %q", comments[1].UserName)
	}
}

func TestPriorityMap(t *testing.T) {
	tests := []struct {
		name string
		val  int
	}{
		{"none", 0},
		{"urgent", 1},
		{"high", 2},
		{"medium", 3},
		{"low", 4},
	}
	for _, tt := range tests {
		if got := PriorityMap[tt.name]; got != tt.val {
			t.Errorf("PriorityMap[%q] = %d, want %d", tt.name, got, tt.val)
		}
	}
}

func TestPriorityName(t *testing.T) {
	tests := []struct {
		val  int
		name string
	}{
		{0, "None"},
		{1, "Urgent"},
		{2, "High"},
		{3, "Medium"},
		{4, "Low"},
	}
	for _, tt := range tests {
		if got := PriorityName[tt.val]; got != tt.name {
			t.Errorf("PriorityName[%d] = %q, want %q", tt.val, got, tt.name)
		}
	}
}

func TestUnauthorized(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(401)
		w.Write([]byte(`{"errors":[{"message":"unauthorized"}]}`))
	}))
	defer srv.Close()

	client := NewClient("bad-key")
	client.baseURL = srv.URL

	_, err := client.Teams()
	if err == nil {
		t.Fatal("expected unauthorized error")
	}
	if got := err.Error(); got != "unauthorized: check LINEAR_API_KEY" {
		t.Errorf("unexpected error: %s", got)
	}
}

func TestRateLimited(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(429)
		w.Write([]byte(`{}`))
	}))
	defer srv.Close()

	client := NewClient("test-key")
	client.baseURL = srv.URL

	_, err := client.Teams()
	if err == nil {
		t.Fatal("expected rate limit error")
	}
	if got := err.Error(); got != "rate limited: try again later" {
		t.Errorf("unexpected error: %s", got)
	}
}

func TestGraphQLError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(200)
		json.NewEncoder(w).Encode(map[string]any{
			"data":   nil,
			"errors": []map[string]any{{"message": "field not found"}, {"message": "bad input"}},
		})
	}))
	defer srv.Close()

	client := NewClient("test-key")
	client.baseURL = srv.URL

	_, err := client.Teams()
	if err == nil {
		t.Fatal("expected graphql error")
	}
	expected := "graphql: field not found; bad input"
	if got := err.Error(); got != expected {
		t.Errorf("expected %q, got %q", expected, got)
	}
}

func TestResolveIdentifier(t *testing.T) {
	callCount := 0
	_, client := mockLinear(t, func(r gqlRequest) (any, int) {
		callCount++
		if callCount == 1 {
			// Teams query.
			return map[string]any{
				"teams": map[string]any{
					"nodes": []map[string]any{
						{"id": "team-1", "name": "Test", "key": "TST"},
					},
				},
			}, 200
		}
		// Issue search query.
		return map[string]any{
			"issues": map[string]any{
				"nodes": []map[string]any{
					{"id": "iss-42"},
				},
			},
		}, 200
	})

	id, err := client.resolveIdentifier("TST-42")
	if err != nil {
		t.Fatalf("resolveIdentifier() error: %v", err)
	}
	if id != "iss-42" {
		t.Errorf("expected iss-42, got %s", id)
	}
}

func TestResolveIdentifierInvalid(t *testing.T) {
	client := NewClient("test")

	_, err := client.resolveIdentifier("nohyphen")
	if err == nil {
		t.Fatal("expected error for identifier without hyphen")
	}
}

func TestIsReadableRef(t *testing.T) {
	tests := []struct {
		ref  string
		want bool
	}{
		{"OCE-22", true},
		{"TST-1", true},
		{"ABC-999", true},
		{"nohyphen", false},
		{"has space-1", false},
		{"", false},
		{"a]b-1", true}, // odd but passes heuristic
		{"01234567-89ab-cdef-0123-456789abcdef", false}, // UUID (36 chars)
		{"fb78359e-5665-4d7a-868d-931a56b39084", false}, // UUID (36 chars)
	}
	for _, tt := range tests {
		if got := IsReadableRef(tt.ref); got != tt.want {
			t.Errorf("IsReadableRef(%q) = %v, want %v", tt.ref, got, tt.want)
		}
	}
}

func TestTeamsCaching(t *testing.T) {
	callCount := 0
	_, client := mockLinear(t, func(r gqlRequest) (any, int) {
		callCount++
		return map[string]any{
			"teams": map[string]any{
				"nodes": []map[string]any{
					{"id": "team-1", "name": "Alpha", "key": "ALP"},
				},
			},
		}, 200
	})

	// First call should hit the server.
	teams1, err := client.Teams()
	if err != nil {
		t.Fatalf("Teams() first call error: %v", err)
	}
	if callCount != 1 {
		t.Fatalf("expected 1 API call, got %d", callCount)
	}

	// Second call should use cache.
	teams2, err := client.Teams()
	if err != nil {
		t.Fatalf("Teams() second call error: %v", err)
	}
	if callCount != 1 {
		t.Fatalf("expected still 1 API call after cache, got %d", callCount)
	}
	if len(teams1) != len(teams2) {
		t.Fatalf("cache returned different results")
	}
}
