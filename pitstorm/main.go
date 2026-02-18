package main

import (
	"flag"
	"fmt"
	"os"

	"github.com/rickhallett/thepit/shared/config"
	"github.com/rickhallett/thepit/shared/theme"
)

var version = "dev"

func main() {
	envPath := flag.String("env", "", "path to .env file")
	flag.Usage = usage
	flag.Parse()

	args := flag.Args()
	if len(args) == 0 {
		usage()
		os.Exit(0)
	}

	if args[0] == "version" {
		fmt.Printf("pitstorm %s\n", version)
		return
	}

	// Load config once — resolves .env → .env.local → shell env.
	cfg, err := config.Load(*envPath)
	if err != nil {
		fatal("config", err)
	}

	switch args[0] {
	case "run":
		runCmd(cfg, args[1:])
	case "plan":
		planCmd(args[1:])
	case "setup":
		setupCmd(cfg, args[1:])
	case "login":
		loginCmd(cfg, args[1:])
	case "verify":
		verifyCmd(args[1:])
	case "report":
		reportCmd(args[1:])
	default:
		fmt.Fprintf(os.Stderr, "%s unknown command %q\n", theme.Error.Render("error:"), args[0])
		usage()
		os.Exit(1)
	}
}

func usage() {
	fmt.Fprintf(os.Stderr, "\n%s\n\n",
		theme.Title.Render("pitstorm — release traffic simulator for THE PIT"))
	fmt.Fprintf(os.Stderr, "Usage:\n")
	fmt.Fprintf(os.Stderr, "  pitstorm [global flags] <command> [command flags]\n\n")
	fmt.Fprintf(os.Stderr, "Global Flags:\n")
	fmt.Fprintf(os.Stderr, "  --env <path>         Path to .env file (auto-resolved if omitted)\n\n")
	fmt.Fprintf(os.Stderr, "Commands:\n")
	fmt.Fprintf(os.Stderr, "  run [flags]    Execute traffic simulation\n")
	fmt.Fprintf(os.Stderr, "  plan [flags]   Dry run — estimate cost and show execution plan\n")
	fmt.Fprintf(os.Stderr, "  setup [flags]  Provision test accounts in Clerk + DB\n")
	fmt.Fprintf(os.Stderr, "  login [flags]  Sign in all accounts via Clerk and obtain session tokens\n")
	fmt.Fprintf(os.Stderr, "  verify         Validate account credentials and API connectivity\n")
	fmt.Fprintf(os.Stderr, "  report <file>  Parse JSON output into a summary report\n")
	fmt.Fprintf(os.Stderr, "  version        Show version\n\n")
	fmt.Fprintf(os.Stderr, "Login Flags:\n")
	fmt.Fprintf(os.Stderr, "  --accounts <path>    Path to accounts.json (default: ./accounts.json)\n")
	fmt.Fprintf(os.Stderr, "  --key <pk_...>       Clerk publishable key (default: from env/config)\n")
	fmt.Fprintf(os.Stderr, "  --secret <sk_...>    Clerk secret key for ticket flow (default: from env/config)\n\n")
	fmt.Fprintf(os.Stderr, "Run Flags:\n")
	fmt.Fprintf(os.Stderr, "  --target <url>       Target URL (default: https://www.thepit.cloud)\n")
	fmt.Fprintf(os.Stderr, "  --accounts <path>    Path to accounts.json (default: ./accounts.json)\n")
	fmt.Fprintf(os.Stderr, "  --profile <name>     Traffic profile: trickle|steady|ramp|spike|viral (default: steady)\n")
	fmt.Fprintf(os.Stderr, "  --rate <n>           Target peak req/s (default: 5)\n")
	fmt.Fprintf(os.Stderr, "  --duration <dur>     Simulation duration (default: 10m)\n")
	fmt.Fprintf(os.Stderr, "  --budget <gbp>       Max spend in GBP (default: 10.0)\n")
	fmt.Fprintf(os.Stderr, "  --workers <n>        Concurrent worker goroutines (default: 16)\n")
	fmt.Fprintf(os.Stderr, "  --personas <list>    Persona mix: all|free-only|paid-only|stress or comma-separated (default: all)\n")
	fmt.Fprintf(os.Stderr, "  --instance <n/m>     Instance partitioning, e.g. 1/3 (default: 1/1)\n")
	fmt.Fprintf(os.Stderr, "  --output <path>      JSON output file (default: stdout)\n")
	fmt.Fprintf(os.Stderr, "  --status <path>      Live status JSON file (default: results/.live-status.json)\n")
	fmt.Fprintf(os.Stderr, "  --no-status          Disable live status file\n")
	fmt.Fprintf(os.Stderr, "  --verbose            Log every request\n\n")
}

func fatal(ctx string, err error) {
	fmt.Fprintf(os.Stderr, "\n  %s %v\n\n", theme.Error.Render(ctx+":"), err)
	os.Exit(1)
}

func fatalf(ctx string, format string, args ...any) {
	fmt.Fprintf(os.Stderr, "\n  %s %s\n\n", theme.Error.Render(ctx+":"), fmt.Sprintf(format, args...))
	os.Exit(1)
}
