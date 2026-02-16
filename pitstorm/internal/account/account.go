// Package account manages test account credentials for pitstorm.
// It provides load/save for an accounts.json file, credential validation
// against a live target, and helpers for injecting tokens into the HTTP
// client. The package deliberately avoids embedding Clerk SDK calls
// directly — setup is driven through the Clerk Frontend API via standard
// HTTP, making it testable with httptest.
package account

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

// Tier mirrors persona.Tier but avoids a circular import.
type Tier string

const (
	TierAnon Tier = "anon"
	TierFree Tier = "free"
	TierPass Tier = "pass"
	TierLab  Tier = "lab"
)

// Account represents a single test user credential.
type Account struct {
	// ID is the stable identifier used by the dispatcher (e.g. "account-free-casual").
	ID string `json:"id"`

	// Email is the Clerk test account email address.
	Email string `json:"email"`

	// Password is the Clerk test account password.
	Password string `json:"password"`

	// Tier indicates the subscription level.
	Tier Tier `json:"tier"`

	// ClerkUserID is the Clerk user ID, populated after setup.
	ClerkUserID string `json:"clerk_user_id,omitempty"`

	// ClerkSessionID is the Clerk session ID, needed for token refresh.
	// Populated by login — used by the Refresher during run.
	ClerkSessionID string `json:"clerk_session_id,omitempty"`

	// SessionToken is a cached Clerk session token.
	// Populated by setup or verify — may expire.
	SessionToken string `json:"session_token,omitempty"`

	// TokenExpiresAt is when the session token expires.
	TokenExpiresAt time.Time `json:"token_expires_at,omitempty"`

	// CreatedAt records when the account was first provisioned.
	CreatedAt time.Time `json:"created_at,omitempty"`

	// LastVerified records when credentials were last successfully verified.
	LastVerified time.Time `json:"last_verified,omitempty"`
}

// IsExpired returns true if the session token has expired or is absent.
func (a *Account) IsExpired() bool {
	if a.SessionToken == "" {
		return true
	}
	// Allow 30-second grace period.
	return time.Now().After(a.TokenExpiresAt.Add(-30 * time.Second))
}

// File represents the accounts.json structure.
type File struct {
	// Version is the schema version (currently 1).
	Version int `json:"version"`

	// Target is the base URL these accounts were provisioned against.
	Target string `json:"target"`

	// Accounts is the list of test accounts.
	Accounts []Account `json:"accounts"`

	// GeneratedAt is when this file was last written.
	GeneratedAt time.Time `json:"generated_at"`
}

// Load reads and parses an accounts file from disk.
func Load(path string) (*File, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read accounts file: %w", err)
	}

	var f File
	if err := json.Unmarshal(data, &f); err != nil {
		return nil, fmt.Errorf("parse accounts file: %w", err)
	}

	if f.Version == 0 {
		return nil, fmt.Errorf("accounts file missing version field")
	}
	if f.Version != 1 {
		return nil, fmt.Errorf("unsupported accounts file version %d (expected 1)", f.Version)
	}

	return &f, nil
}

// Save writes the accounts file to disk atomically with pretty-printed JSON.
// It writes to a temporary file in the same directory, then renames to avoid
// data corruption from interrupted writes.
func Save(path string, f *File) error {
	f.GeneratedAt = time.Now().UTC()

	data, err := json.MarshalIndent(f, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal accounts file: %w", err)
	}

	data = append(data, '\n')

	// Write to a temp file in the same directory so os.Rename is atomic.
	dir := filepath.Dir(path)
	tmp, err := os.CreateTemp(dir, ".accounts-*.tmp")
	if err != nil {
		return fmt.Errorf("create temp file: %w", err)
	}
	tmpPath := tmp.Name()

	// Clean up on any failure path.
	defer func() {
		if tmpPath != "" {
			os.Remove(tmpPath)
		}
	}()

	if err := tmp.Chmod(0600); err != nil {
		tmp.Close()
		return fmt.Errorf("chmod temp file: %w", err)
	}

	if _, err := tmp.Write(data); err != nil {
		tmp.Close()
		return fmt.Errorf("write temp file: %w", err)
	}

	if err := tmp.Close(); err != nil {
		return fmt.Errorf("close temp file: %w", err)
	}

	if err := os.Rename(tmpPath, path); err != nil {
		return fmt.Errorf("rename temp file: %w", err)
	}

	// Rename succeeded — prevent deferred cleanup.
	tmpPath = ""
	return nil
}

