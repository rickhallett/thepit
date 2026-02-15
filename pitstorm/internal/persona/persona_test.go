package persona

import (
	"testing"
	"time"
)

func TestAllReturns8Personas(t *testing.T) {
	all := All()
	if len(all) != 8 {
		t.Errorf("All() returned %d personas, want 8", len(all))
	}
}

func TestUniqueIDs(t *testing.T) {
	seen := make(map[string]bool)
	for _, p := range All() {
		if seen[p.ID] {
			t.Errorf("duplicate persona ID: %q", p.ID)
		}
		seen[p.ID] = true
	}
}

func TestIDs(t *testing.T) {
	ids := IDs()
	if len(ids) != 8 {
		t.Errorf("IDs() returned %d, want 8", len(ids))
	}
	expected := []string{
		"free-lurker", "free-casual", "free-power-user",
		"pass-subscriber", "lab-power-user", "abusive-user",
		"viral-sharer", "churner",
	}
	for i, want := range expected {
		if ids[i] != want {
			t.Errorf("ids[%d] = %q, want %q", i, ids[i], want)
		}
	}
}

func TestByID(t *testing.T) {
	for _, id := range IDs() {
		p, err := ByID(id)
		if err != nil {
			t.Errorf("ByID(%q): %v", id, err)
			continue
		}
		if p.ID != id {
			t.Errorf("ByID(%q).ID = %q", id, p.ID)
		}
	}
}

func TestByIDUnknown(t *testing.T) {
	_, err := ByID("nonexistent")
	if err == nil {
		t.Error("ByID(nonexistent) should error")
	}
}

func TestByTag(t *testing.T) {
	tests := []struct {
		tag    string
		minLen int
	}{
		{"free-only", 3},
		{"paid-only", 4},
		{"stress", 2},
		{"anon", 1},
	}

	for _, tt := range tests {
		result := ByTag(tt.tag)
		if len(result) < tt.minLen {
			t.Errorf("ByTag(%q) returned %d, want >= %d", tt.tag, len(result), tt.minLen)
		}
		for _, p := range result {
			hasTag := false
			for _, tag := range p.Tags {
				if tag == tt.tag {
					hasTag = true
					break
				}
			}
			if !hasTag {
				t.Errorf("persona %q returned by ByTag(%q) doesn't have that tag", p.ID, tt.tag)
			}
		}
	}
}

func TestByTagUnknown(t *testing.T) {
	result := ByTag("nonexistent")
	if len(result) != 0 {
		t.Errorf("ByTag(nonexistent) returned %d, want 0", len(result))
	}
}

func TestResolveAll(t *testing.T) {
	result, err := Resolve([]string{"all"})
	if err != nil {
		t.Fatalf("Resolve: %v", err)
	}
	if len(result) != 8 {
		t.Errorf("Resolve(all) returned %d, want 8", len(result))
	}
}

func TestResolveEmpty(t *testing.T) {
	result, err := Resolve(nil)
	if err != nil {
		t.Fatalf("Resolve: %v", err)
	}
	if len(result) != 8 {
		t.Errorf("Resolve(nil) returned %d, want 8", len(result))
	}
}

func TestResolveByID(t *testing.T) {
	result, err := Resolve([]string{"free-lurker", "lab-power-user"})
	if err != nil {
		t.Fatalf("Resolve: %v", err)
	}
	if len(result) != 2 {
		t.Fatalf("Resolve returned %d, want 2", len(result))
	}
	if result[0].ID != "free-lurker" {
		t.Errorf("result[0].ID = %q, want free-lurker", result[0].ID)
	}
	if result[1].ID != "lab-power-user" {
		t.Errorf("result[1].ID = %q, want lab-power-user", result[1].ID)
	}
}

func TestResolveByTag(t *testing.T) {
	result, err := Resolve([]string{"stress"})
	if err != nil {
		t.Fatalf("Resolve: %v", err)
	}
	if len(result) < 2 {
		t.Errorf("Resolve(stress) returned %d, want >= 2", len(result))
	}
}

