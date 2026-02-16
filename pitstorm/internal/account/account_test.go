package account

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

// ---------- Load / Save ----------

func TestLoadValid(t *testing.T) {
	path := writeTemp(t, validJSON())

	f, err := Load(path)
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if f.Version != 1 {
		t.Errorf("version = %d, want 1", f.Version)
	}
	if len(f.Accounts) != 2 {
		t.Errorf("accounts = %d, want 2", len(f.Accounts))
	}
	if f.Target != "https://www.thepit.cloud" {
		t.Errorf("target = %q, want %q", f.Target, "https://www.thepit.cloud")
	}
}

func TestLoadMissingFile(t *testing.T) {
	_, err := Load("/nonexistent/accounts.json")
	if err == nil {
		t.Fatal("expected error for missing file")
	}
	if !strings.Contains(err.Error(), "read accounts file") {
		t.Errorf("error = %v, want 'read accounts file'", err)
	}
}

func TestLoadInvalidJSON(t *testing.T) {
	path := writeTemp(t, `{not json}`)
	_, err := Load(path)
	if err == nil {
		t.Fatal("expected error for invalid JSON")
	}
	if !strings.Contains(err.Error(), "parse accounts file") {
		t.Errorf("error = %v, want 'parse accounts file'", err)
	}
}

func TestLoadMissingVersion(t *testing.T) {
	path := writeTemp(t, `{"target":"http://localhost","accounts":[]}`)
	_, err := Load(path)
	if err == nil {
		t.Fatal("expected error for missing version")
	}
	if !strings.Contains(err.Error(), "missing version") {
		t.Errorf("error = %v, want 'missing version'", err)
	}
}

func TestLoadUnsupportedVersion(t *testing.T) {
	path := writeTemp(t, `{"version":99,"target":"http://localhost","accounts":[]}`)
	_, err := Load(path)
	if err == nil {
		t.Fatal("expected error for unsupported version")
	}
	if !strings.Contains(err.Error(), "unsupported") {
		t.Errorf("error = %v, want 'unsupported'", err)
	}
}

func TestSaveAndReload(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "accounts.json")

	original := &File{
		Version: 1,
		Target:  "https://test.thepit.cloud",
		Accounts: []Account{
			{ID: "acct-1", Email: "a@test.com", Password: "pass", Tier: TierFree},
		},
	}

	if err := Save(path, original); err != nil {
		t.Fatalf("Save: %v", err)
	}

	reloaded, err := Load(path)
	if err != nil {
		t.Fatalf("Load after Save: %v", err)
	}

	if reloaded.Version != 1 {
		t.Errorf("version = %d, want 1", reloaded.Version)
	}
	if len(reloaded.Accounts) != 1 {
		t.Errorf("accounts = %d, want 1", len(reloaded.Accounts))
	}
	if reloaded.Target != "https://test.thepit.cloud" {
		t.Errorf("target = %q", reloaded.Target)
	}
	if reloaded.GeneratedAt.IsZero() {
		t.Error("generated_at should be set after Save")
	}
}

func TestSaveFilePermissions(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "accounts.json")

	f := &File{Version: 1, Target: "http://localhost", Accounts: []Account{
		{ID: "a", Email: "a@b.c", Password: "p", Tier: TierFree},
	}}
	if err := Save(path, f); err != nil {
		t.Fatalf("Save: %v", err)
	}

	info, err := os.Stat(path)
	if err != nil {
		t.Fatalf("Stat: %v", err)
	}
	// File should be 0600 (owner read/write only).
	if info.Mode().Perm() != 0600 {
		t.Errorf("permissions = %o, want 0600", info.Mode().Perm())
	}
}

// ---------- File methods ----------

func TestByID(t *testing.T) {
	f := testFile()
	a, err := f.ByID("account-free-casual")
	if err != nil {
		t.Fatalf("ByID: %v", err)
	}
	if a.Email != "casual@test.com" {
		t.Errorf("email = %q", a.Email)
	}
}

func TestByIDNotFound(t *testing.T) {
	f := testFile()
	_, err := f.ByID("nonexistent")
	if err == nil {
		t.Fatal("expected error for unknown ID")
	}
}

