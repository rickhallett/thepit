"""Reporter — generates composite reports, radar charts, and summaries.

Consumes FullAnalysis output and produces:
1. JSON summary file (machine-readable)
2. Markdown report (human-readable)
3. Radar chart PNG (visual)
4. Per-panel detail reports
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import TYPE_CHECKING, Any

import matplotlib

matplotlib.use("Agg")  # Non-interactive backend
import matplotlib.pyplot as plt
import numpy as np

if TYPE_CHECKING:
    from .analyzer import FullAnalysis, MetricAnalysis


def generate_json_summary(analysis: FullAnalysis) -> dict[str, Any]:
    """Generate the machine-readable JSON summary matching the 113-aggregation schema."""
    return {
        "meta": {
            "total_evaluations_received": analysis.total_evaluations,
            "conformance_rate": f"{analysis.conformance_rate * 100:.1f}%",
            "excluded_evaluations": analysis.total_evaluations
            - int(analysis.total_evaluations * analysis.conformance_rate),
            "models_represented": [mb.model_id for mb in analysis.model_biases],
            "iterations_per_model": _infer_iterations(analysis),
        },
        "model_biases": {
            mb.model_id: {
                "mean_score": round(mb.grand_mean, 2),
                "bias_correction": round(mb.correction_factor, 2),
            }
            for mb in analysis.model_biases
        },
        "panel_composites": [
            {
                "panel_id": pa.panel_id,
                "panel_name": pa.panel_name,
                "composite_score": round(pa.composite_score, 2),
                "confidence_interval": [
                    round(pa.composite_ci[0], 2),
                    round(pa.composite_ci[1], 2),
                ],
                "signal_tier": pa.signal_tier,
                "strongest_metric": _metric_summary(pa.strongest_metric),
                "weakest_metric": _metric_summary(pa.weakest_metric),
            }
            for pa in analysis.panel_analyses
        ],
        "grand_composite": {
            "score": round(analysis.grand_composite, 2),
            "confidence_interval": [
                round(analysis.grand_composite_ci[0], 2),
                round(analysis.grand_composite_ci[1], 2),
            ],
            "interpretation": _interpret_grand(analysis.grand_composite),
        },
        "confirmed_strengths": [_finding(ma) for ma in analysis.confirmed_strengths[:5]],
        "confirmed_weaknesses": [_finding(ma) for ma in analysis.confirmed_weaknesses[:5]],
        "key_disagreements": [_disagreement(ma) for ma in analysis.key_disagreements[:5]],
        "radar_chart_data": {
            "labels": [pa.panel_name for pa in analysis.panel_analyses],
            "scores": [round(pa.composite_score, 2) for pa in analysis.panel_analyses],
        },
    }


def generate_markdown_report(analysis: FullAnalysis) -> str:
    """Generate a human-readable markdown report."""
    lines: list[str] = []
    lines.append("# Codebase Evaluation Report — THE PIT")
    lines.append("")
    lines.append(
        f"**Grand Composite:** {analysis.grand_composite:.2f} "
        f"[95% CI: {analysis.grand_composite_ci[0]:.2f}, "
        f"{analysis.grand_composite_ci[1]:.2f}]"
    )
    lines.append(f"**Total Evaluations:** {analysis.total_evaluations}")
    lines.append(f"**Conformance Rate:** {analysis.conformance_rate * 100:.1f}%")
    lines.append("")

    # Model biases
    lines.append("## Model Biases")
    lines.append("")
    lines.append("| Model | Mean Score | Bias | Correction Needed |")
    lines.append("|-------|-----------|------|------------------|")
    for mb in analysis.model_biases:
        lines.append(
            f"| {mb.model_name} | {mb.grand_mean:.2f} | "
            f"{mb.bias:+.2f} | {'Yes' if mb.needs_correction else 'No'} |"
        )
    lines.append("")

    # Panel composites
    lines.append("## Panel Composites")
    lines.append("")
    lines.append("| Panel | Score | 95% CI | Signal Tier | Strongest | Weakest |")
    lines.append("|-------|-------|--------|-------------|-----------|---------|")
    for pa in analysis.panel_analyses:
        strongest = pa.strongest_metric.metric_name if pa.strongest_metric else "—"
        weakest = pa.weakest_metric.metric_name if pa.weakest_metric else "—"
        lines.append(
            f"| {pa.panel_name} | {pa.composite_score:.2f} | "
            f"[{pa.composite_ci[0]:.2f}, {pa.composite_ci[1]:.2f}] | "
            f"{pa.signal_tier} | {strongest} | {weakest} |"
        )
    lines.append("")

    # Confirmed strengths
    if analysis.confirmed_strengths:
        lines.append("## Confirmed Strengths (score >= 7, ICC >= 0.75)")
        lines.append("")
        for ma in analysis.confirmed_strengths[:5]:
            lines.append(
                f"- **{ma.metric_id} {ma.metric_name}**: {ma.grand_mean:.1f} (ICC={ma.icc:.2f})"
            )
        lines.append("")

    # Confirmed weaknesses
    if analysis.confirmed_weaknesses:
        lines.append("## Confirmed Weaknesses (score <= 4, ICC >= 0.75)")
        lines.append("")
        for ma in analysis.confirmed_weaknesses[:5]:
            lines.append(
                f"- **{ma.metric_id} {ma.metric_name}**: {ma.grand_mean:.1f} (ICC={ma.icc:.2f})"
            )
        lines.append("")

    # Key disagreements
    if analysis.key_disagreements:
        lines.append("## Key Disagreements (ICC < 0.50, range > 3)")
        lines.append("")
        for ma in analysis.key_disagreements[:5]:
            score_range = max(ma.scores) - min(ma.scores)
            lines.append(
                f"- **{ma.metric_id} {ma.metric_name}**: "
                f"mean={ma.grand_mean:.1f}, range={score_range}, ICC={ma.icc:.2f}"
            )
        lines.append("")

    # Per-metric detail
    lines.append("## All Metrics (sorted by panel)")
    lines.append("")
    for pa in analysis.panel_analyses:
        lines.append(f"### {pa.panel_id}: {pa.panel_name}")
        lines.append("")
        lines.append("| Metric | Mean | SD | ICC | Tier | Models |")
        lines.append("|--------|------|----|----|------|--------|")
        for ma in sorted(pa.metrics, key=lambda m: m.metric_id):
            model_str = " / ".join(
                f"{mid}={mean:.1f}" for mid, mean in sorted(ma.model_means.items())
            )
            lines.append(
                f"| {ma.metric_id} {ma.metric_name} | {ma.grand_mean:.1f} | "
                f"{ma.grand_sd:.2f} | {ma.icc:.2f} | {ma.signal_tier} | {model_str} |"
            )
        lines.append("")

    return "\n".join(lines)


def generate_radar_chart(analysis: FullAnalysis, output_path: Path) -> Path:
    """Generate a radar chart PNG of panel composite scores."""
    if not analysis.panel_analyses:
        return output_path

    labels = [pa.panel_name.replace(" & ", "\n& ") for pa in analysis.panel_analyses]
    scores = [pa.composite_score for pa in analysis.panel_analyses]
    n = len(labels)

    # Compute angles
    angles = [i / n * 2 * np.pi for i in range(n)]
    angles += angles[:1]  # close the polygon
    scores_plot = scores + scores[:1]

    fig, ax = plt.subplots(figsize=(10, 10), subplot_kw=dict(polar=True))
    ax.set_theta_offset(np.pi / 2)
    ax.set_theta_direction(-1)

    # Draw the chart
    ax.plot(angles, scores_plot, "o-", linewidth=2, color="#7aa2f7")
    ax.fill(angles, scores_plot, alpha=0.25, color="#7aa2f7")

    # Set labels and ticks
    ax.set_xticks(angles[:-1])
    ax.set_xticklabels(labels, size=9, wrap=True)
    ax.set_ylim(0, 10)
    ax.set_yticks([2, 4, 6, 8, 10])
    ax.set_yticklabels(["2", "4", "6", "8", "10"], size=8)
    ax.set_title(
        f"THE PIT — Codebase Evaluation Radar\nGrand Composite: {analysis.grand_composite:.2f}",
        size=14,
        y=1.08,
    )

    # Add score labels
    for angle, score, _label in zip(angles[:-1], scores, labels, strict=False):
        ax.annotate(
            f"{score:.1f}",
            xy=(angle, score),
            xytext=(5, 5),
            textcoords="offset points",
            fontsize=8,
            fontweight="bold",
        )

    plt.tight_layout()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(str(output_path), dpi=150, bbox_inches="tight")
    plt.close(fig)
    return output_path


def save_report(
    analysis: FullAnalysis,
    output_dir: Path | str,
    phase_name: str = "analysis",
) -> dict[str, Path]:
    """Save all report artifacts to a directory.

    Returns a dict of artifact type -> file path.
    """
    output_dir = Path(output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    artifacts: dict[str, Path] = {}

    # JSON summary
    json_path = output_dir / f"_{phase_name}_summary.json"
    json_data = generate_json_summary(analysis)
    json_path.write_text(json.dumps(json_data, indent=2, ensure_ascii=False), encoding="utf-8")
    artifacts["json"] = json_path

    # Markdown report
    md_path = output_dir / f"_{phase_name}_report.md"
    md_content = generate_markdown_report(analysis)
    md_path.write_text(md_content, encoding="utf-8")
    artifacts["markdown"] = md_path

    # Radar chart
    chart_path = output_dir / f"_{phase_name}_radar.png"
    generate_radar_chart(analysis, chart_path)
    artifacts["radar"] = chart_path

    return artifacts


# --- Helpers ---


def _metric_summary(ma: MetricAnalysis | None) -> dict[str, Any] | None:
    if ma is None:
        return None
    return {
        "id": ma.metric_id,
        "name": ma.metric_name,
        "score": round(ma.grand_mean, 2),
    }


def _finding(ma: MetricAnalysis) -> dict[str, Any]:
    return {
        "metric_id": ma.metric_id,
        "metric_name": ma.metric_name,
        "score": round(ma.grand_mean, 2),
        "icc": round(ma.icc, 2),
        "evidence_summary": f"Panel {ma.panel_id}, n={ma.n_observations}",
    }


def _disagreement(ma: MetricAnalysis) -> dict[str, Any]:
    return {
        "metric_id": ma.metric_id,
        "metric_name": ma.metric_name,
        "score_range": [int(min(ma.scores)), int(max(ma.scores))],
        "icc": round(ma.icc, 2),
        "disagreement_summary": (
            "Models disagree: "
            + ", ".join(f"{k}={v:.1f}" for k, v in sorted(ma.model_means.items()))
        ),
    }


def _interpret_grand(score: float) -> str:
    if score >= 8:
        return "Exceptional codebase quality across all dimensions."
    elif score >= 7:
        return "Strong codebase with deliberate engineering choices."
    elif score >= 6:
        return "Above average for a solo-developer early-stage project."
    elif score >= 5:
        return "Adequate for production. Typical of a competent developer under time pressure."
    elif score >= 4:
        return "Below average. Several areas need attention."
    else:
        return "Significant quality concerns across multiple dimensions."


def _infer_iterations(analysis: FullAnalysis) -> int:
    """Infer the number of iterations per model from the data."""
    for ma in analysis.metric_analyses.values():
        if ma.n_observations > 0 and len(ma.model_means) > 0:
            return ma.n_observations // max(len(ma.model_means), 1)
    return 0
