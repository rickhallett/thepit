package main

import (
	"flag"
	"fmt"
	"os"
	"strconv"

	"github.com/rickhallett/thepit/pitctl/cmd"
	"github.com/rickhallett/thepit/pitctl/internal/config"
	"github.com/rickhallett/thepit/pitctl/internal/theme"
)

var version = "dev"

func main() {
	// Global flags.
	envPath := flag.String("env", "", "path to .env file")
	yes := flag.Bool("yes", false, "skip confirmation prompts")
	flag.Usage = usage
	flag.Parse()

	args := flag.Args()
	if len(args) == 0 {
		usage()
		os.Exit(0)
	}

	cfg, err := config.Load(*envPath)
	if err != nil {
		fatal("config", err)
	}

	switch args[0] {
	case "status":
		must("status", cmd.RunStatus(cfg))
	case "env":
		checkConn := hasFlag(args[1:], "--check-connections")
		must("env", cmd.RunEnv(cfg, checkConn))
	case "db":
		runDB(cfg, args[1:])
	case "users":
		runUsers(cfg, args[1:], *yes)
	case "credits":
		runCredits(cfg, args[1:], *yes)
	case "bouts":
		runBouts(cfg, args[1:], *yes)
	case "agents":
		runAgents(cfg, args[1:], *yes)
	case "smoke":
		url := cfg.AppURL
		if u := flagVal(args[1:], "--url"); u != "" {
			url = u
		}
		must("smoke", cmd.RunSmoke(url))
	case "export":
		runExport(cfg, args[1:])
	case "version":
		fmt.Printf("pitctl %s\n", version)
	default:
		fmt.Fprintf(os.Stderr, "%s unknown command %q\n", theme.Error.Render("error:"), args[0])
		usage()
		os.Exit(1)
	}
}

func runDB(cfg *config.Config, args []string) {
	if len(args) == 0 {
		must("db", cmd.RunDBStats(cfg))
		return
	}
	switch args[0] {
	case "ping":
		must("db ping", cmd.RunDBPing(cfg))
	case "stats":
		must("db stats", cmd.RunDBStats(cfg))
	default:
		fatalf("db", "unknown subcommand %q", args[0])
	}
}

func runUsers(cfg *config.Config, args []string, confirmed bool) {
	if len(args) == 0 {
		must("users", cmd.RunUsersList(cfg, cmd.UsersListOpts{}))
		return
	}
	switch args[0] {
	case "inspect":
		if len(args) < 2 {
			fatalf("users inspect", "user ID required")
		}
		must("users inspect", cmd.RunUsersInspect(cfg, args[1]))
	case "set-tier":
		if len(args) < 3 {
			fatalf("users set-tier", "usage: pitctl users set-tier <userId> <tier>")
		}
		must("users set-tier", cmd.RunUsersSetTier(cfg, args[1], args[2], confirmed))
	default:
		// Treat as list with flags.
		opts := cmd.UsersListOpts{
			Tier:   flagVal(args, "--tier"),
			Search: flagVal(args, "--search"),
			Sort:   flagVal(args, "--sort"),
		}
		if l := flagVal(args, "--limit"); l != "" {
			opts.Limit, _ = strconv.Atoi(l)
		}
		must("users", cmd.RunUsersList(cfg, opts))
	}
}

func runCredits(cfg *config.Config, args []string, confirmed bool) {
	if len(args) == 0 {
		must("credits", cmd.RunCreditsSummary(cfg))
		return
	}
	switch args[0] {
	case "balance":
		if len(args) < 2 {
			fatalf("credits balance", "user ID required")
		}
		must("credits balance", cmd.RunCreditsBalance(cfg, args[1]))
	case "grant":
		if len(args) < 3 {
			fatalf("credits grant", "usage: pitctl credits grant <userId> <amount>")
		}
		amount, err := strconv.ParseInt(args[2], 10, 64)
		if err != nil {
			fatalf("credits grant", "invalid amount: %v", err)
		}
		must("credits grant", cmd.RunCreditsGrant(cfg, args[1], amount, confirmed))
	case "ledger":
		if len(args) < 2 {
			fatalf("credits ledger", "user ID required")
		}
		limit := 50
		if l := flagVal(args[2:], "--limit"); l != "" {
			limit, _ = strconv.Atoi(l)
		}
		must("credits ledger", cmd.RunCreditsLedger(cfg, args[1], limit))
	case "summary":
		must("credits summary", cmd.RunCreditsSummary(cfg))
	default:
		fatalf("credits", "unknown subcommand %q", args[0])
	}
}