func TestByTier(t *testing.T) {
	f := testFile()
	free := f.ByTier(TierFree)
	if len(free) != 1 {
		t.Errorf("free accounts = %d, want 1", len(free))
	}

	anon := f.ByTier(TierAnon)
	if len(anon) != 1 {
		t.Errorf("anon accounts = %d, want 1", len(anon))
	}
}

func TestIDs(t *testing.T) {
	f := testFile()
	ids := f.IDs()
	if len(ids) != 2 {
		t.Fatalf("ids = %d, want 2", len(ids))
	}
	// Should be sorted.
	if ids[0] > ids[1] {
		t.Errorf("IDs not sorted: %v", ids)
	}
}

// ---------- Validate ----------

func TestValidateValid(t *testing.T) {
	f := testFile()
	if err := f.Validate(); err != nil {
		t.Fatalf("Validate: %v", err)
	}
}

func TestValidateEmptyTarget(t *testing.T) {
	f := testFile()
	f.Target = ""
	err := f.Validate()
	if err == nil || !strings.Contains(err.Error(), "target") {
		t.Fatalf("expected target error, got: %v", err)
	}
}

func TestValidateNoAccounts(t *testing.T) {
	f := &File{Version: 1, Target: "http://localhost", Accounts: nil}
	err := f.Validate()
	if err == nil || !strings.Contains(err.Error(), "no accounts") {
		t.Fatalf("expected no accounts error, got: %v", err)
	}
}

func TestValidateMissingID(t *testing.T) {
	f := &File{
		Version: 1,
		Target:  "http://localhost",
		Accounts: []Account{
			{Email: "a@b.c", Password: "p", Tier: TierFree},
		},
	}
	err := f.Validate()
	if err == nil || !strings.Contains(err.Error(), "missing id") {
		t.Fatalf("expected missing id error, got: %v", err)
	}
}

func TestValidateDuplicateID(t *testing.T) {
	f := &File{
		Version: 1,
		Target:  "http://localhost",
		Accounts: []Account{
			{ID: "a", Email: "x@b.c", Password: "p", Tier: TierFree},
			{ID: "a", Email: "y@b.c", Password: "p", Tier: TierFree},
		},
	}
	err := f.Validate()
	if err == nil || !strings.Contains(err.Error(), "duplicate id") {
		t.Fatalf("expected duplicate id error, got: %v", err)
	}
}

func TestValidateDuplicateEmail(t *testing.T) {
	f := &File{
		Version: 1,
		Target:  "http://localhost",
		Accounts: []Account{
			{ID: "a", Email: "same@b.c", Password: "p", Tier: TierFree},
			{ID: "b", Email: "same@b.c", Password: "p", Tier: TierFree},
		},
	}
	err := f.Validate()
	if err == nil || !strings.Contains(err.Error(), "duplicate email") {
		t.Fatalf("expected duplicate email error, got: %v", err)
	}
}

func TestValidateMissingPassword(t *testing.T) {
	f := &File{
		Version: 1,
		Target:  "http://localhost",
		Accounts: []Account{
			{ID: "a", Email: "a@b.c", Password: "", Tier: TierFree},
		},
	}
	err := f.Validate()
	if err == nil || !strings.Contains(err.Error(), "missing password") {
		t.Fatalf("expected missing password error, got: %v", err)
	}
}

func TestValidateInvalidTier(t *testing.T) {
	f := &File{
		Version: 1,
		Target:  "http://localhost",
		Accounts: []Account{
			{ID: "a", Email: "a@b.c", Password: "p", Tier: "premium"},
		},
	}
	err := f.Validate()
	if err == nil || !strings.Contains(err.Error(), "invalid tier") {
		t.Fatalf("expected invalid tier error, got: %v", err)
	}
}

func TestValidateMissingEmail(t *testing.T) {
	f := &File{
		Version: 1,
		Target:  "http://localhost",
		Accounts: []Account{
			{ID: "a", Email: "", Password: "p", Tier: TierFree},
		},
	}
	err := f.Validate()
	if err == nil || !strings.Contains(err.Error(), "missing email") {
		t.Fatalf("expected missing email error, got: %v", err)
	}
}

// ---------- IsExpired ----------

func TestIsExpiredNoToken(t *testing.T) {
	a := Account{}
	if !a.IsExpired() {
		t.Error("empty token should be expired")
	}
}