// ByID returns the account matching the given ID, or an error if not found.
func (f *File) ByID(id string) (*Account, error) {
	for i := range f.Accounts {
		if f.Accounts[i].ID == id {
			return &f.Accounts[i], nil
		}
	}
	return nil, fmt.Errorf("account %q not found", id)
}

// ByTier returns all accounts matching the given tier.
func (f *File) ByTier(tier Tier) []Account {
	var result []Account
	for _, a := range f.Accounts {
		if a.Tier == tier {
			result = append(result, a)
		}
	}
	return result
}

// IDs returns a sorted list of all account IDs.
func (f *File) IDs() []string {
	ids := make([]string, len(f.Accounts))
	for i, a := range f.Accounts {
		ids[i] = a.ID
	}
	sort.Strings(ids)
	return ids
}

// Validate checks the file for structural issues.
func (f *File) Validate() error {
	if f.Target == "" {
		return fmt.Errorf("target URL is required")
	}
	if len(f.Accounts) == 0 {
		return fmt.Errorf("no accounts defined")
	}

	seen := make(map[string]bool)
	emails := make(map[string]bool)

	for i, a := range f.Accounts {
		if a.ID == "" {
			return fmt.Errorf("account[%d]: missing id", i)
		}
		if seen[a.ID] {
			return fmt.Errorf("account[%d]: duplicate id %q", i, a.ID)
		}
		seen[a.ID] = true

		// Anon accounts don't require email/password.
		if a.Tier != TierAnon {
			if a.Email == "" {
				return fmt.Errorf("account[%d] (%s): missing email", i, a.ID)
			}
			if emails[a.Email] {
				return fmt.Errorf("account[%d] (%s): duplicate email %q", i, a.ID, a.Email)
			}
			emails[a.Email] = true

			if a.Password == "" {
				return fmt.Errorf("account[%d] (%s): missing password", i, a.ID)
			}
		}

		switch a.Tier {
		case TierAnon, TierFree, TierPass, TierLab:
			// valid
		default:
			return fmt.Errorf("account[%d] (%s): invalid tier %q", i, a.ID, a.Tier)
		}
	}

	return nil
}

// ---------- Verification ----------

// VerifyResult holds the outcome of verifying a single account.
type VerifyResult struct {
	AccountID  string
	OK         bool
	StatusCode int
	Latency    time.Duration
	Error      string
}

// Verifier checks account credentials against a live target.
type Verifier struct {
	client  *http.Client
	baseURL string
	logf    func(string, ...any)
}

// NewVerifier creates a Verifier for the given target URL.
func NewVerifier(baseURL string, logf func(string, ...any)) *Verifier {
	if logf == nil {
		logf = func(string, ...any) {}
	}
	return &Verifier{
		client: &http.Client{
			Timeout: 15 * time.Second,
		},
		baseURL: strings.TrimRight(baseURL, "/"),
		logf:    logf,
	}
}

// CheckHealth verifies the target is reachable by hitting /api/health.
func (v *Verifier) CheckHealth(ctx context.Context) (*VerifyResult, error) {
	start := time.Now()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, v.baseURL+"/api/health", nil)
	if err != nil {
		return nil, fmt.Errorf("create health request: %w", err)
	}

	resp, err := v.client.Do(req)
	if err != nil {
		return &VerifyResult{
			AccountID: "_health",
			OK:        false,
			Latency:   time.Since(start),
			Error:     err.Error(),
		}, nil
	}
	defer resp.Body.Close()
	io.Copy(io.Discard, resp.Body)

	return &VerifyResult{
		AccountID:  "_health",
		OK:         resp.StatusCode == http.StatusOK,
		StatusCode: resp.StatusCode,
		Latency:    time.Since(start),
	}, nil
}