func TestResolveMixed(t *testing.T) {
	result, err := Resolve([]string{"free-lurker", "paid-only"})
	if err != nil {
		t.Fatalf("Resolve: %v", err)
	}
	// free-lurker + 4 paid-only personas = 5 (no duplicates).
	if len(result) < 5 {
		t.Errorf("Resolve(free-lurker, paid-only) returned %d, want >= 5", len(result))
	}
}

func TestResolveDedup(t *testing.T) {
	// pass-subscriber is paid-only, so listing both should not duplicate.
	result, err := Resolve([]string{"pass-subscriber", "paid-only"})
	if err != nil {
		t.Fatalf("Resolve: %v", err)
	}
	seen := make(map[string]int)
	for _, p := range result {
		seen[p.ID]++
		if seen[p.ID] > 1 {
			t.Errorf("duplicate in result: %q", p.ID)
		}
	}
}

func TestResolveUnknown(t *testing.T) {
	_, err := Resolve([]string{"nonexistent"})
	if err == nil {
		t.Error("Resolve(nonexistent) should error")
	}
}

// ---------- Persona spec validation ----------

func TestAllPersonasHaveActions(t *testing.T) {
	for _, p := range All() {
		if len(p.Actions) == 0 {
			t.Errorf("persona %q has no actions", p.ID)
		}
	}
}

func TestAllPersonasHavePositiveWeights(t *testing.T) {
	for _, p := range All() {
		var total float64
		for _, wa := range p.Actions {
			if wa.Weight <= 0 {
				t.Errorf("persona %q action %q has weight %f", p.ID, wa.Action, wa.Weight)
			}
			total += wa.Weight
		}
		if total <= 0 {
			t.Errorf("persona %q total weight = %f", p.ID, total)
		}
	}
}

func TestAllPersonasHaveSessionRange(t *testing.T) {
	for _, p := range All() {
		if p.SessionActionsMin <= 0 {
			t.Errorf("persona %q SessionActionsMin = %d", p.ID, p.SessionActionsMin)
		}
		if p.SessionActionsMax < p.SessionActionsMin {
			t.Errorf("persona %q SessionActionsMax (%d) < Min (%d)",
				p.ID, p.SessionActionsMax, p.SessionActionsMin)
		}
	}
}

func TestAllPersonasHaveThinkTime(t *testing.T) {
	for _, p := range All() {
		if p.ThinkTimeMin <= 0 {
			t.Errorf("persona %q ThinkTimeMin = %v", p.ID, p.ThinkTimeMin)
		}
		if p.ThinkTimeMax < p.ThinkTimeMin {
			t.Errorf("persona %q ThinkTimeMax (%v) < Min (%v)",
				p.ID, p.ThinkTimeMax, p.ThinkTimeMin)
		}
	}
}

func TestAllPersonasHaveBoutTopics(t *testing.T) {
	for _, p := range All() {
		if len(p.BoutTopics) == 0 {
			t.Errorf("persona %q has no bout topics", p.ID)
		}
	}
}

func TestAllPersonasHaveTags(t *testing.T) {
	for _, p := range All() {
		if len(p.Tags) == 0 {
			t.Errorf("persona %q has no tags", p.ID)
		}
	}
}

func TestAllPersonasHaveMaxTurns(t *testing.T) {
	for _, p := range All() {
		if p.MaxTurns <= 0 {
			t.Errorf("persona %q MaxTurns = %d", p.ID, p.MaxTurns)
		}
	}
}

// ---------- Spec method tests ----------

func TestPickAction(t *testing.T) {
	p := FreeCasual()

	// Run 1000 picks and verify distribution is roughly right.
	counts := make(map[Action]int)
	for i := 0; i < 1000; i++ {
		a := p.PickAction()
		counts[a]++
	}

	// RunBout has weight 40/100, should be most frequent.
	if counts[ActionRunBout] < 200 {
		t.Errorf("RunBout picked %d times, expected > 200 (weight 40%%)", counts[ActionRunBout])
	}
	// Browse has weight 20/100.
	if counts[ActionBrowse] < 100 {
		t.Errorf("Browse picked %d times, expected > 100 (weight 20%%)", counts[ActionBrowse])
	}
}