func TestIsExpiredPastExpiry(t *testing.T) {
	a := Account{
		SessionToken:   "tok",
		TokenExpiresAt: time.Now().Add(-1 * time.Hour),
	}
	if !a.IsExpired() {
		t.Error("past expiry should be expired")
	}
}

func TestIsExpiredWithinGrace(t *testing.T) {
	// Token expires in 20 seconds — within the 30s grace period.
	a := Account{
		SessionToken:   "tok",
		TokenExpiresAt: time.Now().Add(20 * time.Second),
	}
	if !a.IsExpired() {
		t.Error("within grace period should be expired")
	}
}

func TestIsExpiredValid(t *testing.T) {
	a := Account{
		SessionToken:   "tok",
		TokenExpiresAt: time.Now().Add(1 * time.Hour),
	}
	if a.IsExpired() {
		t.Error("future expiry should not be expired")
	}
}

// ---------- DefaultAccounts ----------

func TestDefaultAccounts(t *testing.T) {
	f := DefaultAccounts("https://www.thepit.cloud")

	if f.Version != 1 {
		t.Errorf("version = %d", f.Version)
	}
	if len(f.Accounts) != 8 {
		t.Fatalf("accounts = %d, want 8", len(f.Accounts))
	}

	// Check anon has no email/password.
	lurker := f.Accounts[0]
	if lurker.Tier != TierAnon {
		t.Errorf("lurker tier = %q", lurker.Tier)
	}
	if lurker.Email != "" || lurker.Password != "" {
		t.Errorf("anon lurker should have empty email/password")
	}

	// All non-anon should have emails at thepit.cloud domain.
	for _, a := range f.Accounts[1:] {
		if !strings.Contains(a.Email, "thepit.cloud") {
			t.Errorf("account %s email %q should contain thepit.cloud", a.ID, a.Email)
		}
		if a.Password == "" {
			t.Errorf("account %s missing password", a.ID)
		}
	}
}

func TestDefaultAccountsCustomTarget(t *testing.T) {
	f := DefaultAccounts("http://localhost:3000")
	for _, a := range f.Accounts[1:] {
		if !strings.Contains(a.Email, "localhost") {
			t.Errorf("account %s email %q should contain localhost", a.ID, a.Email)
		}
	}
}

// ---------- InjectTokens ----------

func TestInjectTokens(t *testing.T) {
	f := &File{
		Version: 1,
		Target:  "http://localhost",
		Accounts: []Account{
			{ID: "acct-anon", Tier: TierAnon},
			{ID: "acct-valid", Tier: TierFree, SessionToken: "tok1", TokenExpiresAt: time.Now().Add(1 * time.Hour)},
			{ID: "acct-expired", Tier: TierFree, SessionToken: "tok2", TokenExpiresAt: time.Now().Add(-1 * time.Hour)},
			{ID: "acct-empty", Tier: TierFree},
		},
	}

	tokens := make(map[string]string)
	injected, skipped := InjectTokens(f, func(id, tok string) {
		tokens[id] = tok
	})

	if injected != 1 {
		t.Errorf("injected = %d, want 1", injected)
	}
	if len(skipped) != 2 {
		t.Errorf("skipped = %d, want 2", len(skipped))
	}
	if tokens["acct-valid"] != "tok1" {
		t.Errorf("acct-valid token = %q", tokens["acct-valid"])
	}
	if _, ok := tokens["acct-anon"]; ok {
		t.Error("anon should not be injected")
	}
}

// ---------- Verifier ----------

func TestCheckHealthOK(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/health" {
			t.Errorf("unexpected path: %s", r.URL.Path)
		}
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	}))
	defer srv.Close()

	v := NewVerifier(srv.URL, nil)
	result, err := v.CheckHealth(context.Background())
	if err != nil {
		t.Fatalf("CheckHealth: %v", err)
	}
	if !result.OK {
		t.Errorf("expected OK")
	}
	if result.StatusCode != 200 {
		t.Errorf("status = %d", result.StatusCode)
	}
	if result.Latency <= 0 {
		t.Errorf("latency should be positive")
	}
}

