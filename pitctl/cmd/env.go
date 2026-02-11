package cmd

import (
	"context"
	"crypto/tls"
	"fmt"
	"net/http"
	"time"

	"github.com/rickhallett/thepit/pitctl/internal/config"
	"github.com/rickhallett/thepit/pitctl/internal/db"
	"github.com/rickhallett/thepit/pitctl/internal/theme"
)

// RunEnv validates environment variables and optionally checks connectivity.
func RunEnv(cfg *config.Config, checkConnections bool) error {
	fmt.Println()
	fmt.Println(theme.Title.Render("environment check"))
	if cfg.EnvPath != "" {
		fmt.Println(theme.Subtitle.Render(fmt.Sprintf("source: %s", cfg.EnvPath)))
	}
	fmt.Println()

	setCount := 0
	requiredCount := 0
	requiredSet := 0

	for _, spec := range config.Schema {
		if spec.Required {
			requiredCount++
		}

		label := theme.Muted.Render(fmt.Sprintf("  %-36s", spec.Name))
		if cfg.IsSet(spec.Name) {
			setCount++
			if spec.Required {
				requiredSet++
			}
			fmt.Printf("%s %s", label, theme.StatusOK.Render("set"))

			// Connection checks for specific vars.
			if checkConnections {
				switch spec.Name {
				case "DATABASE_URL":
					if lat, err := checkDB(cfg.Get("DATABASE_URL")); err != nil {
						fmt.Printf("    %s", theme.StatusBad.Render(fmt.Sprintf("error: %v", err)))
					} else {
						fmt.Printf("    %s", theme.StatusOK.Render(fmt.Sprintf("connected (%dms)", lat.Milliseconds())))
					}
				case "STRIPE_SECRET_KEY":
					if err := checkStripe(cfg.Get("STRIPE_SECRET_KEY")); err != nil {
						fmt.Printf("    %s", theme.StatusBad.Render(fmt.Sprintf("error: %v", err)))
					} else {
						fmt.Printf("    %s", theme.StatusOK.Render("valid"))
					}
				}
			}

			fmt.Println()
		} else {
			status := theme.StatusWarn.Render("not set")
			if spec.Required {
				status = theme.StatusBad.Render("MISSING")
			}
			suffix := ""
			if !spec.Required {
				suffix = theme.Muted.Render("  (optional)")
			}
			fmt.Printf("%s %s%s\n", label, status, suffix)
		}
	}

	// Boolean feature flags — show their enabled/disabled state.
	fmt.Println()
	flags := []string{"SUBSCRIPTIONS_ENABLED", "CREDITS_ENABLED", "BYOK_ENABLED", "EAS_ENABLED", "ASK_THE_PIT_ENABLED"}
	for _, f := range flags {
		label := theme.Muted.Render(fmt.Sprintf("  %-36s", f))
		if cfg.IsEnabled(f) {
			fmt.Printf("%s %s\n", label, theme.StatusOK.Render("enabled"))
		} else {
			fmt.Printf("%s %s\n", label, theme.Muted.Render("disabled"))
		}
	}

	fmt.Println()
	summary := fmt.Sprintf("  %d/%d required vars set, %d/%d total vars set",
		requiredSet, requiredCount, setCount, len(config.Schema))
	if requiredSet == requiredCount {
		fmt.Println(theme.Success.Render(summary))
	} else {
		fmt.Println(theme.Error.Render(summary))
	}
	fmt.Println()

	return nil
}

func checkDB(databaseURL string) (time.Duration, error) {
	conn, err := db.Connect(databaseURL)
	if err != nil {
		return 0, err
	}
	defer conn.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	return conn.Ping(ctx)
}

func checkStripe(secretKey string) error {
	if secretKey == "" {
		return fmt.Errorf("not set")
	}

	req, err := http.NewRequest("GET", "https://api.stripe.com/v1/balance", nil)
	if err != nil {
		return err
	}
	req.SetBasicAuth(secretKey, "")

	client := &http.Client{
		Timeout: 10 * time.Second,
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{MinVersion: tls.VersionTLS12},
		},
	}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return fmt.Errorf("HTTP %d", resp.StatusCode)
	}
	return nil
}
