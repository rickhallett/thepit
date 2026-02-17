package engine

import (
	"context"
	"fmt"
	"math/rand/v2"
	"sync"

	"github.com/rickhallett/thepit/pitstorm/internal/action"
	"github.com/rickhallett/thepit/pitstorm/internal/budget"
	"github.com/rickhallett/thepit/pitstorm/internal/client"
	"github.com/rickhallett/thepit/pitstorm/internal/metrics"
	"github.com/rickhallett/thepit/pitstorm/internal/persona"
)

// validPresetIDs are the free-tier preset IDs that pitstorm can use for bout creation.
var validPresetIDs = []string{
	"gloves-off", "roast-battle", "flatshare", "summit", "shark-pit",
	"mansion", "on-the-couch", "writers-room", "first-contact",
	"last-supper", "darwin-special",
}

// featureCategories are the valid category values for feature-request submissions.
var featureCategories = []string{
	"agents", "arena", "presets", "research", "ui", "other",
}

// relevanceAreas are the valid relevanceArea values for paper submissions.
var relevanceAreas = []string{
	"agent-interaction", "evaluation", "persona", "context-windows",
	"prompt-engineering", "other",
}

// Dispatcher translates persona actions into actual API calls,
// recording metrics and budget charges along the way.
type Dispatcher struct {
	actor   *action.Actor
	metrics *metrics.Collector
	budget  *budget.Gate
	logf    func(string, ...any)

	// boutIDs tracks bout IDs created during this run so that
	// reactions, votes, and short-links can reference real bouts.
	boutMu  sync.Mutex
	boutIDs []string
}

// NewDispatcher creates a Dispatcher.
func NewDispatcher(
	actor *action.Actor,
	m *metrics.Collector,
	b *budget.Gate,
	logf func(string, ...any),
) *Dispatcher {
	if logf == nil {
		logf = func(string, ...any) {}
	}
	return &Dispatcher{
		actor:   actor,
		metrics: m,
		budget:  b,
		logf:    logf,
	}
}

// Dispatch executes a single action for the given persona, recording
// metrics and budget charges.
func (d *Dispatcher) Dispatch(ctx context.Context, workerID int, spec *persona.Spec, act persona.Action) {
	d.metrics.RecordRequest()
	endpoint := actionEndpoint(act)

	switch act {
	case persona.ActionBrowse:
		d.doBrowse(ctx, spec)
	case persona.ActionRunBout:
		d.doRunBout(ctx, workerID, spec)
	case persona.ActionAPIBout:
		d.doAPIBout(ctx, workerID, spec)
	case persona.ActionCreateAgent:
		d.doCreateAgent(ctx, spec)
	case persona.ActionReaction:
		d.doReaction(ctx, spec)
	case persona.ActionVote:
		d.doVote(ctx, spec)
	case persona.ActionShortLink:
		d.doShortLink(ctx)
	case persona.ActionListFeatures:
		d.doListFeatures(ctx)
	case persona.ActionSubmitFeature:
		d.doSubmitFeature(ctx, spec)
	case persona.ActionVoteFeature:
		d.doVoteFeature(ctx, spec)
	case persona.ActionSubmitPaper:
		d.doSubmitPaper(ctx, spec)
	case persona.ActionNewsletter:
		d.doNewsletter(ctx)
	case persona.ActionContact:
		d.doContact(ctx)
	case persona.ActionBYOK:
		d.doBYOK(ctx, spec)
	case persona.ActionXSSProbe:
		d.doXSSProbe(ctx, spec)
	case persona.ActionSQLInjection:
		d.doSQLiProbe(ctx, spec)
	case persona.ActionIDORProbe:
		d.doIDORProbe(ctx, spec)
	case persona.ActionRateLimitFlood:
		d.doRateLimitFlood(ctx, spec)
	default:
		d.logf("[worker-%d] unknown action %q, skipping", workerID, act)
		return
	}

	_ = endpoint // Used for error recording in each handler.
}

// accountID returns a stable account identifier for a persona.
// Anonymous personas get an empty string (no auth).
func accountID(spec *persona.Spec) string {
	if !spec.RequiresAuth {
		return ""
	}
	return "account-" + spec.ID
}

// trackBout records a bout ID so other actions can reference it.
func (d *Dispatcher) trackBout(id string) {
	d.boutMu.Lock()
	d.boutIDs = append(d.boutIDs, id)
	d.boutMu.Unlock()
}

