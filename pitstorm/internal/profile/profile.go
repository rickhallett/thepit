// Package profile implements the 5 built-in traffic profiles for pitstorm.
// Each profile is a RateFunc that returns the target requests-per-second
// at any given point during the simulation.
//
// Profiles:
//   - trickle: constant 1-2 req/s
//   - steady:  constant rate at the configured peak
//   - ramp:    linear ramp up over 60% of duration, then ease off
//   - spike:   sudden burst at the midpoint
//   - viral:   exponential ramp up simulating viral growth
package profile

import (
	"fmt"
	"math"
	"time"
)

// RateFunc returns the target requests-per-second at the given elapsed time.
type RateFunc func(elapsed time.Duration, total time.Duration) float64

// Get returns the RateFunc for the named profile at the given peak rate.
func Get(name string, peakRate float64) (RateFunc, error) {
	switch name {
	case "trickle":
		return Trickle(peakRate), nil
	case "steady":
		return Steady(peakRate), nil
	case "ramp":
		return Ramp(peakRate), nil
	case "spike":
		return Spike(peakRate), nil
	case "viral":
		return Viral(peakRate), nil
	default:
		return nil, fmt.Errorf("unknown profile %q: must be trickle|steady|ramp|spike|viral", name)
	}
}

// Names returns all available profile names.
func Names() []string {
	return []string{"trickle", "steady", "ramp", "spike", "viral"}
}

// Trickle produces a constant low rate. The rate oscillates gently
// between 1 and min(2, peakRate) to simulate realistic irregular traffic.
func Trickle(peakRate float64) RateFunc {
	base := math.Min(peakRate, 1.0)
	amplitude := math.Min(peakRate, 2.0) - base
	if amplitude < 0 {
		amplitude = 0
	}
	return func(elapsed, total time.Duration) float64 {
		// Gentle sine oscillation with ~30s period.
		t := elapsed.Seconds()
		return base + amplitude*0.5*(1+math.Sin(t*2*math.Pi/30))
	}
}

// Steady produces a constant rate at the configured peak.
func Steady(peakRate float64) RateFunc {
	return func(elapsed, total time.Duration) float64 {
		return peakRate
	}
}

// Ramp linearly increases from 0 to peakRate over 60% of the duration,
// holds at peak for 20%, then linearly decreases back to 10% of peak.
func Ramp(peakRate float64) RateFunc {
	return func(elapsed, total time.Duration) float64 {
		if total <= 0 {
			return peakRate
		}
		progress := elapsed.Seconds() / total.Seconds()
		if progress < 0 {
			progress = 0
		}
		if progress > 1 {
			progress = 1
		}

		switch {
		case progress < 0.6:
			// Linear ramp up: 0 -> peakRate over first 60%.
			return peakRate * (progress / 0.6)
		case progress < 0.8:
			// Hold at peak for 20%.
			return peakRate
		default:
			// Linear ramp down: peakRate -> 10% of peak over last 20%.
			downProgress := (progress - 0.8) / 0.2
			return peakRate * (1.0 - 0.9*downProgress)
		}
	}
}

// Spike starts at 10% of peak, then jumps to full peak at the midpoint
// for 10% of the duration, then drops back to 10%.
func Spike(peakRate float64) RateFunc {
	baseline := peakRate * 0.1
	return func(elapsed, total time.Duration) float64 {
		if total <= 0 {
			return peakRate
		}
		progress := elapsed.Seconds() / total.Seconds()
		if progress < 0 {
			progress = 0
		}
		if progress > 1 {
			progress = 1
		}

		// Spike window: 45% to 55% of total duration.
		if progress >= 0.45 && progress <= 0.55 {
			return peakRate
		}
		return baseline
	}
}

// Viral simulates exponential growth: starts at 1% of peak and
// grows exponentially to peak over the full duration.
// f(t) = peakRate * (0.01 * e^(ln(100) * t/T))
// At t=0: 0.01 * peak. At t=T: 0.01 * 100 * peak = peak.
func Viral(peakRate float64) RateFunc {
	ln100 := math.Log(100)
	return func(elapsed, total time.Duration) float64 {
		if total <= 0 {
			return peakRate
		}
		progress := elapsed.Seconds() / total.Seconds()
		if progress < 0 {
			progress = 0
		}
		if progress > 1 {
			progress = 1
		}

		rate := peakRate * 0.01 * math.Exp(ln100*progress)
		if rate > peakRate {
			rate = peakRate
		}
		return rate
	}
}

// Describe returns a human-readable description of a profile.
func Describe(name string) string {
	switch name {
	case "trickle":
		return "Constant low rate (1-2 req/s), gentle sine oscillation"
	case "steady":
		return "Constant rate at configured peak"
	case "ramp":
		return "Linear ramp to peak (60%), hold (20%), ease off (20%)"
	case "spike":
		return "Baseline at 10%, sudden burst to peak at midpoint (10% window)"
	case "viral":
		return "Exponential growth from 1% to 100% of peak over duration"
	default:
		return "Unknown profile"
	}
}
