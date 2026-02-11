package cmd

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/rickhallett/thepit/pitforge/internal/agent"
	"github.com/rickhallett/thepit/shared/theme"
)

// Templates available via --template flag.
var templates = map[string]*agent.Definition{
	"minimal": {
		Name: "",
		Tier: "free",
	},
	"full": {
		Name:               "",
		Archetype:          "sharp-tongued intellectual",
		Tone:               "measured but provocative",
		Quirks:             []string{"uses metaphors from nature", "quotes obscure philosophers"},
		SpeechPattern:      "Socratic questioning with dramatic pauses",
		OpeningMove:        "attacks the weakest premise first",
		SignatureMove:      "reductio ad absurdum",
		Weakness:           "gets lost in abstraction",
		Goal:               "expose hidden assumptions",
		Fears:              "being predictable",
		CustomInstructions: "always challenge the consensus position",
		Tier:               "free",
		ResponseLength:     "standard",
		ResponseFormat:     "plain",
	},
	"debate": {
		Name:           "",
		Archetype:      "relentless debater",
		Tone:           "confident and assertive",
		Quirks:         []string{"uses rhetorical questions", "demands evidence"},
		SpeechPattern:  "direct and punchy",
		OpeningMove:    "stakes a bold claim",
		SignatureMove:  "turning the opponent's argument against them",
		Weakness:       "can be overly aggressive",
		Goal:           "win the argument",
		Fears:          "conceding a point",
		Tier:           "free",
		ResponseLength: "standard",
		ResponseFormat: "plain",
	},
	"comedy": {
		Name:           "",
		Archetype:      "stand-up comedian philosopher",
		Tone:           "irreverent and witty",
		Quirks:         []string{"drops punchlines mid-argument", "uses absurd analogies"},
		SpeechPattern:  "setup-punchline rhythm",
		OpeningMove:    "opens with a joke about the topic",
		SignatureMove:  "making the audience laugh while making a serious point",
		Weakness:       "sacrifices depth for laughs",
		Goal:           "entertain while enlightening",
		Fears:          "silence after a joke",
		Tier:           "free",
		ResponseLength: "standard",
		ResponseFormat: "plain",
	},
}

// RunInit implements the "init" command.
func RunInit(args []string) {
	if len(args) == 0 {
		fmt.Fprintf(os.Stderr, "%s init requires a name argument\n", theme.Error.Render("error:"))
		fmt.Fprintf(os.Stderr, "\n  Usage: pitforge init <name> [--template minimal|full|debate|comedy]\n\n")
		os.Exit(1)
	}

	name := args[0]
	tmpl := "minimal"

	// Parse --template flag from remaining args.
	for i := 1; i < len(args); i++ {
		if args[i] == "--template" || args[i] == "-t" {
			if i+1 < len(args) {
				tmpl = args[i+1]
			} else {
				fmt.Fprintf(os.Stderr, "%s --template requires a value\n", theme.Error.Render("error:"))
				os.Exit(1)
			}
		}
	}

	base, ok := templates[tmpl]
	if !ok {
		fmt.Fprintf(os.Stderr, "%s unknown template %q (available: minimal, full, debate, comedy)\n",
			theme.Error.Render("error:"), tmpl)
		os.Exit(1)
	}

	// Clone the template and set the name.
	def := *base
	def.Name = name

	// Clone quirks slice to avoid aliasing the template.
	if base.Quirks != nil {
		def.Quirks = make([]string, len(base.Quirks))
		copy(def.Quirks, base.Quirks)
	}

	slug := agent.Slugify(name)
	filename := slug + ".yaml"

	// Check if file already exists.
	if _, err := os.Stat(filename); err == nil {
		fmt.Fprintf(os.Stderr, "%s %s already exists\n", theme.Error.Render("error:"), filename)
		os.Exit(1)
	}

	if err := agent.SaveToFile(filename, &def); err != nil {
		fmt.Fprintf(os.Stderr, "%s writing %s: %v\n", theme.Error.Render("error:"), filename, err)
		os.Exit(1)
	}

	abs, _ := filepath.Abs(filename)
	fmt.Printf("\n  %s Created %s\n", theme.Success.Render("✓"), abs)
	fmt.Printf("  Template: %s\n\n", tmpl)
}
