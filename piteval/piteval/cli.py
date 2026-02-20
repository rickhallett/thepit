"""CLI entry point — stdlib argparse, no cobra, following pit* conventions.

Subcommands:
    piteval bundle          — Bundle codebase sections and show token counts
    piteval plan            — Show execution plan (panels x models x iterations)
    piteval run             — Execute evaluation runs
    piteval parse           — Parse and validate saved results
    piteval analyze         — Run statistical analysis on parsed results
    piteval report          — Generate full report with radar chart
    piteval status          — Show progress (completed/total runs)
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from . import __version__


def _resolve_paths(args: argparse.Namespace) -> tuple[Path, Path, Path]:
    """Resolve codebase root, prompts dir, and results dir."""
    codebase = Path(args.codebase).resolve()
    prompts = Path(args.prompts).resolve()
    results = Path(args.results).resolve()
    return codebase, prompts, results


def cmd_bundle(args: argparse.Namespace) -> int:
    """Bundle codebase sections and display token counts."""
    from .bundler import Bundler

    codebase = Path(args.codebase).resolve()
    bundler = Bundler(codebase)

    if args.section:
        section = bundler.bundle_section(args.section.upper())
        print(section.summary)
        if args.verbose:
            print(f"\n--- Content preview (first 500 chars) ---\n{section.content[:500]}...")
    else:
        print(bundler.summary())

    return 0


def cmd_plan(args: argparse.Namespace) -> int:
    """Show the execution plan."""
    from .assembler import Assembler
    from .bundler import Bundler
    from .models import ALL_MODELS, PANELS

    codebase, prompts, _ = _resolve_paths(args)
    bundler = Bundler(codebase)
    assembler = Assembler(prompts, bundler)

    iterations = args.iterations
    models = ALL_MODELS
    total_cost = 0.0
    total_runs = 0

    print(
        f"\nExecution Plan: {len(PANELS)} panels x {len(models)} models x {iterations} iterations"
    )
    print(f"{'=' * 80}\n")

    for panel in PANELS:
        print(f"Panel {panel.panel_id}: {panel.name} ({panel.metric_count} metrics)")
        for model in models:
            est_tokens = assembler.estimate_prompt_tokens(panel)
            fits = assembler.will_fit(panel, model)
            est_cost = (est_tokens / 1_000_000) * model.input_cost_per_mtok * iterations
            # Add estimated output cost (assume ~4K output tokens per run)
            est_cost += (4000 / 1_000_000) * model.output_cost_per_mtok * iterations
            total_cost += est_cost
            total_runs += iterations
            status = "OK" if fits else "TOO LARGE"
            print(
                f"  {model.display_name:25s} ~{est_tokens:>8,} tokens"
                f"  ${est_cost:>6.2f}  [{status}]"
            )
        print()

    print(f"{'=' * 80}")
    print(f"Total runs: {total_runs}")
    print(f"Estimated cost: ${total_cost:.2f}")
    print("Temperature strategy: offsets from model center, not absolute")
    for model in models:
        temps = model.temperatures[:iterations]
        print(f"  {model.display_name}: center={model.temperature_center}, temps={temps}")

    return 0


def cmd_run(args: argparse.Namespace) -> int:
    """Execute evaluation runs."""
    from .assembler import Assembler
    from .bundler import Bundler
    from .caller import Caller
    from .models import ALL_MODELS, PANELS, get_model, get_panel

    codebase, prompts, results = _resolve_paths(args)
    bundler = Bundler(codebase)
    assembler = Assembler(prompts, bundler)
    caller = Caller(results)

    iterations = args.iterations

    # Filter panels if specified
    panels = [get_panel(p) for p in args.panel] if args.panel else PANELS

    # Filter models if specified
    models = [get_model(m) for m in args.model] if args.model else ALL_MODELS

    # Build prompt list
    assembled: list = []
    for panel in panels:
        for model in models:
            for iteration in range(1, iterations + 1):
                try:
                    prompt = assembler.assemble(panel, model, iteration)
                    assembled.append(prompt)
                except ValueError as e:
                    print(f"SKIP: {e}", file=sys.stderr)

    if not assembled:
        print("No prompts to execute.", file=sys.stderr)
        return 1

    if args.dry_run:
        print(f"\nDry run: {len(assembled)} prompts would be sent\n")
        total_cost = 0.0
        for p in assembled:
            print(f"  {p}")
            total_cost += p.estimated_cost
        print(f"\nEstimated input cost: ${total_cost:.2f}")
        return 0

    # Execute
    results_list = caller.call_batch(assembled)

    # Summary
    success = sum(1 for r in results_list if r.stop_reason in ("stop", "end_turn"))
    total_cost = sum(r.cost for r in results_list)
    print(f"\nCompleted: {success}/{len(results_list)} runs")
    print(f"Total cost: ${total_cost:.2f}")

    return 0


def cmd_parse(args: argparse.Namespace) -> int:
    """Parse and validate saved results."""
    from .parser import load_all_evaluations

    results = Path(args.results).resolve()
    parse_results = load_all_evaluations(results)

    success = sum(1 for r in parse_results if r.success)
    failed = sum(1 for r in parse_results if not r.success)

    print(f"\nParsed {len(parse_results)} results: {success} valid, {failed} failed\n")

    for r in parse_results:
        status = "OK" if r.success else "FAIL"
        print(f"  [{status}] {r.run_id}")
        if r.warnings:
            for w in r.warnings:
                print(f"         WARN: {w}")
        if r.errors:
            for e in r.errors:
                print(f"         ERROR: {e}")

    return 0 if failed == 0 else 1


def cmd_analyze(args: argparse.Namespace) -> int:
    """Run statistical analysis on parsed results."""
    from .analyzer import analyze
    from .parser import load_all_evaluations
    from .reporter import save_report

    results = Path(args.results).resolve()
    parse_results = load_all_evaluations(results)

    valid = [r for r in parse_results if r.success]
    if not valid:
        print("No valid evaluation results found.", file=sys.stderr)
        return 1

    print(f"\nAnalyzing {len(valid)} valid evaluations...\n")

    analysis = analyze(parse_results)

    # Save report artifacts
    phase_name = args.phase or "analysis"
    artifacts = save_report(analysis, results, phase_name)

    print(
        f"Grand Composite: {analysis.grand_composite:.2f} "
        f"[{analysis.grand_composite_ci[0]:.2f}, {analysis.grand_composite_ci[1]:.2f}]"
    )
    print(f"Conformance Rate: {analysis.conformance_rate * 100:.1f}%")
    print()

    # Panel summary
    for pa in analysis.panel_analyses:
        print(f"  {pa.panel_id} {pa.panel_name:40s} {pa.composite_score:5.2f}  [{pa.signal_tier}]")

    print()
    print(f"Confirmed Strengths: {len(analysis.confirmed_strengths)}")
    print(f"Confirmed Weaknesses: {len(analysis.confirmed_weaknesses)}")
    print(f"Key Disagreements: {len(analysis.key_disagreements)}")
    print()

    for name, path in artifacts.items():
        print(f"  {name}: {path}")

    return 0


def cmd_report(args: argparse.Namespace) -> int:
    """Generate full report (alias for analyze with report focus)."""
    return cmd_analyze(args)


def cmd_status(args: argparse.Namespace) -> int:
    """Show progress — how many runs are completed."""
    from .models import ALL_MODELS, PANELS

    results = Path(args.results).resolve()
    iterations = args.iterations

    total_expected = len(PANELS) * len(ALL_MODELS) * iterations
    completed = len(list(results.glob("*.json")))
    # Subtract any summary/report files
    report_files = len(list(results.glob("_*.json")))
    completed -= report_files

    print(
        f"\nProgress: {completed}/{total_expected} runs ({completed / total_expected * 100:.0f}%)"
        if total_expected > 0
        else "No runs expected"
    )

    if completed < total_expected:
        remaining = total_expected - completed
        print(f"Remaining: {remaining} runs")

    return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        prog="piteval",
        description="Multi-model codebase evaluation engine for THE PIT",
    )
    parser.add_argument("--version", action="version", version=f"piteval {__version__}")

    # Global arguments
    parser.add_argument(
        "--codebase",
        default="..",
        help="Path to codebase root (default: parent of piteval/)",
    )
    parser.add_argument(
        "--prompts",
        default="../docs/eval-prompts",
        help="Path to evaluation prompt files",
    )
    parser.add_argument(
        "--results",
        default="results",
        help="Path to results directory",
    )
    parser.add_argument(
        "--iterations",
        type=int,
        default=5,
        help="Number of iterations per model per panel (default: 5)",
    )
    parser.add_argument(
        "--verbose",
        "-v",
        action="store_true",
        help="Verbose output",
    )

    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # bundle
    sp_bundle = subparsers.add_parser("bundle", help="Bundle codebase sections")
    sp_bundle.add_argument("--section", help="Specific section (A-G)")
    sp_bundle.set_defaults(func=cmd_bundle)

    # plan
    sp_plan = subparsers.add_parser("plan", help="Show execution plan")
    sp_plan.set_defaults(func=cmd_plan)

    # run
    sp_run = subparsers.add_parser("run", help="Execute evaluation runs")
    sp_run.add_argument("--panel", nargs="+", help="Specific panel IDs (e.g., 101 102)")
    sp_run.add_argument("--model", nargs="+", help="Specific model names")
    sp_run.add_argument(
        "--dry-run", action="store_true", help="Show what would run without executing"
    )
    sp_run.set_defaults(func=cmd_run)

    # parse
    sp_parse = subparsers.add_parser("parse", help="Parse and validate results")
    sp_parse.set_defaults(func=cmd_parse)

    # analyze
    sp_analyze = subparsers.add_parser("analyze", help="Run statistical analysis")
    sp_analyze.add_argument("--phase", help="Phase name for output files (default: analysis)")
    sp_analyze.set_defaults(func=cmd_analyze)

    # report
    sp_report = subparsers.add_parser("report", help="Generate full report")
    sp_report.add_argument("--phase", help="Phase name for output files")
    sp_report.set_defaults(func=cmd_report)

    # status
    sp_status = subparsers.add_parser("status", help="Show progress")
    sp_status.set_defaults(func=cmd_status)

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return 1

    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