// randomBoutID returns a random bout ID from previously created bouts,
// or empty string if no bouts have been created yet.
func (d *Dispatcher) randomBoutID() string {
	d.boutMu.Lock()
	defer d.boutMu.Unlock()
	if len(d.boutIDs) == 0 {
		return ""
	}
	return d.boutIDs[intn(len(d.boutIDs))]
}

// ---------- Action handlers ----------

func (d *Dispatcher) doBrowse(ctx context.Context, spec *persona.Spec) {
	pages := []string{"/", "/arena", "/agents", "/leaderboard", "/recent", "/developers"}
	page := pages[intn(len(pages))]

	result, err := d.actor.BrowsePage(ctx, page)
	if err != nil {
		d.metrics.RecordError("/browse")
		return
	}
	d.metrics.RecordLatency("/browse", result.Duration)
	d.metrics.RecordStatus(result.StatusCode)
	if result.StatusCode >= 200 && result.StatusCode < 400 {
		d.metrics.RecordSuccess()
	} else {
		d.metrics.RecordError("/browse")
	}
}

func (d *Dispatcher) doRunBout(ctx context.Context, workerID int, spec *persona.Spec) {
	model := spec.Model
	if model == "" {
		model = "claude-sonnet-4-5-20250929"
	}

	// Budget pre-flight.
	_, allowed := d.budget.Allow(model, spec.MaxTurns)
	if !allowed {
		d.logf("[worker-%d] budget denied run-bout", workerID)
		return
	}

	boutID := action.GenerateID(21)
	presetID := validPresetIDs[intn(len(validPresetIDs))]

	d.metrics.RecordBoutStart()
	handle, err := d.actor.RunBoutStream(ctx, accountID(spec), action.RunBoutRequest{
		BoutID:   boutID,
		PresetID: presetID,
		Topic:    spec.PickTopic(),
		Turns:    spec.MaxTurns,
		Model:    model,
	})
	if err != nil {
		d.metrics.RecordError("/api/run-bout")
		return
	}
	defer handle.Close()

	d.metrics.RecordStatus(handle.StatusCode)

	if handle.StatusCode >= 400 {
		d.metrics.RecordError("/api/run-bout")
		d.metrics.RecordLatency("/api/run-bout", handle.Duration)
		return
	}

	// Track the bout so reactions/votes/short-links can reference it.
	d.trackBout(boutID)

	// Parse the SSE stream, tracking active stream concurrency.
	d.metrics.StreamStart()
	result, err := client.ParseSSEStream(handle.Body, nil)
	d.metrics.StreamDone()
	if err != nil {
		d.metrics.RecordError("/api/run-bout")
		return
	}

	// Check for server-side errors reported inside the SSE stream.
	if result.Error != "" {
		d.metrics.RecordStreamError()
		d.metrics.RecordError("/api/run-bout")
		return
	}

	d.metrics.RecordLatency("/api/run-bout", handle.Duration)
	d.metrics.RecordStreamMetrics(result.DeltaCount, result.TotalChars)

	// Record time-to-first-byte if the stream emitted any text deltas.
	if result.FirstByte > 0 {
		d.metrics.RecordFirstByte("/api/run-bout", result.FirstByte)
	}

	d.metrics.RecordBoutDone()
	d.metrics.RecordSuccess()

	// Charge budget.
	d.budget.ChargeTokens(model, estimateInputTokens(result.TotalChars), estimateOutputTokens(result.TotalChars))
}

func (d *Dispatcher) doAPIBout(ctx context.Context, workerID int, spec *persona.Spec) {
	model := spec.Model
	if model == "" {
		model = "claude-opus-4-6"
	}

	_, allowed := d.budget.Allow(model, spec.MaxTurns)
	if !allowed {
		d.logf("[worker-%d] budget denied api-bout", workerID)
		return
	}

	boutID := action.GenerateID(21)
	presetID := validPresetIDs[intn(len(validPresetIDs))]

	d.metrics.RecordBoutStart()
	result, err := d.actor.APIBout(ctx, accountID(spec), action.APIBoutRequest{
		BoutID:   boutID,
		PresetID: presetID,
		Topic:    spec.PickTopic(),
		Turns:    spec.MaxTurns,
		Model:    model,
	})
	if err != nil {
		d.metrics.RecordError("/api/v1/bout")
		return
	}

	d.metrics.RecordLatency("/api/v1/bout", result.Duration)
	d.metrics.RecordStatus(result.StatusCode)

	if result.StatusCode == 429 {
		d.metrics.RecordRateLimit()
	}

	if result.StatusCode >= 200 && result.StatusCode < 300 {
		d.trackBout(boutID)
		d.metrics.RecordBoutDone()
		d.metrics.RecordSuccess()
		d.budget.ChargeTokens(model, spec.MaxTurns*660, spec.MaxTurns*120) // estimated
	} else {
		d.metrics.RecordError("/api/v1/bout")
	}
}