func TestCheckHealthServerDown(t *testing.T) {
	v := NewVerifier("http://127.0.0.1:1", nil) // nothing listening
	result, err := v.CheckHealth(context.Background())
	if err != nil {
		t.Fatalf("CheckHealth should not return error, got: %v", err)
	}
	if result.OK {
		t.Error("should not be OK when server is down")
	}
	if result.Error == "" {
		t.Error("should have error message")
	}
}

func TestCheckHealthServerError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusServiceUnavailable)
	}))
	defer srv.Close()

	v := NewVerifier(srv.URL, nil)
	result, err := v.CheckHealth(context.Background())
	if err != nil {
		t.Fatalf("CheckHealth: %v", err)
	}
	if result.OK {
		t.Error("should not be OK for 503")
	}
	if result.StatusCode != 503 {
		t.Errorf("status = %d", result.StatusCode)
	}
}

func TestCheckAccountValid(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		auth := r.Header.Get("Authorization")
		if auth != "Bearer valid-token" {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	v := NewVerifier(srv.URL, nil)
	acct := &Account{
		ID:           "test-acct",
		SessionToken: "valid-token",
	}
	result := v.CheckAccount(context.Background(), acct)
	if !result.OK {
		t.Errorf("expected OK, got error: %s", result.Error)
	}
	if result.StatusCode != 200 {
		t.Errorf("status = %d", result.StatusCode)
	}
}

func TestCheckAccountInvalidToken(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
	}))
	defer srv.Close()

	v := NewVerifier(srv.URL, nil)
	acct := &Account{
		ID:           "test-acct",
		SessionToken: "bad-token",
	}
	result := v.CheckAccount(context.Background(), acct)
	if result.OK {
		t.Error("should not be OK for invalid token")
	}
	if result.StatusCode != 401 {
		t.Errorf("status = %d", result.StatusCode)
	}
}

func TestCheckAccountNoToken(t *testing.T) {
	v := NewVerifier("http://localhost", nil)
	acct := &Account{ID: "test-acct"}
	result := v.CheckAccount(context.Background(), acct)
	if result.OK {
		t.Error("should not be OK without token")
	}
	if !strings.Contains(result.Error, "no session token") {
		t.Errorf("error = %q", result.Error)
	}
}

func TestVerifyAll(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		auth := r.Header.Get("Authorization")
		if auth == "Bearer good" {
			w.WriteHeader(http.StatusOK)
		} else if auth == "" {
			// Health check (no auth).
			w.WriteHeader(http.StatusOK)
		} else {
			w.WriteHeader(http.StatusUnauthorized)
		}
	}))
	defer srv.Close()

	f := &File{
		Version: 1,
		Target:  srv.URL,
		Accounts: []Account{
			{ID: "good-acct", SessionToken: "good", Tier: TierFree},
			{ID: "bad-acct", SessionToken: "bad", Tier: TierFree},
			{ID: "no-token", Tier: TierFree},
		},
	}

	v := NewVerifier(srv.URL, nil)
	results := v.VerifyAll(context.Background(), f)

	// Should have 4 results: health + 3 accounts.
	if len(results) != 4 {
		t.Fatalf("results = %d, want 4", len(results))
	}

	// Health should pass.
	if !results[0].OK {
		t.Error("health should pass")
	}

	// good-acct should pass.
	if !results[1].OK {
		t.Errorf("good-acct should pass: %s", results[1].Error)
	}

	// bad-acct should fail.
	if results[2].OK {
		t.Error("bad-acct should fail")
	}

	// no-token should fail.
	if results[3].OK {
		t.Error("no-token should fail")
	}
}

func TestVerifyAllHealthFailed(t *testing.T) {
	// Server that's unreachable.
	v := NewVerifier("http://127.0.0.1:1", nil)
	f := &File{
		Version: 1,
		Target:  "http://127.0.0.1:1",
		Accounts: []Account{
			{ID: "acct-1", SessionToken: "tok", Tier: TierFree},
			{ID: "acct-2", SessionToken: "tok", Tier: TierFree},
		},
	}

	results := v.VerifyAll(context.Background(), f)
	// Health + 2 skipped accounts.
	if len(results) != 3 {
		t.Fatalf("results = %d, want 3", len(results))
	}

	for _, r := range results {
		if r.OK {
			t.Errorf("all results should fail when health fails: %s", r.AccountID)
		}
	}

	// Skipped accounts should say "skipped".
	for _, r := range results[1:] {
		if !strings.Contains(r.Error, "skipped") {
			t.Errorf("expected 'skipped' error, got: %s", r.Error)
		}
	}
}

