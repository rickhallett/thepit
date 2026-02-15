package persona

import "time"

// FreeLurker: anonymous browser who reads bouts but never signs up.
func FreeLurker() *Spec {
	return &Spec{
		ID:           "free-lurker",
		Name:         "Free Lurker",
		Description:  "Browses pages and reads bouts without signing up",
		Tier:         TierAnon,
		RequiresAuth: false,
		Actions: []WeightedAction{
			{ActionBrowse, 60},
			{ActionRunBout, 20}, // anon bouts via intro pool
			{ActionListFeatures, 5},
			{ActionNewsletter, 3},
			{ActionContact, 2},
		},
		SessionActionsMin: 2,
		SessionActionsMax: 8,
		ThinkTimeMin:      2 * time.Second,
		ThinkTimeMax:      10 * time.Second,
		MaxTurns:          4,
		BoutTopics:        generalTopics,
		Tags:              []string{"free-only", "anon"},
	}
}

// FreeCasual: signed-up free user who runs a few bouts and votes once.
func FreeCasual() *Spec {
	return &Spec{
		ID:           "free-casual",
		Name:         "Free Casual",
		Description:  "Signs up, runs 2-3 bouts, votes once, leaves",
		Tier:         TierFree,
		RequiresAuth: true,
		Actions: []WeightedAction{
			{ActionBrowse, 20},
			{ActionRunBout, 40},
			{ActionReaction, 15},
			{ActionVote, 10},
			{ActionListFeatures, 5},
			{ActionShortLink, 5},
			{ActionContact, 5},
		},
		SessionActionsMin: 3,
		SessionActionsMax: 8,
		ThinkTimeMin:      3 * time.Second,
		ThinkTimeMax:      15 * time.Second,
		MaxTurns:          8,
		BoutTopics:        generalTopics,
		Tags:              []string{"free-only"},
	}
}

// FreePowerUser: free user who hits all limits, creates agents, tries BYOK.
func FreePowerUser() *Spec {
	return &Spec{
		ID:           "free-power-user",
		Name:         "Free Power User",
		Description:  "Hits all rate limits, creates agents, tries BYOK stash",
		Tier:         TierFree,
		RequiresAuth: true,
		Actions: []WeightedAction{
			{ActionRunBout, 30},
			{ActionCreateAgent, 15},
			{ActionReaction, 10},
			{ActionVote, 10},
			{ActionBYOK, 10},
			{ActionSubmitFeature, 8},
			{ActionVoteFeature, 7},
			{ActionShortLink, 5},
			{ActionBrowse, 5},
		},
		SessionActionsMin: 10,
		SessionActionsMax: 25,
		ThinkTimeMin:      1 * time.Second,
		ThinkTimeMax:      5 * time.Second,
		MaxTurns:          12,
		BoutTopics:        append(generalTopics, technicalTopics...),
		Tags:              []string{"free-only", "stress"},
	}
}

// PassSubscriber: daily pass user, runs 5-10 bouts/day, votes, reacts.
func PassSubscriber() *Spec {
	return &Spec{
		ID:           "pass-subscriber",
		Name:         "Pass Subscriber",
		Description:  "Daily user, 5-10 bouts, votes and reacts regularly",
		Tier:         TierPass,
		RequiresAuth: true,
		Actions: []WeightedAction{
			{ActionRunBout, 35},
			{ActionReaction, 20},
			{ActionVote, 15},
			{ActionCreateAgent, 8},
			{ActionBrowse, 8},
			{ActionShortLink, 5},
			{ActionSubmitFeature, 4},
			{ActionVoteFeature, 3},
			{ActionSubmitPaper, 2},
		},
		SessionActionsMin: 8,
		SessionActionsMax: 20,
		ThinkTimeMin:      2 * time.Second,
		ThinkTimeMax:      8 * time.Second,
		Model:             "claude-sonnet-4-5-20250929",
		MaxTurns:          12,
		BoutTopics:        append(generalTopics, technicalTopics...),
		Tags:              []string{"paid-only"},
	}
}

