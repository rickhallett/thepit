[← Root](../README.md)

# shared

Common Go packages used by all CLI tools in the pit toolchain. This is a library module — it has no `main` package and produces no binary.

## Packages

### `config` — Environment loading

```go
import "github.com/rickhallett/thepit/shared/config"

cfg, err := config.Load()        // auto-detect .env
cfg, err := config.Load(path)    // explicit path
val := cfg.Get("ANTHROPIC_API_KEY")
```

Walks up from the caller's directory to find `.env`. Defines a `Schema` listing all known environment variables with required/optional flags and descriptions.

### `db` — PostgreSQL client

```go
import "github.com/rickhallett/thepit/shared/db"

conn, err := db.Connect(databaseURL)
defer conn.Close()

err = conn.Ping(ctx)
err = conn.QueryVal(ctx, &result, "SELECT count(*) FROM users")
stats, err := conn.GetTableStats(ctx)
size, err := conn.TotalSize(ctx)
```

Wraps `database/sql` with `lib/pq`. Provides typed query helpers and database introspection.

### `theme` — Terminal styling

```go
import "github.com/rickhallett/thepit/shared/theme"

fmt.Println(theme.Title.Render("HEADER"))
fmt.Println(theme.Success.Render("OK"))
fmt.Println(theme.Error.Render("FAIL"))
fmt.Println(theme.Muted.Render("hint text"))
```

Tokyo Night colour palette via lipgloss. Styles: `Title`, `Success`, `Error`, `Warning`, `Muted`, `Bold`, `StatusOK`, `StatusWarn`, `StatusBad`. Also provides `BorderStyle()` for boxed output.

### `format` — Display formatting

```go
import "github.com/rickhallett/thepit/shared/format"

format.Num(1234567)          // "1,234,567"
format.Credits(150000)       // "1,500.00"
format.RelativeTime(t)       // "3 hours ago"
format.Duration(d)           // "2m 30s"
format.Percent(0.847)        // "84.7%"
format.TruncateID("abc-123-def", 8)  // "abc-123..."
```

### `license` — Lab-tier licensing

```go
import "github.com/rickhallett/thepit/shared/license"

// Key generation
pub, priv, err := license.GenerateKeyPair()

// Signing (server/admin side)
token, err := license.Sign(priv, userID, "lab")

// Verification (CLI side)
claims, err := license.Verify(token, pub)

// Guard for premium commands
license.RequireLabTier(publicKeyHex)  // exits if no valid license
```

Ed25519-based license tokens (JWT-like). CLI tools embed a public key at build time via `-ldflags`. Licenses are loaded from `~/.pit/license.jwt` or `$PITLAB_LICENSE`. In dev builds (empty public key), the check is skipped.

## Dependencies

| Package | Purpose |
|---------|---------|
| `github.com/charmbracelet/lipgloss` | Terminal styling |
| `github.com/joho/godotenv` | `.env` parsing |
| `github.com/lib/pq` | PostgreSQL driver |

---

[← Root](../README.md) · [pitctl](../pitctl/README.md) · [pitforge](../pitforge/README.md) · [pitbench](../pitbench/README.md) · [pitlab](../pitlab/README.md) · [pitnet](../pitnet/README.md)
