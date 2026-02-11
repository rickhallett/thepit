// Package agent defines the agent data types and YAML serialization
// for pitforge. These types mirror the TypeScript agent schema in db/schema.ts
// and lib/agent-prompts.ts.
package agent

import (
	"fmt"
	"os"
	"strings"

	"gopkg.in/yaml.v3"
)

// Definition represents an agent definition file (YAML).
type Definition struct {
	// Identity
	Name string `yaml:"name" json:"name"`

	// Structured personality fields (matching lib/agent-prompts.ts AgentPromptFields)
	Archetype          string   `yaml:"archetype,omitempty" json:"archetype,omitempty"`
	Tone               string   `yaml:"tone,omitempty" json:"tone,omitempty"`
	Quirks             []string `yaml:"quirks,omitempty" json:"quirks,omitempty"`
	SpeechPattern      string   `yaml:"speechPattern,omitempty" json:"speechPattern,omitempty"`
	OpeningMove        string   `yaml:"openingMove,omitempty" json:"openingMove,omitempty"`
	SignatureMove      string   `yaml:"signatureMove,omitempty" json:"signatureMove,omitempty"`
	Weakness           string   `yaml:"weakness,omitempty" json:"weakness,omitempty"`
	Goal               string   `yaml:"goal,omitempty" json:"goal,omitempty"`
	Fears              string   `yaml:"fears,omitempty" json:"fears,omitempty"`
	CustomInstructions string   `yaml:"customInstructions,omitempty" json:"customInstructions,omitempty"`

	// Optional explicit system prompt (overrides structured fields if non-empty)
	SystemPrompt string `yaml:"systemPrompt,omitempty" json:"systemPrompt,omitempty"`

	// Metadata
	Tier           string `yaml:"tier,omitempty" json:"tier,omitempty"`
	Model          string `yaml:"model,omitempty" json:"model,omitempty"`
	ResponseLength string `yaml:"responseLength,omitempty" json:"responseLength,omitempty"`
	ResponseFormat string `yaml:"responseFormat,omitempty" json:"responseFormat,omitempty"`
}

// Manifest represents the fields used for manifest hashing, matching
// the AgentManifest type in lib/agent-dna.ts.
type Manifest struct {
	AgentID        string  `json:"agentId"`
	Name           string  `json:"name"`
	SystemPrompt   string  `json:"systemPrompt"`
	PresetID       *string `json:"presetId"`
	Tier           string  `json:"tier"`
	Model          *string `json:"model"`
	ResponseLength string  `json:"responseLength"`
	ResponseFormat string  `json:"responseFormat"`
	CreatedAt      string  `json:"createdAt"`
	ParentID       *string `json:"parentId"`
	OwnerID        *string `json:"ownerId"`
}

// LoadFromFile reads an agent definition from a YAML file.
func LoadFromFile(path string) (*Definition, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("reading %s: %w", path, err)
	}
	return Parse(data)
}

// Parse decodes YAML bytes into an agent Definition.
func Parse(data []byte) (*Definition, error) {
	var def Definition
	if err := yaml.Unmarshal(data, &def); err != nil {
		return nil, fmt.Errorf("parsing agent YAML: %w", err)
	}
	return &def, nil
}

// Marshal serializes an agent Definition to YAML bytes.
func Marshal(def *Definition) ([]byte, error) {
	return yaml.Marshal(def)
}

// SaveToFile writes an agent definition to a YAML file.
func SaveToFile(path string, def *Definition) error {
	data, err := Marshal(def)
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0644)
}

// Slugify converts an agent name to a filename-safe slug.
func Slugify(name string) string {
	s := strings.ToLower(strings.TrimSpace(name))
	s = strings.ReplaceAll(s, " ", "-")
	s = strings.ReplaceAll(s, "'", "")
	s = strings.ReplaceAll(s, "\"", "")

	var result []byte
	for _, c := range []byte(s) {
		if (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '-' {
			result = append(result, c)
		}
	}
	// Collapse multiple hyphens.
	out := string(result)
	for strings.Contains(out, "--") {
		out = strings.ReplaceAll(out, "--", "-")
	}
	return strings.Trim(out, "-")
}

// ValidTiers is the set of valid agent tiers.
var ValidTiers = map[string]bool{"free": true, "premium": true, "custom": true}

// ValidResponseLengths is the set of valid response lengths.
var ValidResponseLengths = map[string]bool{"short": true, "standard": true, "long": true}

// ValidResponseFormats is the set of valid response formats.
var ValidResponseFormats = map[string]bool{"plain": true, "spaced": true, "markdown": true, "json": true}
