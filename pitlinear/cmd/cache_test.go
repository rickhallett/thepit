package cmd

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"
)

// testCache creates a DiskCache in a temp directory for testing.
func testCache(t *testing.T) *DiskCache {
	t.Helper()
	dir := t.TempDir()
	return &DiskCache{dir: dir, enabled: true}
}

func TestDiskCache_SetGet(t *testing.T) {
	c := testCache(t)

	// Set a value.
	c.Set(5*time.Minute, "test", map[string]string{"key": "value"})

	// Get it back.
	raw := c.Get("test")
	if raw == nil {
		t.Fatal("expected cache hit, got miss")
	}

	var result map[string]string
	if err := json.Unmarshal(raw, &result); err != nil {
		t.Fatalf("unmarshal error: %v", err)
	}
	if result["key"] != "value" {
		t.Errorf("expected 'value', got %q", result["key"])
	}
}

func TestDiskCache_SetGetWithParams(t *testing.T) {
	c := testCache(t)

	// Set with params.
	c.Set(5*time.Minute, "states", []string{"Todo", "Done"}, "team-1")

	// Get with same params — hit.
	raw := c.Get("states", "team-1")
	if raw == nil {
		t.Fatal("expected cache hit with matching params, got miss")
	}

	// Get with different params — miss.
	raw = c.Get("states", "team-2")
	if raw != nil {
		t.Fatal("expected cache miss with different params, got hit")
	}

	// Get with no params — miss (different key).
	raw = c.Get("states")
	if raw != nil {
		t.Fatal("expected cache miss with no params, got hit")
	}
}

func TestDiskCache_TTLExpiry(t *testing.T) {
	c := testCache(t)

	// Set with 0 TTL (already expired).
	c.Set(0, "expired", "data")

	// Should miss.
	raw := c.Get("expired")
	if raw != nil {
		t.Fatal("expected cache miss for expired entry, got hit")
	}
}

func TestDiskCache_Disabled(t *testing.T) {
	c := NewDiskCache(false)

	// Set should not panic.
	c.Set(5*time.Minute, "test", "data")

	// Get should return nil.
	raw := c.Get("test")
	if raw != nil {
		t.Fatal("expected nil from disabled cache, got data")
	}

	// Delete should not panic.
	c.Delete("test")

	// Clear should return error.
	_, err := c.Clear()
	if err == nil {
		t.Fatal("expected error from disabled cache Clear()")
	}

	// Stats should return zero values.
	entries, bytes, dir := c.Stats()
	if entries != 0 || bytes != 0 || dir != "" {
		t.Errorf("expected zero stats from disabled cache, got entries=%d bytes=%d dir=%q", entries, bytes, dir)
	}
}

func TestDiskCache_Delete(t *testing.T) {
	c := testCache(t)

	// Set and verify.
	c.Set(5*time.Minute, "issue", "data", "iss-1")
	if c.Get("issue", "iss-1") == nil {
		t.Fatal("expected cache hit before delete")
	}

	// Delete.
	c.Delete("issue", "iss-1")

	// Should miss now.
	if c.Get("issue", "iss-1") != nil {
		t.Fatal("expected cache miss after delete, got hit")
	}
}

func TestDiskCache_Clear(t *testing.T) {
	c := testCache(t)

	// Set several entries.
	c.Set(5*time.Minute, "teams", []string{"a"})
	c.Set(5*time.Minute, "states", []string{"b"}, "t1")
	c.Set(5*time.Minute, "labels", []string{"c"}, "t1")

	// Clear all.
	removed, err := c.Clear()
	if err != nil {
		t.Fatalf("Clear() error: %v", err)
	}
	if removed != 3 {
		t.Errorf("expected 3 removed, got %d", removed)
	}

	// All should miss now.
	if c.Get("teams") != nil {
		t.Error("expected miss for teams after clear")
	}
	if c.Get("states", "t1") != nil {
		t.Error("expected miss for states after clear")
	}
}

func TestDiskCache_Stats(t *testing.T) {
	c := testCache(t)

	// Empty cache.
	entries, bytes, dir := c.Stats()
	if entries != 0 || bytes != 0 {
		t.Errorf("expected 0 entries/bytes for empty cache, got %d/%d", entries, bytes)
	}
	if dir == "" {
		t.Error("expected non-empty dir for enabled cache")
	}

	// Add entries.
	c.Set(5*time.Minute, "teams", []string{"alpha"})
	c.Set(5*time.Minute, "states", []string{"todo"}, "t1")

	entries, bytes, _ = c.Stats()
	if entries != 2 {
		t.Errorf("expected 2 entries, got %d", entries)
	}
	if bytes == 0 {
		t.Error("expected non-zero bytes")
	}
}

func TestDiskCache_CorruptEntry(t *testing.T) {
	c := testCache(t)

	// Write a corrupt file directly.
	key := cacheKey("corrupt")
	path := filepath.Join(c.dir, key+".json")
	os.WriteFile(path, []byte("not json{{{"), 0o644)

	// Get should return nil and remove the corrupt file.
	raw := c.Get("corrupt")
	if raw != nil {
		t.Fatal("expected nil for corrupt entry")
	}

	// File should be removed.
	if _, err := os.Stat(path); !os.IsNotExist(err) {
		t.Error("expected corrupt file to be removed")
	}
}

func TestDiskCache_AtomicWrite(t *testing.T) {
	c := testCache(t)

	// Write a value — no .tmp files should remain.
	c.Set(5*time.Minute, "atomic", "data")

	entries, err := os.ReadDir(c.dir)
	if err != nil {
		t.Fatalf("ReadDir error: %v", err)
	}
	for _, e := range entries {
		if filepath.Ext(e.Name()) == ".tmp" {
			t.Errorf("found leftover .tmp file: %s", e.Name())
		}
	}
}

func TestCacheKey_Deterministic(t *testing.T) {
	k1 := cacheKey("states", "team-1")
	k2 := cacheKey("states", "team-1")
	k3 := cacheKey("states", "team-2")

	if k1 != k2 {
		t.Error("same inputs produced different keys")
	}
	if k1 == k3 {
		t.Error("different inputs produced same key")
	}
}

func TestCacheKey_CategorySeparation(t *testing.T) {
	// Ensure "states" + "team-1" != "states\x00team" + "-1"
	k1 := cacheKey("states", "team-1")
	k2 := cacheKey("labels", "team-1")
	if k1 == k2 {
		t.Error("different categories produced same key")
	}
}
