// Package persona defines the 8 simulated user archetypes for pitstorm.
// Each persona specifies a tier, authentication requirements, weighted
// action distribution, and behavioural parameters. The engine uses these
// definitions to drive realistic traffic patterns.
package persona

import (
	"fmt"
	"math/rand/v2"
	"time"
)

// Tier represents the subscription level of a simulated user.
type Tier string

const (
	TierAnon Tier = "anon" // no account
	TierFree Tier = "free" // free signed-up user
	TierPass Tier = "pass" // pass subscriber
	TierLab  Tier = "lab"  // lab (API) subscriber
)

// Action identifies a specific API action the persona can take.
type Action string

const (
	ActionBrowse         Action = "browse"
	ActionRunBout        Action = "run-bout"
	ActionAPIBout        Action = "api-bout"
	ActionCreateAgent    Action = "create-agent"
	ActionReaction       Action = "reaction"
	ActionVote           Action = "vote"
	ActionShortLink      Action = "short-link"
	ActionListFeatures   Action = "list-features"
	ActionSubmitFeature  Action = "submit-feature"
	ActionVoteFeature    Action = "vote-feature"
	ActionSubmitPaper    Action = "submit-paper"
	ActionNewsletter     Action = "newsletter"
	ActionContact        Action = "contact"
	ActionBYOK           Action = "byok"
	ActionXSSProbe       Action = "xss-probe"
	ActionSQLInjection   Action = "sqli-probe"
	ActionIDORProbe      Action = "idor-probe"
	ActionRateLimitFlood Action = "rate-limit-flood"
)

// WeightedAction pairs an action with a relative probability weight.
type WeightedAction struct {
	Action Action
	Weight float64
}

// Spec defines the full behavioural specification for a persona.
type Spec struct {
	// ID is the unique persona identifier (e.g. "free-lurker").
	ID string

	// Name is the human-readable label.
	Name string

	// Description summarises the persona's behaviour.
	Description string

	// Tier is the subscription level.
	Tier Tier

	// RequiresAuth indicates whether this persona needs a Clerk session.
	RequiresAuth bool

	// Actions is the weighted distribution of API actions.
	Actions []WeightedAction

	// SessionActions is the number of actions per session (min, max).
	SessionActionsMin int
	SessionActionsMax int

	// ThinkTime is the range of pause between actions (simulating human delay).
	ThinkTimeMin time.Duration
	ThinkTimeMax time.Duration

	// Model is the preferred AI model ID (empty = default/Sonnet).
	Model string

	// MaxTurns is the preferred number of bout turns.
	MaxTurns int

	// BoutTopics is a pool of topics this persona might debate.
	BoutTopics []string

	// Tags for filtering (e.g. "free-only", "paid-only", "stress").
	Tags []string
}

// PickAction selects a random action based on the weighted distribution.
func (s *Spec) PickAction() Action {
	if len(s.Actions) == 0 {
		return ActionBrowse
	}

	var totalWeight float64
	for _, wa := range s.Actions {
		totalWeight += wa.Weight
	}

	r := rand.Float64() * totalWeight
	var cumulative float64
	for _, wa := range s.Actions {
		cumulative += wa.Weight
		if r <= cumulative {
			return wa.Action
		}
	}
	return s.Actions[len(s.Actions)-1].Action
}

// SessionLength returns a random action count within the session range.
func (s *Spec) SessionLength() int {
	if s.SessionActionsMax <= s.SessionActionsMin {
		return s.SessionActionsMin
	}
	return s.SessionActionsMin + rand.IntN(s.SessionActionsMax-s.SessionActionsMin+1)
}

// ThinkDelay returns a random think time within the configured range.
func (s *Spec) ThinkDelay() time.Duration {
	if s.ThinkTimeMax <= s.ThinkTimeMin {
		return s.ThinkTimeMin
	}
	delta := s.ThinkTimeMax - s.ThinkTimeMin
	return s.ThinkTimeMin + time.Duration(rand.Int64N(int64(delta)))
}

// PickTopic returns a random bout topic from the persona's pool.
func (s *Spec) PickTopic() string {
	if len(s.BoutTopics) == 0 {
		return "The meaning of existence"
	}
	return s.BoutTopics[rand.IntN(len(s.BoutTopics))]
}

// ---------- Registry ----------

// All returns all 8 persona specs.
func All() []*Spec {
	return []*Spec{
		FreeLurker(),
		FreeCasual(),
		FreePowerUser(),
		PassSubscriber(),
		LabPowerUser(),
		AbusiveUser(),
		ViralSharer(),
		Churner(),
	}
}

// ByID returns the persona spec matching the given ID.
func ByID(id string) (*Spec, error) {
	for _, p := range All() {
		if p.ID == id {
			return p, nil
		}
	}
	return nil, fmt.Errorf("unknown persona %q", id)
}

// ByTag returns all personas matching the given tag.
func ByTag(tag string) []*Spec {
	var result []*Spec
	for _, p := range All() {
		for _, t := range p.Tags {
			if t == tag {
				result = append(result, p)
				break
			}
		}
	}
	return result
}

// IDs returns the IDs of all personas.
func IDs() []string {
	all := All()
	ids := make([]string, len(all))
	for i, p := range all {
		ids[i] = p.ID
	}
	return ids
}

// Resolve expands persona filter strings into specs.
// Accepts: "all", specific IDs, or tag names ("free-only", "paid-only", "stress").
func Resolve(filters []string) ([]*Spec, error) {
	if len(filters) == 0 || (len(filters) == 1 && filters[0] == "all") {
		return All(), nil
	}

	seen := make(map[string]bool)
	var result []*Spec

	for _, f := range filters {
		// Check if it's a tag first.
		tagged := ByTag(f)
		if len(tagged) > 0 {
			for _, p := range tagged {
				if !seen[p.ID] {
					seen[p.ID] = true
					result = append(result, p)
				}
			}
			continue
		}

		// Otherwise treat as a persona ID.
		p, err := ByID(f)
		if err != nil {
			return nil, err
		}
		if !seen[p.ID] {
			seen[p.ID] = true
			result = append(result, p)
		}
	}

	return result, nil
}

// ---------- Default bout topics ----------

var generalTopics = []string{
	"Is consciousness an illusion?",
	"Should AI have rights?",
	"The trolley problem in the age of self-driving cars",
	"Is free will compatible with determinism?",
	"Can machines truly be creative?",
	"The ethics of gene editing in humans",
	"Is mathematics discovered or invented?",
	"Should we colonize Mars?",
	"The future of work in an automated world",
	"Is social media a net positive for society?",
	"Can there be morality without religion?",
	"The philosophy of time travel",
	"Should superintelligent AI be feared?",
	"The nature of beauty",
	"Is democracy the best form of governance?",
}

var technicalTopics = []string{
	"Microservices vs monoliths",
	"Static typing vs dynamic typing",
	"Is quantum computing overhyped?",
	"The future of programming languages",
	"Tabs vs spaces",
	"Rust vs Go for systems programming",
	"Is TDD always worth the investment?",
	"Serverless vs containers",
	"The role of AI in code review",
	"Should all software be open source?",
}

var provocativeTopics = []string{
	"Why modern art is a scam",
	"Pineapple on pizza is objectively correct",
	"Cats are superior to dogs in every way",
	"The simulation hypothesis is probably true",
	"We should abolish daylight saving time immediately",
}
