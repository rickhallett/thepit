"""Statistical analyzer — ICC, Krippendorff's alpha, CI, signal tiers.

Implements Phases 2-4 of the evaluation protocol:
- Phase 2: Noise Estimation (within-model & between-model variance)
- Phase 3: Confidence Bands (grand mean, SE, 95% CI, model-stratified means)
- Phase 4: Signal Detection (classify metrics into signal tiers)
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Literal

import numpy as np
import pandas as pd
import pingouin as pg

from .models import ALL_MODELS, PANELS

if TYPE_CHECKING:
    from .parser import ParseResult

SignalTier = Literal["Signal", "Probable Signal", "Ambiguous", "Noise"]


@dataclass
class MetricAnalysis:
    """Statistical analysis for a single metric across all evaluations."""

    metric_id: str
    metric_name: str
    panel_id: str

    # Summary statistics
    grand_mean: float
    grand_median: float
    grand_sd: float
    iqr: tuple[float, float]  # (Q1, Q3)

    # Per-model statistics
    model_means: dict[str, float]  # model_id -> mean score
    model_sds: dict[str, float]  # model_id -> SD

    # Variance decomposition
    within_model_variance: float  # avg variance within each model's iterations
    between_model_variance: float  # variance of model means

    # Agreement statistics
    icc: float  # ICC(2,1)
    icc_ci: tuple[float, float]  # 95% CI for ICC
    krippendorff_alpha: float | None  # Ordinal alpha

    # Signal classification
    signal_tier: SignalTier
    n_observations: int

    # All scores for downstream use
    scores: list[int] = field(default_factory=list)

    @property
    def agreement_label(self) -> str:
        if self.icc >= 0.75:
            return "Converged"
        elif self.icc >= 0.50:
            return "Moderate"
        else:
            return "Divergent"

    def summary_line(self) -> str:
        return (
            f"{self.metric_id} {self.metric_name}: "
            f"{self.grand_mean:.1f} [95% CI: {self.ci_lower:.1f}, {self.ci_upper:.1f}] | "
            f"ICC={self.icc:.2f} | {self.agreement_label} | {self.signal_tier}"
        )

    @property
    def ci_lower(self) -> float:
        se = self.grand_sd / (self.n_observations**0.5)
        return self.grand_mean - 1.96 * se

    @property
    def ci_upper(self) -> float:
        se = self.grand_sd / (self.n_observations**0.5)
        return self.grand_mean + 1.96 * se


@dataclass
class PanelAnalysis:
    """Aggregated analysis for an entire panel."""

    panel_id: str
    panel_name: str
    metrics: list[MetricAnalysis]
    composite_score: float  # ICC-weighted mean of metric scores
    composite_ci: tuple[float, float]  # 95% CI for composite
    signal_tier: SignalTier  # median ICC tier
    strongest_metric: MetricAnalysis | None
    weakest_metric: MetricAnalysis | None


@dataclass
class ModelBiasResult:
    """Systematic bias detection for a single model."""

    model_id: str
    model_name: str
    grand_mean: float  # mean across ALL metrics
    bias: float  # deviation from overall grand mean
    correction_factor: float  # subtract this to correct
    needs_correction: bool  # |bias| > 0.5


@dataclass
class FullAnalysis:
    """Complete statistical analysis across all panels and metrics."""

    metric_analyses: dict[str, MetricAnalysis]  # metric_id -> analysis
    panel_analyses: list[PanelAnalysis]
    model_biases: list[ModelBiasResult]
    grand_composite: float
    grand_composite_ci: tuple[float, float]
    total_evaluations: int
    conformance_rate: float  # fraction of valid responses
    confirmed_strengths: list[MetricAnalysis]  # score >= 7 AND ICC >= 0.75
    confirmed_weaknesses: list[MetricAnalysis]  # score <= 4 AND ICC >= 0.75
    key_disagreements: list[MetricAnalysis]  # ICC < 0.50 AND range > 3


def _classify_signal_tier(icc: float, within_variance: float) -> SignalTier:
    """Classify a metric into a signal tier per protocol."""
    if icc >= 0.75 and within_variance <= 1.5:
        return "Signal"
    elif icc >= 0.50 and within_variance <= 2.5:
        return "Probable Signal"
    elif icc >= 0.30 or within_variance > 2.5:
        return "Ambiguous"
    else:
        return "Noise"


def _compute_icc(
    scores_df: pd.DataFrame,
) -> tuple[float, tuple[float, float]]:
    """Compute ICC(2,1) using pingouin.

    scores_df must have columns: ['targets', 'raters', 'ratings']
    where targets = metric instances (panel x iteration), raters = models.

    Returns (icc_value, (ci_lower, ci_upper)).
    Falls back to 0.0 if computation fails.
    """
    try:
        if len(scores_df) < 3:
            return 0.0, (0.0, 0.0)

        icc_result = pg.intraclass_corr(
            data=scores_df,
            targets="targets",
            raters="raters",
            ratings="ratings",
        )
        # ICC2 = two-way random, single measures (row where Type is "ICC2")
        icc2_row = icc_result[icc_result["Type"] == "ICC2"]
        if icc2_row.empty:
            # Fall back to ICC2k if ICC2 not available
            icc2_row = icc_result[icc_result["Type"] == "ICC2k"]
        if icc2_row.empty:
            return 0.0, (0.0, 0.0)

        icc_val = float(icc2_row["ICC"].iloc[0])
        ci_low = float(icc2_row["CI95%"].iloc[0][0]) if "CI95%" in icc2_row.columns else 0.0
        ci_high = float(icc2_row["CI95%"].iloc[0][1]) if "CI95%" in icc2_row.columns else 0.0

        return icc_val, (ci_low, ci_high)
    except Exception:
        return 0.0, (0.0, 0.0)


def _compute_krippendorff(scores_by_rater: list[list[int | None]]) -> float | None:
    """Compute Krippendorff's alpha for ordinal data.

    scores_by_rater: list of lists, one per rater, with None for missing values.
    """
    try:
        import krippendorff as krip

        # krippendorff expects a reliability matrix: raters x units
        reliability_data = []
        for rater_scores in scores_by_rater:
            row = [s if s is not None else np.nan for s in rater_scores]
            reliability_data.append(row)

        alpha = krip.alpha(
            reliability_data=reliability_data,
            level_of_measurement="ordinal",
        )
        return float(alpha) if not np.isnan(alpha) else None
    except Exception:
        return None


def analyze(parse_results: list[ParseResult]) -> FullAnalysis:
    """Run full statistical analysis on all parsed evaluation results.

    This is the main entry point for the analysis pipeline.
    """
    # Filter to successful parses only
    valid = [r for r in parse_results if r.success and r.evaluation is not None]
    total = len(parse_results)
    conformance_rate = len(valid) / total if total > 0 else 0.0

    # Build the master score table
    # Columns: metric_id, metric_name, panel_id, model_id, iteration, score
    rows: list[dict] = []
    for pr in valid:
        ev = pr.evaluation
        assert ev is not None
        for metric in ev.metrics:
            rows.append(
                {
                    "metric_id": metric.id,
                    "metric_name": metric.name,
                    "panel_id": ev.panel_id,
                    "model_id": ev.evaluator_model,
                    "iteration": ev.iteration,
                    "score": metric.score,
                }
            )

    if not rows:
        return FullAnalysis(
            metric_analyses={},
            panel_analyses=[],
            model_biases=[],
            grand_composite=0.0,
            grand_composite_ci=(0.0, 0.0),
            total_evaluations=total,
            conformance_rate=conformance_rate,
            confirmed_strengths=[],
            confirmed_weaknesses=[],
            key_disagreements=[],
        )

    df = pd.DataFrame(rows)

    # --- Per-metric analysis ---
    metric_analyses: dict[str, MetricAnalysis] = {}

    for metric_id, group in df.groupby("metric_id"):
        metric_id_str = str(metric_id)
        metric_name = group["metric_name"].iloc[0]
        panel_id = group["panel_id"].iloc[0]
        all_scores = group["score"].values

        # Summary stats
        grand_mean = float(np.mean(all_scores))
        grand_median = float(np.median(all_scores))
        grand_sd = float(np.std(all_scores, ddof=1)) if len(all_scores) > 1 else 0.0
        q1, q3 = float(np.percentile(all_scores, 25)), float(np.percentile(all_scores, 75))

        # Per-model stats
        model_means: dict[str, float] = {}
        model_sds: dict[str, float] = {}
        within_variances: list[float] = []

        for model_id, model_group in group.groupby("model_id"):
            m_scores = model_group["score"].values
            model_means[str(model_id)] = float(np.mean(m_scores))
            sd = float(np.std(m_scores, ddof=1)) if len(m_scores) > 1 else 0.0
            model_sds[str(model_id)] = sd
            within_variances.append(sd**2)

        within_model_variance = float(np.mean(within_variances)) if within_variances else 0.0
        between_model_variance = (
            float(np.var(list(model_means.values()), ddof=1)) if len(model_means) > 1 else 0.0
        )

        # ICC(2,1)
        # Build the pingouin-compatible DataFrame
        icc_rows: list[dict] = []
        for _, row in group.iterrows():
            icc_rows.append(
                {
                    "targets": f"{row['model_id']}_{row['iteration']}",
                    "raters": row["model_id"],
                    "ratings": row["score"],
                }
            )

        # For ICC we need a different structure: targets = items being rated, raters = judges
        # In our case: targets = iterations (same "item" across models), raters = models
        # Reshape: for each iteration, we have scores from each model
        icc_data: list[dict] = []
        for iteration, iter_group in group.groupby("iteration"):
            for _, row in iter_group.iterrows():
                icc_data.append(
                    {
                        "targets": f"iter_{iteration}",
                        "raters": row["model_id"],
                        "ratings": row["score"],
                    }
                )

        icc_df = pd.DataFrame(icc_data)
        icc_val, icc_ci = _compute_icc(icc_df)

        # Krippendorff's alpha
        # Build rater matrix: one row per model, columns = iterations
        model_ids_sorted = sorted(group["model_id"].unique())
        iterations_sorted = sorted(group["iteration"].unique())
        krip_matrix: list[list[int | None]] = []
        for mid in model_ids_sorted:
            rater_row: list[int | None] = []
            for it in iterations_sorted:
                match = group[(group["model_id"] == mid) & (group["iteration"] == it)]
                if not match.empty:
                    rater_row.append(int(match["score"].iloc[0]))
                else:
                    rater_row.append(None)
            krip_matrix.append(rater_row)

        krip_alpha = _compute_krippendorff(krip_matrix)

        # Signal tier
        signal_tier = _classify_signal_tier(icc_val, within_model_variance)

        metric_analyses[metric_id_str] = MetricAnalysis(
            metric_id=metric_id_str,
            metric_name=str(metric_name),
            panel_id=str(panel_id),
            grand_mean=grand_mean,
            grand_median=grand_median,
            grand_sd=grand_sd,
            iqr=(q1, q3),
            model_means=model_means,
            model_sds=model_sds,
            within_model_variance=within_model_variance,
            between_model_variance=between_model_variance,
            icc=icc_val,
            icc_ci=icc_ci,
            krippendorff_alpha=krip_alpha,
            signal_tier=signal_tier,
            n_observations=len(all_scores),
            scores=list(int(s) for s in all_scores),
        )

    # --- Panel-level analysis ---
    panel_analyses: list[PanelAnalysis] = []

    for panel_def in PANELS:
        panel_metrics = [ma for ma in metric_analyses.values() if ma.panel_id == panel_def.panel_id]
        if not panel_metrics:
            continue

        # ICC-weighted composite
        total_weight = 0.0
        weighted_sum = 0.0
        for ma in panel_metrics:
            weight = max(ma.icc, 0.01)  # floor at 0.01 to avoid zero weights
            weighted_sum += ma.grand_mean * weight
            total_weight += weight

        composite = weighted_sum / total_weight if total_weight > 0 else 0.0

        # Composite CI (ICC-weighted SE)
        if len(panel_metrics) > 1:
            scores = [ma.grand_mean for ma in panel_metrics]
            se = float(np.std(scores, ddof=1) / np.sqrt(len(scores)))
        else:
            se = panel_metrics[0].grand_sd / (panel_metrics[0].n_observations ** 0.5)
        ci = (composite - 1.96 * se, composite + 1.96 * se)

        # Signal tier = median ICC
        iccs = sorted(ma.icc for ma in panel_metrics)
        median_icc = float(np.median(iccs))
        avg_within_var = float(np.mean([ma.within_model_variance for ma in panel_metrics]))
        panel_tier = _classify_signal_tier(median_icc, avg_within_var)

        # Strongest and weakest
        sorted_by_score = sorted(panel_metrics, key=lambda m: m.grand_mean)
        weakest = sorted_by_score[0] if sorted_by_score else None
        strongest = sorted_by_score[-1] if sorted_by_score else None

        panel_analyses.append(
            PanelAnalysis(
                panel_id=panel_def.panel_id,
                panel_name=panel_def.name,
                metrics=panel_metrics,
                composite_score=composite,
                composite_ci=ci,
                signal_tier=panel_tier,
                strongest_metric=strongest,
                weakest_metric=weakest,
            )
        )

    # --- Model bias detection ---
    model_biases: list[ModelBiasResult] = []
    overall_grand_mean = float(df["score"].mean()) if not df.empty else 0.0

    for model_cfg in ALL_MODELS:
        model_df = df[df["model_id"] == model_cfg.api_model_id]
        if model_df.empty:
            continue
        model_grand = float(model_df["score"].mean())
        bias = model_grand - overall_grand_mean
        model_biases.append(
            ModelBiasResult(
                model_id=model_cfg.api_model_id,
                model_name=model_cfg.display_name,
                grand_mean=model_grand,
                bias=bias,
                correction_factor=bias if abs(bias) > 0.5 else 0.0,
                needs_correction=abs(bias) > 0.5,
            )
        )

    # --- Grand composite ---
    if panel_analyses:
        panel_scores = [pa.composite_score for pa in panel_analyses]
        grand_composite = float(np.mean(panel_scores))
        gc_se = float(np.std(panel_scores, ddof=1) / np.sqrt(len(panel_scores)))
        grand_composite_ci = (grand_composite - 1.96 * gc_se, grand_composite + 1.96 * gc_se)
    else:
        grand_composite = 0.0
        grand_composite_ci = (0.0, 0.0)

    # --- Signal classification ---
    all_metrics = list(metric_analyses.values())
    confirmed_strengths = [ma for ma in all_metrics if ma.grand_mean >= 7.0 and ma.icc >= 0.75]
    confirmed_weaknesses = [ma for ma in all_metrics if ma.grand_mean <= 4.0 and ma.icc >= 0.75]
    key_disagreements = [
        ma for ma in all_metrics if ma.icc < 0.50 and (max(ma.scores) - min(ma.scores)) > 3
    ]

    return FullAnalysis(
        metric_analyses=metric_analyses,
        panel_analyses=panel_analyses,
        model_biases=model_biases,
        grand_composite=grand_composite,
        grand_composite_ci=grand_composite_ci,
        total_evaluations=total,
        conformance_rate=conformance_rate,
        confirmed_strengths=sorted(confirmed_strengths, key=lambda m: -m.grand_mean),
        confirmed_weaknesses=sorted(confirmed_weaknesses, key=lambda m: m.grand_mean),
        key_disagreements=sorted(key_disagreements, key=lambda m: m.icc),
    )