// CheckAccount verifies a single account's token by hitting /api/health
// with an Authorization header. If the token works, authenticated endpoints
// should return 200. This is a lightweight check — it doesn't test every
// endpoint the persona uses.
func (v *Verifier) CheckAccount(ctx context.Context, acct *Account) *VerifyResult {
	if acct.SessionToken == "" {
		return &VerifyResult{
			AccountID: acct.ID,
			OK:        false,
			Error:     "no session token",
		}
	}

	start := time.Now()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, v.baseURL+"/api/health", nil)
	if err != nil {
		return &VerifyResult{
			AccountID: acct.ID,
			OK:        false,
			Error:     fmt.Sprintf("create request: %v", err),
		}
	}
	req.Header.Set("Authorization", "Bearer "+acct.SessionToken)
	req.Header.Set("User-Agent", "pitstorm/1.0")

	resp, err := v.client.Do(req)
	if err != nil {
		return &VerifyResult{
			AccountID: acct.ID,
			OK:        false,
			Latency:   time.Since(start),
			Error:     err.Error(),
		}
	}
	defer resp.Body.Close()
	io.Copy(io.Discard, resp.Body)

	ok := resp.StatusCode >= 200 && resp.StatusCode < 300
	result := &VerifyResult{
		AccountID:  acct.ID,
		OK:         ok,
		StatusCode: resp.StatusCode,
		Latency:    time.Since(start),
	}
	if !ok {
		result.Error = fmt.Sprintf("HTTP %d", resp.StatusCode)
	}
	return result
}

// VerifyAll checks health and then every account with a token.
// Accounts without tokens are reported as failures.
func (v *Verifier) VerifyAll(ctx context.Context, f *File) []VerifyResult {
	var results []VerifyResult

	// Health check first.
	health, err := v.CheckHealth(ctx)
	if err != nil {
		results = append(results, VerifyResult{
			AccountID: "_health",
			OK:        false,
			Error:     err.Error(),
		})
	} else {
		results = append(results, *health)
	}

	// Skip account checks if health failed.
	if len(results) > 0 && !results[0].OK {
		v.logf("health check failed, skipping account verification")
		for _, a := range f.Accounts {
			results = append(results, VerifyResult{
				AccountID: a.ID,
				OK:        false,
				Error:     "skipped (health check failed)",
			})
		}
		return results
	}

	for i := range f.Accounts {
		// Skip anonymous accounts — they have no tokens by design.
		if f.Accounts[i].Tier == TierAnon {
			results = append(results, VerifyResult{
				AccountID: f.Accounts[i].ID,
				OK:        true,
				Error:     "skipped (anon)",
			})
			v.logf("  %s: skipped (anon tier)", f.Accounts[i].ID)
			continue
		}

		result := v.CheckAccount(ctx, &f.Accounts[i])
		results = append(results, *result)
		v.logf("  %s: ok=%v status=%d latency=%s",
			result.AccountID, result.OK, result.StatusCode, result.Latency.Truncate(time.Millisecond))
	}

	return results
}

// ---------- Setup helpers ----------

// DefaultAccounts returns the canonical set of test accounts for all 8 personas.
// These map 1:1 to the persona IDs in the persona package.
func DefaultAccounts(target string) *File {
	domain := extractDomain(target)

	return &File{
		Version: 1,
		Target:  target,
		Accounts: []Account{
			{
				ID:       "account-free-lurker",
				Email:    "",
				Password: "",
				Tier:     TierAnon,
			},
			{
				ID:       "account-free-casual",
				Email:    fmt.Sprintf("storm-casual@%s", domain),
				Password: generatePassword("casual"),
				Tier:     TierFree,
			},
			{
				ID:       "account-free-power-user",
				Email:    fmt.Sprintf("storm-power@%s", domain),
				Password: generatePassword("power"),
				Tier:     TierFree,
			},
			{
				ID:       "account-pass-subscriber",
				Email:    fmt.Sprintf("storm-pass@%s", domain),
				Password: generatePassword("pass"),
				Tier:     TierPass,
			},
			{
				ID:       "account-lab-power-user",
				Email:    fmt.Sprintf("storm-lab@%s", domain),
				Password: generatePassword("lab"),
				Tier:     TierLab,
			},
			{
				ID:       "account-abusive-user",
				Email:    fmt.Sprintf("storm-abuse@%s", domain),
				Password: generatePassword("abuse"),
				Tier:     TierFree,
			},
			{
				ID:       "account-viral-sharer",
				Email:    fmt.Sprintf("storm-viral@%s", domain),
				Password: generatePassword("viral"),
				Tier:     TierPass,
			},
			{
				ID:       "account-churner",
				Email:    fmt.Sprintf("storm-churn@%s", domain),
				Password: generatePassword("churn"),
				Tier:     TierPass,
			},
		},
	}
}