func runBouts(cfg *config.Config, args []string, confirmed bool) {
	if len(args) == 0 {
		must("bouts", cmd.RunBoutsList(cfg, cmd.BoutsListOpts{}))
		return
	}
	switch args[0] {
	case "inspect":
		if len(args) < 2 {
			fatalf("bouts inspect", "bout ID required")
		}
		must("bouts inspect", cmd.RunBoutsInspect(cfg, args[1]))
	case "stats":
		must("bouts stats", cmd.RunBoutsStats(cfg))
	case "purge-errors":
		must("bouts purge-errors", cmd.RunBoutsPurgeErrors(cfg, confirmed))
	default:
		opts := cmd.BoutsListOpts{
			Status: flagVal(args, "--status"),
			Owner:  flagVal(args, "--owner"),
		}
		if l := flagVal(args, "--limit"); l != "" {
			opts.Limit, _ = strconv.Atoi(l)
		}
		must("bouts", cmd.RunBoutsList(cfg, opts))
	}
}

func runAgents(cfg *config.Config, args []string, confirmed bool) {
	if len(args) == 0 {
		must("agents", cmd.RunAgentsList(cfg, cmd.AgentsListOpts{}))
		return
	}
	switch args[0] {
	case "inspect":
		if len(args) < 2 {
			fatalf("agents inspect", "agent ID required")
		}
		must("agents inspect", cmd.RunAgentsInspect(cfg, args[1]))
	case "archive":
		if len(args) < 2 {
			fatalf("agents archive", "agent ID required")
		}
		must("agents archive", cmd.RunAgentsArchive(cfg, args[1], confirmed))
	case "restore":
		if len(args) < 2 {
			fatalf("agents restore", "agent ID required")
		}
		must("agents restore", cmd.RunAgentsRestore(cfg, args[1], confirmed))
	default:
		opts := cmd.AgentsListOpts{
			Archived: hasFlag(args, "--archived"),
			Flagged:  hasFlag(args, "--flagged"),
		}
		if l := flagVal(args, "--limit"); l != "" {
			opts.Limit, _ = strconv.Atoi(l)
		}
		must("agents", cmd.RunAgentsList(cfg, opts))
	}
}

func runExport(cfg *config.Config, args []string) {
	if len(args) == 0 {
		fatalf("export", "specify a resource: bouts, agents")
	}
	switch args[0] {
	case "bouts":
		since := flagVal(args[1:], "--since")
		must("export bouts", cmd.RunExportBouts(cfg, since))
	case "agents":
		must("export agents", cmd.RunExportAgents(cfg))
	default:
		fatalf("export", "unknown resource %q", args[0])
	}
}

// --- helpers ---

func usage() {
	fmt.Fprintf(os.Stderr, "\n%s\n\n",
		theme.Title.Render("pitctl — site administration for THE PIT"))
	fmt.Fprintf(os.Stderr, "Usage:\n")
	fmt.Fprintf(os.Stderr, "  pitctl [flags] <command> [subcommand] [args...]\n\n")
	fmt.Fprintf(os.Stderr, "Commands:\n")
	fmt.Fprintf(os.Stderr, "  status                         Dashboard overview\n")
	fmt.Fprintf(os.Stderr, "  env [--check-connections]       Validate environment variables\n")
	fmt.Fprintf(os.Stderr, "  db [ping|stats]                Database introspection\n")
	fmt.Fprintf(os.Stderr, "  users [inspect|set-tier]       User management\n")
	fmt.Fprintf(os.Stderr, "  credits [balance|grant|ledger|summary]\n")
	fmt.Fprintf(os.Stderr, "  bouts [inspect|stats|purge-errors]\n")
	fmt.Fprintf(os.Stderr, "  agents [inspect|archive|restore]\n")
	fmt.Fprintf(os.Stderr, "  smoke [--url <url>]            HTTP health checks\n")
	fmt.Fprintf(os.Stderr, "  export [bouts|agents]          Research data export\n")
	fmt.Fprintf(os.Stderr, "  version                        Show version\n\n")
	fmt.Fprintf(os.Stderr, "Flags:\n")
	fmt.Fprintf(os.Stderr, "  --env <path>  Path to .env file (default: auto-detect)\n")
	fmt.Fprintf(os.Stderr, "  --yes         Skip confirmation prompts for write operations\n\n")
}

func must(ctx string, err error) {
	if err != nil {
		fatal(ctx, err)
	}
}

func fatal(ctx string, err error) {
	fmt.Fprintf(os.Stderr, "\n  %s %v\n\n", theme.Error.Render(ctx+":"), err)
	os.Exit(1)
}

func fatalf(ctx, format string, args ...interface{}) {
	fatal(ctx, fmt.Errorf(format, args...))
}

// hasFlag checks if a flag is present in args.
func hasFlag(args []string, name string) bool {
	for _, a := range args {
		if a == name {
			return true
		}
	}
	return false
}

// flagVal returns the value following a flag name, or empty string.
func flagVal(args []string, name string) string {
	for i, a := range args {
		if a == name && i+1 < len(args) {
			return args[i+1]
		}
	}
	return ""
}