func TestPickActionEmpty(t *testing.T) {
	p := &Spec{Actions: nil}
	a := p.PickAction()
	if a != ActionBrowse {
		t.Errorf("PickAction on empty = %q, want browse", a)
	}
}

func TestSessionLength(t *testing.T) {
	p := PassSubscriber()

	for i := 0; i < 100; i++ {
		n := p.SessionLength()
		if n < p.SessionActionsMin || n > p.SessionActionsMax {
			t.Errorf("SessionLength = %d, want [%d, %d]",
				n, p.SessionActionsMin, p.SessionActionsMax)
		}
	}
}

func TestSessionLengthEqual(t *testing.T) {
	p := &Spec{SessionActionsMin: 5, SessionActionsMax: 5}
	if n := p.SessionLength(); n != 5 {
		t.Errorf("SessionLength = %d, want 5 (min == max)", n)
	}
}

func TestThinkDelay(t *testing.T) {
	p := FreeLurker()

	for i := 0; i < 100; i++ {
		d := p.ThinkDelay()
		if d < p.ThinkTimeMin || d > p.ThinkTimeMax {
			t.Errorf("ThinkDelay = %v, want [%v, %v]",
				d, p.ThinkTimeMin, p.ThinkTimeMax)
		}
	}
}

func TestThinkDelayEqual(t *testing.T) {
	p := &Spec{ThinkTimeMin: 5 * time.Second, ThinkTimeMax: 5 * time.Second}
	if d := p.ThinkDelay(); d != 5*time.Second {
		t.Errorf("ThinkDelay = %v, want 5s (min == max)", d)
	}
}

func TestPickTopic(t *testing.T) {
	p := FreeCasual()
	seen := make(map[string]bool)
	for i := 0; i < 50; i++ {
		topic := p.PickTopic()
		if topic == "" {
			t.Error("PickTopic returned empty string")
		}
		seen[topic] = true
	}
	// Should see more than one unique topic.
	if len(seen) < 3 {
		t.Errorf("only %d unique topics in 50 picks, expected variety", len(seen))
	}
}

func TestPickTopicEmpty(t *testing.T) {
	p := &Spec{BoutTopics: nil}
	topic := p.PickTopic()
	if topic != "The meaning of existence" {
		t.Errorf("PickTopic on empty = %q, want default", topic)
	}
}

// ---------- Tier-specific checks ----------

func TestFreeLurkerIsAnon(t *testing.T) {
	p := FreeLurker()
	if p.Tier != TierAnon {
		t.Errorf("Tier = %q, want anon", p.Tier)
	}
	if p.RequiresAuth {
		t.Error("FreeLurker should not require auth")
	}
}

func TestLabPowerUserHasAPIBout(t *testing.T) {
	p := LabPowerUser()
	if p.Tier != TierLab {
		t.Errorf("Tier = %q, want lab", p.Tier)
	}
	hasAPIBout := false
	for _, wa := range p.Actions {
		if wa.Action == ActionAPIBout {
			hasAPIBout = true
			break
		}
	}
	if !hasAPIBout {
		t.Error("LabPowerUser should have APIBout action")
	}
}

func TestAbusiveUserHasSecurityProbes(t *testing.T) {
	p := AbusiveUser()
	actions := make(map[Action]bool)
	for _, wa := range p.Actions {
		actions[wa.Action] = true
	}
	for _, expected := range []Action{ActionXSSProbe, ActionSQLInjection, ActionIDORProbe, ActionRateLimitFlood} {
		if !actions[expected] {
			t.Errorf("AbusiveUser missing action %q", expected)
		}
	}
}
