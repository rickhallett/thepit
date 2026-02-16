package main

import (
	"flag"
	"fmt"
	"io"
	"os"
	"strconv"

	"github.com/rickhallett/thepit/pitlinear/cmd"
	"github.com/rickhallett/thepit/shared/config"
	"github.com/rickhallett/thepit/shared/theme"
)

var version = "dev"

func main() {
	// Global flags.
	envPath := flag.String("env", "", "path to .env file")
	jsonOut := flag.Bool("json", false, "output as JSON")
	flag.Usage = usage
	flag.Parse()

	args := flag.Args()
	if len(args) == 0 {
		usage()
		os.Exit(0)
	}

	// Handle version before config loading (no API key needed).
	if args[0] == "version" {
		fmt.Printf("pitlinear %s\n", version)
		return
	}

	// Load config — we need LINEAR_API_KEY and LINEAR_TEAM_NAME.
	cfg, err := config.Load(*envPath)
	if err != nil {
		fatal("config", err)
	}

	// LINEAR_API_KEY can be in .env, .env.local, or environment.
	// config.Load only checks .env, so also check env vars directly.
	apiKey := cfg.Get("LINEAR_API_KEY")
	if apiKey == "" {
		apiKey = os.Getenv("LINEAR_API_KEY")
	}
	if apiKey == "" {
		fatal("config", fmt.Errorf("LINEAR_API_KEY not set (add to .env, .env.local, or export)"))
	}

	teamName := cfg.Get("LINEAR_TEAM_NAME")
	if teamName == "" {
		teamName = os.Getenv("LINEAR_TEAM_NAME")
	}
	// teamName is optional; commands that need it will require --team flag or positional arg.

	client := cmd.NewClient(apiKey)

	switch args[0] {
	case "teams":
		must("teams", cmd.RunTeams(client, *jsonOut))
	case "states":
		team := resolveTeam(args[1:], teamName)
		must("states", cmd.RunStates(client, team, *jsonOut))
	case "labels":
		team := resolveTeam(args[1:], teamName)
		must("labels", cmd.RunLabels(client, team, *jsonOut))
	case "issues":
		runIssues(client, args[1:], teamName, *jsonOut)
	case "comments":
		runComments(client, args[1:], *jsonOut)
	default:
		fmt.Fprintf(os.Stderr, "%s unknown command %q\n", theme.Error.Render("error:"), args[0])
		usage()
		os.Exit(1)
	}
}

func runIssues(client *cmd.Client, args []string, defaultTeam string, jsonOut bool) {
	if len(args) == 0 {
		// No subcommand and no flags: list all issues for default team.
		team := defaultTeam
		if team == "" {
			fatalf("issues", "team required: use --team <key> or set LINEAR_TEAM_NAME")
		}
		must("issues", cmd.RunIssueList(client, team, cmd.ListOpts{}, jsonOut))
		return
	}

	// If the first arg starts with "--", treat as implicit "list" with flags.
	if len(args[0]) > 1 && args[0][0] == '-' {
		team := resolveTeam(args, defaultTeam)
		opts := parseListOpts(args)
		must("issues", cmd.RunIssueList(client, team, opts, jsonOut))
		return
	}

	switch args[0] {
	case "create":
		team := resolveTeam(args[1:], defaultTeam)
		title := flagVal(args[1:], "--title")
		if title == "" {
			fatalf("issues create", "--title is required")
		}
		desc := flagVal(args[1:], "--desc")
		if desc == "-" {
			b, err := io.ReadAll(os.Stdin)
			if err != nil {
				fatal("issues create", err)
			}
			desc = string(b)
		}
		input := cmd.IssueInput{
			TeamKey:  team,
			Title:    title,
			Desc:     desc,
			Priority: flagVal(args[1:], "--priority"),
			State:    flagVal(args[1:], "--state"),
		}
		if l := flagVal(args[1:], "--label"); l != "" {
			input.Labels = []string{l}
		}
		if p := flagVal(args[1:], "--parent"); p != "" {
			input.ParentID = p
		}
		must("issues create", cmd.RunIssueCreate(client, input, jsonOut))

	case "get":
		if len(args) < 2 {
			fatalf("issues get", "issue reference required (e.g. OCE-22 or UUID)")
		}
		must("issues get", cmd.RunIssueGet(client, args[1], jsonOut))

	case "update":
		if len(args) < 2 {
			fatalf("issues update", "issue reference required (e.g. OCE-22 or UUID)")
		}
		ref := args[1]
		input := cmd.IssueUpdateInput{}
		if t := flagVal(args[2:], "--title"); t != "" {
			input.Title = cmd.Ptr(t)
		}
		if d := flagVal(args[2:], "--desc"); d != "" {
			if d == "-" {
				b, err := io.ReadAll(os.Stdin)
				if err != nil {
					fatal("issues update", err)
				}
				d = string(b)
			}
			input.Desc = cmd.Ptr(d)
		}
		if p := flagVal(args[2:], "--priority"); p != "" {
			input.Priority = cmd.Ptr(p)
		}
		if s := flagVal(args[2:], "--state"); s != "" {
			input.State = cmd.Ptr(s)
		}
		if l := flagVal(args[2:], "--label"); l != "" {
			input.Labels = []string{l}
		}
		if p := flagVal(args[2:], "--parent"); p != "" {
			input.ParentID = cmd.Ptr(p)
		}
		team := flagVal(args[2:], "--team")
		if team == "" {
			team = defaultTeam
		}
		must("issues update", cmd.RunIssueUpdate(client, ref, input, team, jsonOut))

	case "delete":
		if len(args) < 2 {
			fatalf("issues delete", "issue reference required (e.g. OCE-22 or UUID)")
		}
		must("issues delete", cmd.RunIssueDelete(client, args[1]))

	case "set-parent":
		if len(args) < 3 {
			fatalf("issues set-parent", "usage: pitlinear issues set-parent <child> <parent>")
		}
		must("issues set-parent", cmd.RunIssueSetParent(client, args[1], args[2]))

	case "list":
		team := resolveTeam(args[1:], defaultTeam)
		opts := parseListOpts(args[1:])
		must("issues list", cmd.RunIssueList(client, team, opts, jsonOut))

	default:
		fatalf("issues", "unknown subcommand %q", args[0])
	}
}