func (d *Dispatcher) doCreateAgent(ctx context.Context, spec *persona.Spec) {
	result, err := d.actor.CreateAgent(ctx, accountID(spec), action.CreateAgentRequest{
		Name:         fmt.Sprintf("StormAgent-%d", intn(10000)),
		SystemPrompt: "You are a debater created by pitstorm load testing. Argue your position with conviction and rhetorical flair.",
	})
	d.recordSimpleResult("/api/agents", result, err)
}

func (d *Dispatcher) doReaction(ctx context.Context, spec *persona.Spec) {
	boutID := d.randomBoutID()
	if boutID == "" {
		// No bouts created yet — generate a format-valid but non-existent ID.
		// Reactions don't validate bout existence, just format.
		boutID = action.GenerateID(21)
	}
	reactions := []string{"heart", "fire"}
	result, err := d.actor.ToggleReaction(ctx, accountID(spec), action.ReactionRequest{
		BoutID:       boutID,
		TurnIndex:    intn(10),
		ReactionType: reactions[intn(len(reactions))],
	})
	d.recordSimpleResult("/api/reactions", result, err)
}

func (d *Dispatcher) doVote(ctx context.Context, spec *persona.Spec) {
	boutID := d.randomBoutID()
	if boutID == "" {
		// No bouts exist yet — skip rather than send an invalid request.
		return
	}
	result, err := d.actor.CastWinnerVote(ctx, accountID(spec), action.WinnerVoteRequest{
		BoutID:  boutID,
		AgentID: "socrates",
	})
	d.recordSimpleResult("/api/winner-vote", result, err)
}

func (d *Dispatcher) doShortLink(ctx context.Context) {
	boutID := d.randomBoutID()
	if boutID == "" {
		// No bouts exist yet — skip.
		return
	}
	result, err := d.actor.CreateShortLink(ctx, action.ShortLinkRequest{
		BoutID: boutID,
	})
	d.recordSimpleResult("/api/short-links", result, err)
}

func (d *Dispatcher) doListFeatures(ctx context.Context) {
	result, err := d.actor.ListFeatureRequests(ctx)
	d.recordSimpleResult("/api/feature-requests", result, err)
}

func (d *Dispatcher) doSubmitFeature(ctx context.Context, spec *persona.Spec) {
	result, err := d.actor.SubmitFeature(ctx, accountID(spec), action.SubmitFeatureRequest{
		Title:       fmt.Sprintf("Storm feature request %d", intn(10000)),
		Description: "This is an auto-generated feature request from pitstorm load testing. It tests the feature submission pipeline under load.",
		Category:    featureCategories[intn(len(featureCategories))],
	})
	d.recordSimpleResult("/api/feature-requests", result, err)
}

func (d *Dispatcher) doVoteFeature(ctx context.Context, spec *persona.Spec) {
	result, err := d.actor.VoteFeature(ctx, accountID(spec), action.FeatureVoteRequest{
		FeatureRequestID: 1 + intn(100),
	})
	d.recordSimpleResult("/api/feature-requests/vote", result, err)
}

func (d *Dispatcher) doSubmitPaper(ctx context.Context, spec *persona.Spec) {
	result, err := d.actor.SubmitPaper(ctx, accountID(spec), action.PaperSubmissionRequest{
		ArxivURL:      fmt.Sprintf("https://arxiv.org/abs/2401.%05d", intn(99999)),
		Justification: "This paper is relevant to AI agent interaction and debate evaluation. Submitted via pitstorm load testing to verify the submission pipeline.",
		RelevanceArea: relevanceAreas[intn(len(relevanceAreas))],
	})
	d.recordSimpleResult("/api/paper-submissions", result, err)
}

func (d *Dispatcher) doNewsletter(ctx context.Context) {
	result, err := d.actor.SubscribeNewsletter(ctx, action.NewsletterRequest{
		Email: fmt.Sprintf("storm-%d@test.thepit.cloud", intn(100000)),
	})
	d.recordSimpleResult("/api/newsletter", result, err)
}

func (d *Dispatcher) doContact(ctx context.Context) {
	result, err := d.actor.SendContact(ctx, action.ContactRequest{
		Name:    "Storm User",
		Email:   "storm@test.thepit.cloud",
		Message: "Automated contact from pitstorm load test.",
	})
	d.recordSimpleResult("/api/contact", result, err)
}

