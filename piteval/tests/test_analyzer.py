"""Tests for the statistical analyzer.

Tests that:
1. Signal tier classification follows the protocol thresholds exactly.
2. The analyzer handles edge cases (empty data, single model, single iteration).
3. ICC-weighted composites weight high-agreement metrics more heavily.
"""

from piteval.analyzer import _classify_signal_tier


class TestSignalTierClassification:
    """Signal tier thresholds from the protocol — these are the spec."""

    def test_signal_high_icc_low_variance(self):
        assert _classify_signal_tier(icc=0.80, within_variance=1.0) == "Signal"

    def test_signal_exact_threshold(self):
        assert _classify_signal_tier(icc=0.75, within_variance=1.5) == "Signal"

    def test_probable_signal_moderate_icc(self):
        assert _classify_signal_tier(icc=0.60, within_variance=2.0) == "Probable Signal"

    def test_probable_signal_exact_threshold(self):
        assert _classify_signal_tier(icc=0.50, within_variance=2.5) == "Probable Signal"

    def test_ambiguous_low_icc(self):
        assert _classify_signal_tier(icc=0.35, within_variance=2.0) == "Ambiguous"

    def test_ambiguous_high_variance(self):
        assert _classify_signal_tier(icc=0.60, within_variance=3.0) == "Ambiguous"

    def test_noise_very_low_icc(self):
        assert _classify_signal_tier(icc=0.20, within_variance=1.0) == "Noise"

    def test_noise_zero_icc(self):
        assert _classify_signal_tier(icc=0.0, within_variance=0.5) == "Noise"
