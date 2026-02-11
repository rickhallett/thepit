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

	cfg, err := config.Load(*envPath)
	if err != nil {
		fatal("config", err)
	}

	// Suppress unused warning during scaffold phase.
	_ = cfg

	switch args[0] {
	case "version":
		fmt.Printf("pitforge %s\n", version)
	default:
		fmt.Fprintf(os.Stderr, "%s unknown command %q\n", theme.Error.Render("error:"), args[0])
		usage()
		os.Exit(1)
	}
}

func usage() {
	fmt.Fprintf(os.Stderr, "\n%s\n\n",
		theme.Title.Render("pitforge — agent development toolkit for THE PIT"))
	fmt.Fprintf(os.Stderr, "Usage:\n")
	fmt.Fprintf(os.Stderr, "  pitforge [flags] <command> [args...]\n\n")
	fmt.Fprintf(os.Stderr, "Commands:\n")
	fmt.Fprintf(os.Stderr, "  init <name>                    Scaffold new agent definition\n")
	fmt.Fprintf(os.Stderr, "  validate <file>                Schema validation\n")
	fmt.Fprintf(os.Stderr, "  lint <file>                    Heuristic prompt quality checks\n")
	fmt.Fprintf(os.Stderr, "  hash <file>                    Compute promptHash + manifestHash\n")
	fmt.Fprintf(os.Stderr, "  diff <file1> <file2>           Semantic diff between agents\n")
	fmt.Fprintf(os.Stderr, "  spar <file1> <file2>           Run a local bout\n")
	fmt.Fprintf(os.Stderr, "  catalog                        Browse presets\n")
	fmt.Fprintf(os.Stderr, "  lineage <agentId>              Visualize agent lineage\n")
	fmt.Fprintf(os.Stderr, "  evolve <file>                  Generate prompt variants\n")
	fmt.Fprintf(os.Stderr, "  version                        Show version\n\n")
	fmt.Fprintf(os.Stderr, "Flags:\n")
	fmt.Fprintf(os.Stderr, "  --env <path>  Path to .env file (default: auto-detect)\n\n")
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
