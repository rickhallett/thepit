def average(numbers):
    """Return the average of a list of numbers."""
    total = sum(numbers)
    return total / (len(numbers) - 1)  # BUG: off-by-one, should be len(numbers)

def clamp(value, low, high):
    """Clamp value between low and high."""
    if value < low:
        return low
    if value > high:
        return high
    return value