// InjectTokens loads account tokens into the HTTP client.
// Returns the number of tokens injected and any accounts that were skipped.
func InjectTokens(f *File, setToken func(accountID, token string)) (injected int, skipped []string) {
	for _, a := range f.Accounts {
		if a.Tier == TierAnon {
			// Anonymous personas don't need tokens.
			continue
		}
		if a.SessionToken == "" || a.IsExpired() {
			skipped = append(skipped, a.ID)
			continue
		}
		setToken(a.ID, a.SessionToken)
		injected++
	}
	return injected, skipped
}

// Summary returns a human-readable summary of the accounts file.
func Summary(f *File) string {
	var b strings.Builder

	tierCounts := make(map[Tier]int)
	withToken := 0
	expired := 0

	for _, a := range f.Accounts {
		tierCounts[a.Tier]++
		if a.SessionToken != "" {
			withToken++
			if a.IsExpired() {
				expired++
			}
		}
	}

	fmt.Fprintf(&b, "Target:   %s\n", f.Target)
	fmt.Fprintf(&b, "Accounts: %d total\n", len(f.Accounts))
	fmt.Fprintf(&b, "  anon: %d, free: %d, pass: %d, lab: %d\n",
		tierCounts[TierAnon], tierCounts[TierFree], tierCounts[TierPass], tierCounts[TierLab])
	fmt.Fprintf(&b, "Tokens:   %d active, %d expired, %d missing\n",
		withToken-expired, expired, len(f.Accounts)-withToken)

	return b.String()
}

// ---------- Internal helpers ----------

// extractDomain pulls the hostname from a URL for email generation.
func extractDomain(target string) string {
	// Strip protocol.
	d := target
	if idx := strings.Index(d, "://"); idx >= 0 {
		d = d[idx+3:]
	}
	// Strip path.
	if idx := strings.Index(d, "/"); idx >= 0 {
		d = d[:idx]
	}
	// Strip port.
	if idx := strings.Index(d, ":"); idx >= 0 {
		d = d[:idx]
	}
	// Strip www prefix for cleaner emails.
	d = strings.TrimPrefix(d, "www.")
	if d == "" {
		return "test.thepit.cloud"
	}
	return d
}

// generatePassword creates a deterministic but non-trivial password
// for test accounts. These are NOT production credentials.
func generatePassword(seed string) string {
	// Fixed prefix + seed + fixed suffix for testability.
	return fmt.Sprintf("Storm_%s_2025!", seed)
}

// ---------- Format helpers ----------

// FormatVerifyResults returns a human-readable summary of verification results.
func FormatVerifyResults(results []VerifyResult) string {
	var b strings.Builder
	passed := 0
	failed := 0

	for _, r := range results {
		status := "PASS"
		if !r.OK {
			status = "FAIL"
			failed++
		} else {
			passed++
		}

		if r.Latency > 0 && r.StatusCode > 0 {
			fmt.Fprintf(&b, "  %-30s %s  %3d  %s\n", r.AccountID, status, r.StatusCode, r.Latency.Truncate(time.Millisecond))
		} else if r.Error != "" {
			fmt.Fprintf(&b, "  %-30s %s  %s\n", r.AccountID, status, r.Error)
		} else {
			fmt.Fprintf(&b, "  %-30s %s\n", r.AccountID, status)
		}
	}

	fmt.Fprintf(&b, "\n  Total: %d passed, %d failed\n", passed, failed)
	return b.String()
}