// ---------- Summary + FormatVerifyResults ----------

func TestSummary(t *testing.T) {
	f := &File{
		Version: 1,
		Target:  "https://www.thepit.cloud",
		Accounts: []Account{
			{ID: "a", Tier: TierAnon},
			{ID: "b", Tier: TierFree, SessionToken: "tok", TokenExpiresAt: time.Now().Add(1 * time.Hour)},
			{ID: "c", Tier: TierPass, SessionToken: "tok", TokenExpiresAt: time.Now().Add(-1 * time.Hour)},
			{ID: "d", Tier: TierLab},
		},
	}

	s := Summary(f)
	if !strings.Contains(s, "4 total") {
		t.Errorf("summary missing total: %s", s)
	}
	if !strings.Contains(s, "anon: 1") {
		t.Errorf("summary missing anon count: %s", s)
	}
	if !strings.Contains(s, "1 active") {
		t.Errorf("summary missing active: %s", s)
	}
	if !strings.Contains(s, "1 expired") {
		t.Errorf("summary missing expired: %s", s)
	}
}

func TestFormatVerifyResults(t *testing.T) {
	results := []VerifyResult{
		{AccountID: "_health", OK: true, StatusCode: 200, Latency: 50 * time.Millisecond},
		{AccountID: "acct-1", OK: true, StatusCode: 200, Latency: 100 * time.Millisecond},
		{AccountID: "acct-2", OK: false, Error: "no session token"},
	}

	s := FormatVerifyResults(results)
	if !strings.Contains(s, "2 passed") {
		t.Errorf("should show 2 passed: %s", s)
	}
	if !strings.Contains(s, "1 failed") {
		t.Errorf("should show 1 failed: %s", s)
	}
	if !strings.Contains(s, "PASS") {
		t.Errorf("should contain PASS: %s", s)
	}
	if !strings.Contains(s, "FAIL") {
		t.Errorf("should contain FAIL: %s", s)
	}
}

// ---------- extractDomain ----------

func TestExtractDomain(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		{"https://www.thepit.cloud", "thepit.cloud"},
		{"http://localhost:3000", "localhost"},
		{"https://staging.thepit.cloud/path", "staging.thepit.cloud"},
		{"thepit.cloud", "thepit.cloud"},
		{"", "test.thepit.cloud"},
	}

	for _, tt := range tests {
		got := extractDomain(tt.input)
		if got != tt.want {
			t.Errorf("extractDomain(%q) = %q, want %q", tt.input, got, tt.want)
		}
	}
}

// ---------- generatePassword ----------

func TestGeneratePassword(t *testing.T) {
	p := generatePassword("casual")
	if p != "Storm_casual_2025!" {
		t.Errorf("password = %q", p)
	}
	// Deterministic — same seed should produce same password.
	p2 := generatePassword("casual")
	if p != p2 {
		t.Error("password should be deterministic")
	}
	// Different seeds should produce different passwords.
	p3 := generatePassword("lab")
	if p == p3 {
		t.Error("different seeds should produce different passwords")
	}
}

// ---------- Helpers ----------

func validJSON() string {
	f := File{
		Version: 1,
		Target:  "https://www.thepit.cloud",
		Accounts: []Account{
			{ID: "acct-anon", Tier: TierAnon},
			{ID: "acct-free", Email: "free@test.com", Password: "p", Tier: TierFree},
		},
	}
	data, _ := json.MarshalIndent(f, "", "  ")
	return string(data)
}

func testFile() *File {
	return &File{
		Version: 1,
		Target:  "https://www.thepit.cloud",
		Accounts: []Account{
			{ID: "account-free-lurker", Tier: TierAnon},
			{ID: "account-free-casual", Email: "casual@test.com", Password: "p", Tier: TierFree},
		},
	}
}

// ---------- VerifyAll skips anon accounts ----------