func (d *Dispatcher) doBYOK(ctx context.Context, spec *persona.Spec) {
	result, err := d.actor.StashBYOK(ctx, accountID(spec), action.BYOKStashRequest{
		Provider: "anthropic",
		APIKey:   "sk-ant-storm-test-key-not-real",
	})
	d.recordSimpleResult("/api/byok-stash", result, err)
}

// ---------- Security probe handlers ----------

func (d *Dispatcher) doXSSProbe(ctx context.Context, spec *persona.Spec) {
	payloads := []string{
		`<script>alert('xss')</script>`,
		`<img src=x onerror=alert(1)>`,
		`"><svg/onload=alert(document.cookie)>`,
	}
	// Inject XSS payload as a bout topic.
	result, err := d.actor.BrowsePage(ctx, "/?q="+payloads[intn(len(payloads))])
	d.recordSimpleResult("/xss-probe", result, err)
}

func (d *Dispatcher) doSQLiProbe(ctx context.Context, spec *persona.Spec) {
	payloads := []string{
		`' OR 1=1 --`,
		`'; DROP TABLE bouts; --`,
		`1 UNION SELECT * FROM users --`,
	}
	result, err := d.actor.BrowsePage(ctx, "/api/health?id="+payloads[intn(len(payloads))])
	d.recordSimpleResult("/sqli-probe", result, err)
}

func (d *Dispatcher) doIDORProbe(ctx context.Context, spec *persona.Spec) {
	// Try to access another user's resources.
	result, err := d.actor.BrowsePage(ctx, fmt.Sprintf("/api/agents?userId=user_%d", intn(10000)))
	d.recordSimpleResult("/idor-probe", result, err)
}

func (d *Dispatcher) doRateLimitFlood(ctx context.Context, spec *persona.Spec) {
	// Fire 10 rapid requests to trigger rate limiting.
	for i := 0; i < 10; i++ {
		result, err := d.actor.Health(ctx)
		if err != nil {
			d.metrics.RecordError("/api/health")
			continue
		}
		d.metrics.RecordLatency("/api/health", result.Duration)
		d.metrics.RecordStatus(result.StatusCode)
		if result.StatusCode == 429 {
			d.metrics.RecordRateLimit()
		}
	}
}

// ---------- Helpers ----------

func (d *Dispatcher) recordSimpleResult(endpoint string, result *action.Result, err error) {
	if err != nil {
		d.metrics.RecordError(endpoint)
		return
	}
	d.metrics.RecordLatency(endpoint, result.Duration)
	d.metrics.RecordStatus(result.StatusCode)
	if result.StatusCode == 429 {
		d.metrics.RecordRateLimit()
	}
	if result.StatusCode >= 200 && result.StatusCode < 400 {
		d.metrics.RecordSuccess()
	} else {
		d.metrics.RecordError(endpoint)
	}
	if result.Attempt > 1 {
		d.metrics.RecordRetry()
	}
}

func actionEndpoint(act persona.Action) string {
	switch act {
	case persona.ActionBrowse:
		return "/browse"
	case persona.ActionRunBout:
		return "/api/run-bout"
	case persona.ActionAPIBout:
		return "/api/v1/bout"
	case persona.ActionCreateAgent:
		return "/api/agents"
	case persona.ActionReaction:
		return "/api/reactions"
	case persona.ActionVote:
		return "/api/winner-vote"
	case persona.ActionShortLink:
		return "/api/short-links"
	case persona.ActionListFeatures:
		return "/api/feature-requests"
	case persona.ActionSubmitFeature:
		return "/api/feature-requests"
	case persona.ActionVoteFeature:
		return "/api/feature-requests/vote"
	case persona.ActionSubmitPaper:
		return "/api/paper-submissions"
	case persona.ActionNewsletter:
		return "/api/newsletter"
	case persona.ActionContact:
		return "/api/contact"
	case persona.ActionBYOK:
		return "/api/byok-stash"
	default:
		return "/unknown"
	}
}

// estimateInputTokens estimates input tokens from character count.
// Roughly 4 chars per token, multiplied by the 5.5x input factor.
func estimateInputTokens(chars int) int {
	tokens := chars / 4
	return int(float64(tokens) * 5.5)
}

// estimateOutputTokens estimates output tokens from character count.
func estimateOutputTokens(chars int) int {
	return chars / 4
}

// intn returns a random int in [0, n).
func intn(n int) int {
	if n <= 0 {
		return 0
	}
	return rand.IntN(n)
}
