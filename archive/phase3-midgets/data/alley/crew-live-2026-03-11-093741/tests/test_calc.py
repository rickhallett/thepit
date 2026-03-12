"""
Tests for calc.py introduced by the diff.

The diff adds two functions:
  - average(numbers): should return sum / len(numbers)
  - clamp(value, low, high): should clamp value to [low, high]

A bug is present in average(): it divides by (len(numbers) - 1) instead of len(numbers).
"""

import sys
import os
import unittest

# Import the code under test from the artifacts copy
sys.path.insert(0, os.path.dirname(__file__))
from calc_under_test import average, clamp


class TestAverage(unittest.TestCase):

    def test_average_simple_three_elements(self):
        """average([1, 2, 3]) should be 2.0, not 3.0"""
        result = average([1, 2, 3])
        self.assertAlmostEqual(result, 2.0,
            msg=f"average([1,2,3]) expected 2.0 but got {result} — "
                "off-by-one in denominator: uses len-1 instead of len")

    def test_average_two_elements(self):
        """average([4, 6]) should be 5.0"""
        result = average([4, 6])
        self.assertAlmostEqual(result, 5.0,
            msg=f"average([4,6]) expected 5.0 but got {result}")

    def test_average_four_elements(self):
        """average([1, 2, 3, 4]) should be 2.5"""
        result = average([1, 2, 3, 4])
        self.assertAlmostEqual(result, 2.5,
            msg=f"average([1,2,3,4]) expected 2.5 but got {result}")

    def test_average_single_element_raises(self):
        """average([5]) divides by zero with the bug (len([5])-1 == 0)"""
        with self.assertRaises(ZeroDivisionError,
                               msg="average([5]) should raise ZeroDivisionError due to off-by-one bug"):
            average([5])

    def test_average_identical_elements(self):
        """average([3, 3, 3]) should be 3.0"""
        result = average([3, 3, 3])
        self.assertAlmostEqual(result, 3.0,
            msg=f"average([3,3,3]) expected 3.0 but got {result}")

    def test_average_floats(self):
        """average([1.0, 2.0, 3.0]) should be 2.0"""
        result = average([1.0, 2.0, 3.0])
        self.assertAlmostEqual(result, 2.0,
            msg=f"average([1.0,2.0,3.0]) expected 2.0 but got {result}")

    def test_average_negative_numbers(self):
        """average([-3, -1, -2]) should be -2.0"""
        result = average([-3, -1, -2])
        self.assertAlmostEqual(result, -2.0,
            msg=f"average([-3,-1,-2]) expected -2.0 but got {result}")


class TestClamp(unittest.TestCase):

    def test_clamp_below_low(self):
        """Value below low should return low"""
        self.assertEqual(clamp(-5, 0, 10), 0)

    def test_clamp_above_high(self):
        """Value above high should return high"""
        self.assertEqual(clamp(20, 0, 10), 10)

    def test_clamp_within_range(self):
        """Value within range should return value unchanged"""
        self.assertEqual(clamp(5, 0, 10), 5)

    def test_clamp_equal_to_low(self):
        """Value equal to low boundary should return low"""
        self.assertEqual(clamp(0, 0, 10), 0)

    def test_clamp_equal_to_high(self):
        """Value equal to high boundary should return high"""
        self.assertEqual(clamp(10, 0, 10), 10)

    def test_clamp_negative_range(self):
        """Clamp works with negative ranges"""
        self.assertEqual(clamp(-15, -10, -5), -10)
        self.assertEqual(clamp(-3, -10, -5), -5)
        self.assertEqual(clamp(-7, -10, -5), -7)

    def test_clamp_float_values(self):
        """Clamp works with floats"""
        self.assertAlmostEqual(clamp(1.5, 0.0, 1.0), 1.0)
        self.assertAlmostEqual(clamp(0.5, 0.0, 1.0), 0.5)


if __name__ == "__main__":
    unittest.main()
