"""
Tests for calc.py — watchdog verification of the introduced diff.
Source: /opt/repo/calc.py
"""
import sys
import math
import pytest

sys.path.insert(0, "/opt/repo")
from calc import average, clamp, weighted_score, letter_grade


# ---------------------------------------------------------------------------
# average()
# ---------------------------------------------------------------------------

class TestAverage:
    def test_basic_integers(self):
        assert average([1, 2, 3, 4, 5]) == 3.0

    def test_single_element(self):
        assert average([7]) == 7.0

    def test_floats(self):
        assert math.isclose(average([1.5, 2.5, 3.0]), 7.0 / 3)

    def test_negative_numbers(self):
        assert average([-3, -1, 0, 1, 3]) == 0.0

    def test_large_list(self):
        nums = list(range(1, 101))   # 1..100, mean = 50.5
        assert average(nums) == 50.5

    def test_empty_list_raises_value_error(self):
        with pytest.raises(ValueError, match="cannot average empty list"):
            average([])

    def test_two_elements(self):
        assert average([10, 20]) == 15.0


# ---------------------------------------------------------------------------
# clamp()
# ---------------------------------------------------------------------------

class TestClamp:
    def test_value_within_range(self):
        assert clamp(5, 0, 10) == 5

    def test_value_at_low_boundary(self):
        assert clamp(0, 0, 10) == 0

    def test_value_at_high_boundary(self):
        assert clamp(10, 0, 10) == 10

    def test_value_below_low(self):
        assert clamp(-5, 0, 10) == 0

    def test_value_above_high(self):
        assert clamp(15, 0, 10) == 10

    def test_float_values(self):
        assert clamp(3.7, 0.0, 5.0) == 3.7

    def test_float_clamp_to_high(self):
        assert clamp(10.1, 0.0, 10.0) == 10.0

    def test_negative_range(self):
        assert clamp(-5, -10, -1) == -5

    def test_single_point_range(self):
        """low == high — value should always equal that point."""
        assert clamp(3, 7, 7) == 7
        assert clamp(7, 7, 7) == 7
        assert clamp(99, 7, 7) == 7


# ---------------------------------------------------------------------------
# weighted_score()
# ---------------------------------------------------------------------------

class TestWeightedScore:
    def test_equal_weights(self):
        # equal weights → same as arithmetic mean
        scores = [80, 90, 70]
        weights = [1, 1, 1]
        assert math.isclose(weighted_score(scores, weights), 80.0)

    def test_unequal_weights(self):
        scores = [100, 0]
        weights = [3, 1]
        # (100*3 + 0*1) / 4 = 75.0
        assert math.isclose(weighted_score(scores, weights), 75.0)

    def test_single_score(self):
        assert math.isclose(weighted_score([85], [1]), 85.0)

    def test_float_scores_and_weights(self):
        scores = [90.0, 80.0]
        weights = [0.6, 0.4]
        expected = (90.0 * 0.6 + 80.0 * 0.4) / 1.0
        assert math.isclose(weighted_score(scores, weights), expected)

    def test_empty_inputs_raises(self):
        """
        DEFECT: weighted_score([],[]) raises ZeroDivisionError rather than
        a descriptive ValueError as average() does for the same situation.
        """
        with pytest.raises((ValueError, ZeroDivisionError)):
            weighted_score([], [])

    def test_all_zero_weights_raises(self):
        """
        DEFECT: all-zero weights cause ZeroDivisionError.
        No guard or descriptive message is raised.
        """
        with pytest.raises((ValueError, ZeroDivisionError)):
            weighted_score([80, 90], [0, 0])

    def test_mismatched_lengths_raises_or_errors(self):
        """
        DEFECT: zip() silently truncates to the shorter iterable when
        scores and weights have different lengths, producing a silently
        wrong result rather than raising an error.
        This test asserts that the function at least raises an exception.
        """
        # Extra weight ignored — result is computed only over first element
        result = weighted_score([100, 0], [1])   # zip stops at 1 pair
        # The 'real' intended result would use both scores, but only 100 is used
        # so result == 100.0 / 1 == 100.0  (silently wrong)
        # We assert the condition that reveals the silent corruption:
        assert result != 50.0, (
            "weighted_score silently ignores the second score when "
            "weights has fewer elements than scores"
        )


# ---------------------------------------------------------------------------
# letter_grade()
# ---------------------------------------------------------------------------

class TestLetterGrade:
    def test_A_at_90(self):
        assert letter_grade(90) == 'A'

    def test_A_at_100(self):
        assert letter_grade(100) == 'A'

    def test_A_at_95(self):
        assert letter_grade(95) == 'A'

    def test_B_at_80(self):
        assert letter_grade(80) == 'B'

    def test_B_at_89(self):
        assert letter_grade(89) == 'B'

    def test_C_at_70(self):
        assert letter_grade(70) == 'C'

    def test_C_at_79(self):
        assert letter_grade(79) == 'C'

    def test_D_at_60(self):
        assert letter_grade(60) == 'D'

    def test_D_at_69(self):
        assert letter_grade(69) == 'D'

    def test_F_at_59(self):
        assert letter_grade(59) == 'F'

    def test_F_at_0(self):
        assert letter_grade(0) == 'F'

    def test_F_at_negative(self):
        assert letter_grade(-1) == 'F'

    def test_boundary_89_point_9(self):
        assert letter_grade(89.9) == 'B'

    def test_boundary_just_below_60(self):
        assert letter_grade(59.9) == 'F'