func TestVerifyAllSkipsAnon(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		auth := r.Header.Get("Authorization")
		if auth == "Bearer good" || auth == "" {
			w.WriteHeader(http.StatusOK)
		} else {
			w.WriteHeader(http.StatusUnauthorized)
		}
	}))
	defer srv.Close()

	f := &File{
		Version: 1,
		Target:  srv.URL,
		Accounts: []Account{
			{ID: "anon-acct", Tier: TierAnon},
			{ID: "good-acct", SessionToken: "good", Tier: TierFree},
		},
	}

	v := NewVerifier(srv.URL, nil)
	results := v.VerifyAll(context.Background(), f)

	// health + anon (skipped OK) + good-acct = 3
	if len(results) != 3 {
		t.Fatalf("results = %d, want 3", len(results))
	}

	// Anon should be OK with "skipped" message.
	anon := results[1]
	if !anon.OK {
		t.Errorf("anon should be OK (skipped), got error: %s", anon.Error)
	}
	if !strings.Contains(anon.Error, "skipped") {
		t.Errorf("anon error = %q, want 'skipped'", anon.Error)
	}

	// Good account should pass normally.
	if !results[2].OK {
		t.Errorf("good-acct should pass: %s", results[2].Error)
	}
}

// ---------- DefaultAccounts tier alignment ----------

func TestDefaultAccountsViralSharerTier(t *testing.T) {
	f := DefaultAccounts("https://www.thepit.cloud")
	for _, a := range f.Accounts {
		if a.ID == "account-viral-sharer" {
			if a.Tier != TierPass {
				t.Errorf("viral-sharer tier = %q, want %q", a.Tier, TierPass)
			}
			return
		}
	}
	t.Fatal("account-viral-sharer not found in DefaultAccounts")
}

// ---------- FormatVerifyResults error display ----------

func TestFormatVerifyResultsNetworkError(t *testing.T) {
	results := []VerifyResult{
		{
			AccountID:  "net-err-acct",
			OK:         false,
			StatusCode: 0,
			Latency:    50 * time.Millisecond,
			Error:      "connection refused",
		},
	}

	s := FormatVerifyResults(results)
	// Should show the error message, NOT "0" status.
	if strings.Contains(s, "  0  ") {
		t.Errorf("should not show status 0 for network errors: %s", s)
	}
	if !strings.Contains(s, "connection refused") {
		t.Errorf("should show error message: %s", s)
	}
}

// ---------- Atomic Save ----------

func TestSaveAtomicDoesNotCorrupt(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "accounts.json")

	original := &File{
		Version: 1,
		Target:  "https://test.thepit.cloud",
		Accounts: []Account{
			{ID: "acct-1", Email: "a@test.com", Password: "pass", Tier: TierFree},
		},
	}

	// Save twice to verify overwrite works atomically.
	if err := Save(path, original); err != nil {
		t.Fatalf("first Save: %v", err)
	}

	original.Accounts = append(original.Accounts, Account{
		ID: "acct-2", Email: "b@test.com", Password: "pass", Tier: TierFree,
	})
	if err := Save(path, original); err != nil {
		t.Fatalf("second Save: %v", err)
	}

	reloaded, err := Load(path)
	if err != nil {
		t.Fatalf("Load after atomic Save: %v", err)
	}
	if len(reloaded.Accounts) != 2 {
		t.Errorf("accounts = %d, want 2", len(reloaded.Accounts))
	}
}

func TestSaveNoTempFileLeftBehind(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "accounts.json")

	f := &File{
		Version: 1,
		Target:  "http://localhost",
		Accounts: []Account{
			{ID: "a", Email: "a@b.c", Password: "p", Tier: TierFree},
		},
	}
	if err := Save(path, f); err != nil {
		t.Fatalf("Save: %v", err)
	}

	entries, err := os.ReadDir(dir)
	if err != nil {
		t.Fatalf("ReadDir: %v", err)
	}
	for _, e := range entries {
		if strings.Contains(e.Name(), ".tmp") {
			t.Errorf("temp file left behind: %s", e.Name())
		}
	}
}

// ---------- Helpers ----------

func writeTemp(t *testing.T, content string) string {
	t.Helper()
	dir := t.TempDir()
	path := filepath.Join(dir, "accounts.json")
	if err := os.WriteFile(path, []byte(content), 0644); err != nil {
		t.Fatalf("write temp file: %v", err)
	}
	return path
}