// LabPowerUser: API-tier user, calls /api/v1/bout, uses Opus, many agents.
func LabPowerUser() *Spec {
	return &Spec{
		ID:           "lab-power-user",
		Name:         "Lab Power User",
		Description:  "API access, /api/v1/bout, Opus model, creates many agents",
		Tier:         TierLab,
		RequiresAuth: true,
		Actions: []WeightedAction{
			{ActionAPIBout, 35},
			{ActionRunBout, 15},
			{ActionCreateAgent, 20},
			{ActionReaction, 8},
			{ActionVote, 7},
			{ActionBrowse, 5},
			{ActionShortLink, 5},
			{ActionSubmitPaper, 3},
			{ActionBYOK, 2},
		},
		SessionActionsMin: 10,
		SessionActionsMax: 30,
		ThinkTimeMin:      500 * time.Millisecond,
		ThinkTimeMax:      3 * time.Second,
		Model:             "claude-opus-4-6",
		MaxTurns:          12,
		BoutTopics:        append(technicalTopics, generalTopics...),
		Tags:              []string{"paid-only", "stress"},
	}
}

// AbusiveUser: attempts XSS, SQL injection, IDOR, and rate limit flooding.
func AbusiveUser() *Spec {
	return &Spec{
		ID:           "abusive-user",
		Name:         "Abusive User",
		Description:  "XSS/SQLi/IDOR probes and rate limit flooding",
		Tier:         TierFree,
		RequiresAuth: true,
		Actions: []WeightedAction{
			{ActionXSSProbe, 25},
			{ActionSQLInjection, 25},
			{ActionIDORProbe, 20},
			{ActionRateLimitFlood, 20},
			{ActionRunBout, 5},
			{ActionBrowse, 5},
		},
		SessionActionsMin: 15,
		SessionActionsMax: 50,
		ThinkTimeMin:      100 * time.Millisecond,
		ThinkTimeMax:      500 * time.Millisecond,
		MaxTurns:          4,
		BoutTopics:        provocativeTopics,
		Tags:              []string{"free-only", "stress"},
	}
}

// ViralSharer: creates bouts, generates short links, shares them.
func ViralSharer() *Spec {
	return &Spec{
		ID:           "viral-sharer",
		Name:         "Viral Sharer",
		Description:  "Creates bouts and generates shareable short links",
		Tier:         TierPass,
		RequiresAuth: true,
		Actions: []WeightedAction{
			{ActionRunBout, 30},
			{ActionShortLink, 25},
			{ActionReaction, 15},
			{ActionVote, 10},
			{ActionBrowse, 10},
			{ActionCreateAgent, 5},
			{ActionSubmitFeature, 3},
			{ActionContact, 2},
		},
		SessionActionsMin: 5,
		SessionActionsMax: 15,
		ThinkTimeMin:      1 * time.Second,
		ThinkTimeMax:      5 * time.Second,
		Model:             "claude-sonnet-4-5-20250929",
		MaxTurns:          8,
		BoutTopics:        append(provocativeTopics, generalTopics...),
		Tags:              []string{"paid-only"},
	}
}

// Churner: subscribes, downgrades, re-subscribes, cancels.
// In simulation, this translates to alternating behaviour between
// pass-tier and free-tier actions across sessions.
func Churner() *Spec {
	return &Spec{
		ID:           "churner",
		Name:         "Churner",
		Description:  "Subscribes, downgrades, re-subscribes, cancels",
		Tier:         TierPass, // starts as pass, but behaviour oscillates
		RequiresAuth: true,
		Actions: []WeightedAction{
			{ActionRunBout, 25},
			{ActionBrowse, 20},
			{ActionReaction, 15},
			{ActionVote, 10},
			{ActionListFeatures, 10},
			{ActionSubmitFeature, 8},
			{ActionShortLink, 5},
			{ActionContact, 5},
			{ActionNewsletter, 2},
		},
		SessionActionsMin: 3,
		SessionActionsMax: 12,
		ThinkTimeMin:      2 * time.Second,
		ThinkTimeMax:      10 * time.Second,
		MaxTurns:          8,
		BoutTopics:        generalTopics,
		Tags:              []string{"paid-only"},
	}
}
