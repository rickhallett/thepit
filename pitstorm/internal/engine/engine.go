// Package engine orchestrates the simulation run. It manages a pool of
// worker goroutines, each driving a persona session. Workers pull actions
// from their persona spec, execute them via the action layer, feed metrics,
// and respect both the rate limiter and budget gate.
package engine

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/rickhallett/thepit/pitstorm/internal/action"
	"github.com/rickhallett/thepit/pitstorm/internal/budget"
	"github.com/rickhallett/thepit/pitstorm/internal/client"
	"github.com/rickhallett/thepit/pitstorm/internal/metrics"
	"github.com/rickhallett/thepit/pitstorm/internal/persona"
)

// Config holds the engine's runtime configuration.
type Config struct {
	Workers  int
	Duration time.Duration
	RateFunc RateFunc // controls req/s over time; nil = unlimited
	Verbose  bool
}

// RateFunc returns the target requests-per-second at the given elapsed time.
// The engine uses this to throttle workers. A nil RateFunc means unlimited.
type RateFunc func(elapsed time.Duration, total time.Duration) float64

// Engine coordinates workers, rate limiting, metrics, and budget.
type Engine struct {
	cfg        Config
	client     *client.Client
	actor      *action.Actor
	metrics    *metrics.Collector
	budget     *budget.Gate
	personas   []*persona.Spec
	logf       func(string, ...any)
	dispatcher *Dispatcher
}

// New creates an Engine with all dependencies injected.
func New(
	cfg Config,
	cl *client.Client,
	act *action.Actor,
	m *metrics.Collector,
	b *budget.Gate,
	personas []*persona.Spec,
	logf func(string, ...any),
) *Engine {
	if logf == nil {
		logf = func(string, ...any) {}
	}
	return &Engine{
		cfg:        cfg,
		client:     cl,
		actor:      act,
		metrics:    m,
		budget:     b,
		personas:   personas,
		logf:       logf,
		dispatcher: NewDispatcher(act, m, b, logf),
	}
}

// Run starts the simulation and blocks until completion. It returns when
// the context is cancelled, the duration expires, or the budget is exhausted.
func (e *Engine) Run(ctx context.Context) error {
	if len(e.personas) == 0 {
		return fmt.Errorf("no personas configured")
	}

	ctx, cancel := context.WithTimeout(ctx, e.cfg.Duration)
	defer cancel()

	var wg sync.WaitGroup
	start := time.Now()

	// Rate limiter channel — controls the pace of requests.
	tickets := make(chan struct{}, e.cfg.Workers*2)
	go e.ticketFeeder(ctx, start, tickets)

	// Launch workers.
	for i := 0; i < e.cfg.Workers; i++ {
		wg.Add(1)
		// Round-robin persona assignment.
		p := e.personas[i%len(e.personas)]
		go func(workerID int, spec *persona.Spec) {
			defer wg.Done()
			e.worker(ctx, workerID, spec, tickets)
		}(i, p)
	}

	// Monitor loop — periodic status logging.
	go e.monitor(ctx, start)

	wg.Wait()
	return nil
}

// worker runs persona sessions in a loop until the context expires.
func (e *Engine) worker(ctx context.Context, id int, spec *persona.Spec, tickets <-chan struct{}) {
	e.metrics.WorkerStart()
	defer e.metrics.WorkerDone()

	for {
		select {
		case <-ctx.Done():
			return
		default:
		}

		// Check budget before starting a session.
		if e.budget.Exhausted() {
			if e.cfg.Verbose {
				e.logf("[worker-%d] budget exhausted, stopping", id)
			}
			return
		}

		e.runSession(ctx, id, spec, tickets)
	}
}

// runSession executes a single persona session (a series of actions).
func (e *Engine) runSession(ctx context.Context, workerID int, spec *persona.Spec, tickets <-chan struct{}) {
	sessionLen := spec.SessionLength()

	for i := 0; i < sessionLen; i++ {
		select {
		case <-ctx.Done():
			return
		default:
		}

		// Budget check before each action.
		if e.budget.Exhausted() {
			return
		}

		// Wait for a rate-limit ticket.
		select {
		case <-ctx.Done():
			return
		case <-tickets:
		}

		// Pick and execute an action.
		act := spec.PickAction()
		e.dispatcher.Dispatch(ctx, workerID, spec, act)

		// Think time (simulated human delay).
		delay := spec.ThinkDelay()
		select {
		case <-ctx.Done():
			return
		case <-time.After(delay):
		}
	}
}

// ticketFeeder generates rate-limit tickets at the pace defined by RateFunc.
func (e *Engine) ticketFeeder(ctx context.Context, start time.Time, tickets chan<- struct{}) {
	if e.cfg.RateFunc == nil {
		// Unlimited — feed as fast as possible.
		for {
			select {
			case <-ctx.Done():
				return
			case tickets <- struct{}{}:
			}
		}
	}

	ticker := time.NewTicker(10 * time.Millisecond) // check rate 100 times/sec
	defer ticker.Stop()

	var tokenBank float64

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			elapsed := time.Since(start)
			targetRPS := e.cfg.RateFunc(elapsed, e.cfg.Duration)
			if targetRPS <= 0 {
				continue
			}

			// Add fractional tokens: targetRPS * (10ms / 1s) = targetRPS * 0.01
			tokenBank += targetRPS * 0.01

			// Emit whole tokens.
			for tokenBank >= 1.0 {
				select {
				case tickets <- struct{}{}:
					tokenBank -= 1.0
				default:
					// Channel full — workers are slower than the rate.
					tokenBank = 0
				}
			}
		}
	}
}

// monitor logs periodic status updates.
func (e *Engine) monitor(ctx context.Context, start time.Time) {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			snap := e.metrics.Snapshot()
			budgetSummary := e.budget.Summary()
			e.logf("[monitor] elapsed=%s reqs=%d ok=%d err=%d rate=%.1f/s budget=£%.4f/£%.2f workers=%d",
				time.Since(start).Truncate(time.Second),
				snap.Requests,
				snap.Successes,
				snap.Errors,
				snap.Throughput,
				budgetSummary.SpentGBP,
				budgetSummary.CeilingGBP,
				snap.ActiveWorkers,
			)
		}
	}
}
