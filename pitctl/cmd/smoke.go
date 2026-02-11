package cmd

import (
	"crypto/tls"
	"fmt"
	"net/http"
	"time"

	"github.com/charmbracelet/lipgloss"
	"github.com/charmbracelet/lipgloss/table"

	"github.com/rickhallett/thepit/pitctl/internal/format"
	"github.com/rickhallett/thepit/pitctl/internal/theme"
)

// SmokeRoutes are the routes to test.
var SmokeRoutes = []string{
	"/",
	"/arena",
	"/leaderboard",
	"/agents",
	"/research",
	"/roadmap",
	"/contact",
	"/sign-in",
	"/sign-up",
}

// RunSmoke performs HTTP health checks against the application.
func RunSmoke(baseURL string) error {
	fmt.Println()
	fmt.Println(theme.Title.Render(fmt.Sprintf("smoke test")))
	fmt.Println(theme.Subtitle.Render(baseURL))
	fmt.Println()

	client := &http.Client{
		Timeout: 15 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse // don't follow redirects
		},
	}

	var tableRows [][]string
	okCount := 0
	var totalLatency time.Duration

	for _, route := range SmokeRoutes {
		url := baseURL + route
		start := time.Now()
		resp, err := client.Get(url)
		elapsed := time.Since(start)
		totalLatency += elapsed

		if err != nil {
			tableRows = append(tableRows, []string{
				route,
				"ERR",
				format.Duration(elapsed),
			})
			continue
		}
		resp.Body.Close()

		status := fmt.Sprintf("%d", resp.StatusCode)
		tableRows = append(tableRows, []string{
			route,
			status,
			format.Duration(elapsed),
		})

		if resp.StatusCode >= 200 && resp.StatusCode < 400 {
			okCount++
		}
	}

	t := table.New().
		Border(lipgloss.RoundedBorder()).
		BorderStyle(theme.BorderStyle()).
		Headers("Route", "Status", "Latency").
		Rows(tableRows...).
		StyleFunc(func(row, col int) lipgloss.Style {
			base := lipgloss.NewStyle().Padding(0, 1)
			if row == -1 {
				return base.Bold(true).Foreground(theme.ColorBlue).Align(lipgloss.Center)
			}
			if col == 0 {
				return base.Foreground(theme.ColorCyan)
			}
			if col == 1 {
				// Color status by value.
				if row >= 0 && row < len(tableRows) {
					s := tableRows[row][1]
					if s == "200" || s == "301" || s == "302" || s == "307" || s == "308" {
						return base.Foreground(theme.ColorGreen).Align(lipgloss.Right)
					}
					return base.Foreground(theme.ColorRed).Align(lipgloss.Right)
				}
			}
			return base.Foreground(theme.ColorFg).Align(lipgloss.Right)
		})

	fmt.Println(t.Render())
	fmt.Println()

	// TLS cert check for HTTPS URLs.
	if len(baseURL) > 8 && baseURL[:8] == "https://" {
		checkTLS(baseURL)
	}

	avgLatency := totalLatency / time.Duration(len(SmokeRoutes))
	summary := fmt.Sprintf("  %d/%d routes OK   avg %s",
		okCount, len(SmokeRoutes), format.Duration(avgLatency))
	if okCount == len(SmokeRoutes) {
		fmt.Println(theme.Success.Render(summary))
	} else {
		fmt.Println(theme.Error.Render(summary))
	}
	fmt.Println()

	return nil
}

func checkTLS(baseURL string) {
	// Extract hostname.
	host := baseURL[8:]
	if idx := len(host) - 1; idx >= 0 {
		for i, c := range host {
			if c == '/' || c == ':' {
				host = host[:i]
				break
			}
		}
	}

	conn, err := tls.Dial("tcp", host+":443", &tls.Config{
		MinVersion: tls.VersionTLS12,
	})
	if err != nil {
		fmt.Printf("  %s\n", theme.StatusBad.Render(fmt.Sprintf("TLS error: %v", err)))
		return
	}
	defer conn.Close()

	certs := conn.ConnectionState().PeerCertificates
	if len(certs) > 0 {
		expiry := certs[0].NotAfter
		daysLeft := int(time.Until(expiry).Hours() / 24)
		msg := fmt.Sprintf("  TLS cert valid until %s (%d days)", format.Date(expiry), daysLeft)
		if daysLeft < 30 {
			fmt.Println(theme.StatusWarn.Render(msg))
		} else {
			fmt.Println(theme.StatusOK.Render(msg))
		}
	}
}
