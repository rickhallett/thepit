package cmd

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"
)

// TTL constants for different query types.
const (
	TTLMetadata   = 1 * time.Hour    // teams, states, labels — semi-static
	TTLIssueRead  = 5 * time.Minute  // individual issue lookups
	TTLIdentifier = 10 * time.Minute // OCE-22 → UUID resolution
)

// DiskCache provides TTL-based JSON file caching in ~/.cache/pitlinear/.
// Each entry is a separate JSON file keyed by SHA256(category + params).
// The cache is cross-invocation: different pitlinear processes share it.
type DiskCache struct {
	dir     string
	enabled bool
}

// cacheEntry wraps cached data with an expiration timestamp.
type cacheEntry struct {
	Data    json.RawMessage `json:"data"`
	Expires int64           `json:"expires"` // unix seconds
}

// NewDiskCache creates a cache rooted at ~/.cache/pitlinear/.
// If the directory cannot be created, the cache operates in disabled mode
// (all reads miss, all writes are no-ops) rather than returning an error.
func NewDiskCache(enabled bool) *DiskCache {
	if !enabled {
		return &DiskCache{enabled: false}
	}

	home, err := os.UserHomeDir()
	if err != nil {
		return &DiskCache{enabled: false}
	}

	dir := filepath.Join(home, ".cache", "pitlinear")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return &DiskCache{enabled: false}
	}

	return &DiskCache{dir: dir, enabled: true}
}

// cacheKey produces a stable, filesystem-safe key from a category and params.
func cacheKey(category string, params ...string) string {
	h := sha256.New()
	h.Write([]byte(category))
	for _, p := range params {
		h.Write([]byte{0}) // separator
		h.Write([]byte(p))
	}
	return hex.EncodeToString(h.Sum(nil))[:16] // 16 hex chars is plenty
}

// Get retrieves a cached value. Returns nil if the cache is disabled, the
// key does not exist, or the entry has expired. The caller must unmarshal
// the returned json.RawMessage into their expected type.
func (c *DiskCache) Get(category string, params ...string) json.RawMessage {
	if !c.enabled {
		return nil
	}

	key := cacheKey(category, params...)
	path := filepath.Join(c.dir, key+".json")

	data, err := os.ReadFile(path)
	if err != nil {
		return nil // miss
	}

	var entry cacheEntry
	if err := json.Unmarshal(data, &entry); err != nil {
		// Corrupt entry — remove it silently.
		os.Remove(path)
		return nil
	}

	if time.Now().Unix() >= entry.Expires {
		// Expired — remove it.
		os.Remove(path)
		return nil
	}

	return entry.Data
}

// Set stores a value in the cache with the given TTL. If the cache is
// disabled or the write fails, the error is silently ignored — caching
// is best-effort and must never block the primary operation.
func (c *DiskCache) Set(ttl time.Duration, category string, value any, params ...string) {
	if !c.enabled {
		return
	}

	raw, err := json.Marshal(value)
	if err != nil {
		return
	}

	entry := cacheEntry{
		Data:    raw,
		Expires: time.Now().Add(ttl).Unix(),
	}

	data, err := json.Marshal(entry)
	if err != nil {
		return
	}

	key := cacheKey(category, params...)
	path := filepath.Join(c.dir, key+".json")

	// Write atomically: write to temp file, then rename.
	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, data, 0o644); err != nil {
		return
	}
	os.Rename(tmp, path)
}

// Delete removes a single cached entry.
func (c *DiskCache) Delete(category string, params ...string) {
	if !c.enabled {
		return
	}
	key := cacheKey(category, params...)
	path := filepath.Join(c.dir, key+".json")
	os.Remove(path)
}

// Clear removes all cached files.
func (c *DiskCache) Clear() (int, error) {
	if !c.enabled || c.dir == "" {
		return 0, fmt.Errorf("cache is disabled")
	}

	entries, err := os.ReadDir(c.dir)
	if err != nil {
		return 0, err
	}

	removed := 0
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		if filepath.Ext(e.Name()) == ".json" {
			if err := os.Remove(filepath.Join(c.dir, e.Name())); err == nil {
				removed++
			}
		}
	}
	return removed, nil
}

// Stats returns cache directory statistics.
func (c *DiskCache) Stats() (entries int, bytes int64, dir string) {
	dir = c.dir
	if !c.enabled || c.dir == "" {
		return 0, 0, ""
	}

	dirEntries, err := os.ReadDir(c.dir)
	if err != nil {
		return 0, 0, dir
	}

	for _, e := range dirEntries {
		if e.IsDir() || filepath.Ext(e.Name()) != ".json" {
			continue
		}
		entries++
		if info, err := e.Info(); err == nil {
			bytes += info.Size()
		}
	}
	return entries, bytes, dir
}
