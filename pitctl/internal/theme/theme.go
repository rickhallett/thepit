// Package theme provides the Tokyo Night color palette and reusable
// lipgloss styles for pitctl's terminal output. Consistent with runnerboy.
package theme

import "github.com/charmbracelet/lipgloss"

// Tokyo Night color palette.
var (
	ColorBg       = lipgloss.Color("#1a1b26")
	ColorFg       = lipgloss.Color("#a9b1d6")
	ColorBlue     = lipgloss.Color("#7aa2f7")
	ColorPurple   = lipgloss.Color("#bb9af7")
	ColorGreen    = lipgloss.Color("#9ece6a")
	ColorOrange   = lipgloss.Color("#ff9e64")
	ColorRed      = lipgloss.Color("#f7768e")
	ColorCyan     = lipgloss.Color("#7dcfff")
	ColorYellow   = lipgloss.Color("#e0af68")
	ColorGray     = lipgloss.Color("#565f89")
	ColorDarkGray = lipgloss.Color("#414868")
	ColorBrightFg = lipgloss.Color("#c0caf5")
)

// Reusable styles.
var (
	Title = lipgloss.NewStyle().
		Bold(true).
		Foreground(ColorBlue).
		Padding(0, 1)

	Subtitle = lipgloss.NewStyle().
			Foreground(ColorGray).
			Italic(true).
			Padding(0, 1)

	Success = lipgloss.NewStyle().
		Foreground(ColorGreen).
		Bold(true)

	Warning = lipgloss.NewStyle().
		Foreground(ColorOrange).
		Bold(true)

	Error = lipgloss.NewStyle().
		Foreground(ColorRed).
		Bold(true)

	Muted = lipgloss.NewStyle().
		Foreground(ColorGray)

	Accent = lipgloss.NewStyle().
		Foreground(ColorPurple)

	Value = lipgloss.NewStyle().
		Foreground(ColorFg)

	Bold = lipgloss.NewStyle().
		Bold(true).
		Foreground(ColorBrightFg)

	StatusOK = lipgloss.NewStyle().
			Foreground(ColorGreen)

	StatusWarn = lipgloss.NewStyle().
			Foreground(ColorOrange)

	StatusBad = lipgloss.NewStyle().
			Foreground(ColorRed)
)

// BorderStyle returns the standard table border style.
func BorderStyle() lipgloss.Style {
	return lipgloss.NewStyle().Foreground(ColorDarkGray)
}