func runComments(client *cmd.Client, args []string, jsonOut bool) {
	if len(args) == 0 {
		fatalf("comments", "subcommand required: add, list")
	}

	switch args[0] {
	case "add":
		if len(args) < 2 {
			fatalf("comments add", "issue reference required (e.g. OCE-22)")
		}
		ref := args[1]
		body := flagVal(args[2:], "--body")
		if body == "" {
			body = flagVal(args[2:], "-m")
		}
		if body == "-" {
			b, err := io.ReadAll(os.Stdin)
			if err != nil {
				fatal("comments add", err)
			}
			body = string(b)
		}
		if body == "" {
			fatalf("comments add", "--body or -m is required (use - for stdin)")
		}
		must("comments add", cmd.RunCommentAdd(client, ref, body, jsonOut))

	case "list":
		if len(args) < 2 {
			fatalf("comments list", "issue reference required (e.g. OCE-22)")
		}
		must("comments list", cmd.RunCommentList(client, args[1], jsonOut))

	default:
		fatalf("comments", "unknown subcommand %q", args[0])
	}
}

// resolveTeam returns the team key from --team flag, positional arg, or default.
func resolveTeam(args []string, defaultTeam string) string {
	if t := flagVal(args, "--team"); t != "" {
		return t
	}
	if defaultTeam != "" {
		return defaultTeam
	}
	fatalf("team", "team key required: use --team <key> or set LINEAR_TEAM_NAME")
	return "" // unreachable
}

// parseListOpts extracts --state, --label, and --limit from args.
func parseListOpts(args []string) cmd.ListOpts {
	opts := cmd.ListOpts{}
	if s := flagVal(args, "--state"); s != "" {
		opts.State = s
	}
	if l := flagVal(args, "--label"); l != "" {
		opts.Label = l
	}
	if n := flagVal(args, "--limit"); n != "" {
		v, err := strconv.Atoi(n)
		if err != nil {
			fatalf("issues", "invalid --limit %q: %v", n, err)
		}
		opts.Limit = v
	}
	return opts
}

// --- helpers ---

func usage() {
	fmt.Fprintf(os.Stderr, "\n%s\n\n",
		theme.Title.Render("pitlinear — Linear issue tracker CLI for THE PIT"))
	fmt.Fprintf(os.Stderr, "Usage:\n")
	fmt.Fprintf(os.Stderr, "  pitlinear [flags] <command> [subcommand] [args...]\n\n")
	fmt.Fprintf(os.Stderr, "Commands:\n")
	fmt.Fprintf(os.Stderr, "  teams                          List teams\n")
	fmt.Fprintf(os.Stderr, "  states [--team <key>]           List workflow states\n")
	fmt.Fprintf(os.Stderr, "  labels [--team <key>]           List labels\n")
	fmt.Fprintf(os.Stderr, "  issues                          Issue management\n")
	fmt.Fprintf(os.Stderr, "    create --title <t> [--desc <d>|--desc -] [--priority <p>] [--state <s>] [--label <l>]\n")
	fmt.Fprintf(os.Stderr, "    get <ref>                     Get issue by OCE-22 or UUID\n")
	fmt.Fprintf(os.Stderr, "    update <ref> [--title|--desc|--priority|--state|--label|--parent]\n")
	fmt.Fprintf(os.Stderr, "    list [--state <s>] [--label <l>] [--limit <n>]\n")
	fmt.Fprintf(os.Stderr, "    delete <ref>                  Permanently delete issue\n")
	fmt.Fprintf(os.Stderr, "    set-parent <child> <parent>   Link child to parent issue\n")
	fmt.Fprintf(os.Stderr, "  comments                        Comment management\n")
	fmt.Fprintf(os.Stderr, "    add <ref> --body <text>|--body -  Add comment\n")
	fmt.Fprintf(os.Stderr, "    list <ref>                    List comments\n")
	fmt.Fprintf(os.Stderr, "  version                         Show version\n\n")
	fmt.Fprintf(os.Stderr, "Flags:\n")
	fmt.Fprintf(os.Stderr, "  --env <path>  Path to .env file (default: auto-detect)\n")
	fmt.Fprintf(os.Stderr, "  --json        Output as JSON\n\n")
	fmt.Fprintf(os.Stderr, "Environment:\n")
	fmt.Fprintf(os.Stderr, "  LINEAR_API_KEY     Required. Linear API key.\n")
	fmt.Fprintf(os.Stderr, "  LINEAR_TEAM_NAME   Optional. Default team key (e.g. OCE).\n\n")
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

// flagVal returns the value following a flag name, or empty string.
func flagVal(args []string, name string) string {
	for i, a := range args {
		if a == name && i+1 < len(args) {
			return args[i+1]
		}
	}
	return ""
}
