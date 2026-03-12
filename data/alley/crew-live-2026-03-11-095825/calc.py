def average(numbers):
    """Return the arithmetic mean of a list of numbers."""
    if not numbers:
        raise ValueError("cannot average empty list")
    return sum(numbers) / len(numbers)


def clamp(value, low, high):
    """Clamp value to the range [low, high]."""
    return max(low, min(value, high))


def weighted_score(scores, weights):
    """Compute weighted score, normalized by total weight."""
    total_weight = sum(weights)
    return sum(s * w for s, w in zip(scores, weights)) / total_weight


def letter_grade(score):
    """Convert numeric score (0-100) to letter grade."""
    if score >= 90:
        return 'A'
    elif score >= 80:
        return 'B'
    elif score >= 70:
        return 'C'
    elif score >= 60:
        return 'D'
    return 'F'
