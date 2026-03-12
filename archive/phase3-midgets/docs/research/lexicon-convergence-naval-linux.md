# Lexicon Convergence Analysis: Naval → Linux/Unix

**Date:** 2026-03-10
**Agent:** Architect (research polecat)
**Task:** Map every naval governance term to its closest Linux/Unix equivalent. Identify what's redundant, what's novel, and what's been reinvented.

---

## Methodology

Each naval term is mapped against six source domains: Linux/Unix OS concepts, Unix philosophy, Linux sysadmin vocabulary, distributed systems/clustering, container orchestration (Kubernetes), and kernel internals. Confidence ratings:

- **HIGH** — Direct, well-established equivalent. The Linux term communicates the same concept to the same audience.
- **MEDIUM** — Close structural analogy but not exact. Either the scope differs, the granularity differs, or the concept is overloaded relative to the Linux equivalent.
- **LOW** — No good equivalent. The naval term names something the Linux ecosystem hasn't needed to name, or names a human-system interaction pattern that Linux doesn't model.

Recommendations:

- **ADOPT** — Use the Linux term. The naval term is redundant.
- **KEEP** — The naval term captures something Linux doesn't. But rename if the naval framing is gratuitous.
- **MERGE** — Combine: use the Linux term as the primary, keep the naval term as a contextual alias or for the residual meaning Linux doesn't cover.
- **RETIRE** — The term is confusing, overloaded, or adds no value over plain English.

---

## Term-by-Term Mapping

### Authority & Handoff

#### 1. conn

**Naval definition:** Decision authority. One holder at a time. Transfer is explicit and logged.

**Linux equivalent:** **Leader election** (distributed systems — Raft, Paxos, etcd, Kubernetes lease objects). Also: **POSIX session leader** (`setsid(2)`), **controlling terminal** ownership (`tcsetpgrp(3)`), **Kubernetes lease** (`coordination.k8s.io/v1 Lease`).

**Confidence:** HIGH

**Gap analysis:** Leader election is more precise — it specifies the algorithm for transfer (term-based, quorum-required), whereas "conn" is hand-wavey about *how* transfer happens ("explicit and logged" but no protocol). The Kubernetes Lease object is almost exactly this: a single holder, explicit acquisition, time-bounded, observable by the cluster. The POSIX session leader is structurally identical: one process owns the controlling terminal, and ownership transfer is explicit via `tcsetpgrp()`.

The naval term bundles two things: (1) exclusive ownership of a resource (a mutex/lock) and (2) decision authority (a role). Linux separates these cleanly — a lock is a lock (`flock(2)`, `fcntl(2)` advisory locks), and a role is a role (process capabilities, RBAC).

**Recommendation:** ADOPT `leader` or `lock holder`. The concept is mutex semantics applied to decision authority. The naval metaphor adds nothing that `leader` doesn't already communicate to an engineer.

---

#### 2. standing_order

**Naval definition:** Directives that persist across watches. Obeyed without re-stating.

**Linux equivalent:** **Configuration files** — `/etc/` hierarchy, `systemd` unit files, `sysctl.conf`, `.profile`/`.bashrc`, `crontab`. Also: **systemd drop-in overrides** (`/etc/systemd/system/foo.service.d/override.conf`). Also: **Kubernetes ConfigMap / Policy resources** (NetworkPolicy, PodSecurityPolicy, OPA/Gatekeeper ConstraintTemplates).

**Confidence:** HIGH

**Gap analysis:** The Linux filesystem convention `/etc/` is literally "configuration that persists across reboots and session boundaries." A crontab runs without being re-stated. A systemd unit file persists across service restarts. A Kubernetes ConstraintTemplate enforces policy across all pod admissions without re-stating.

The naval term is exactly declarative configuration. The "obeyed without re-stating" clause is what makes systemd unit files systemd unit files — the init system reads them at boot and enforces them without human re-invocation.

The one nuance: standing orders carry *authority* (they come from the Operator and override lower-rank decisions). This maps to policy enforcement with priority ordering — systemd's `override.conf` mechanism, or OPA's policy hierarchy.

**Recommendation:** ADOPT `persistent policy` or `declarative config`. Every engineer already knows what `/etc/sysctl.conf` does. "Standing order" is a more dramatic way of saying "config that persists."

---

#### 3. watch

**Naval definition:** Responsibility for monitoring a domain. Implies operator's authority within SOs. Delegatable.

**Linux equivalent:** **Watchdog timer** (`/dev/watchdog`, `systemd-watchdog`, hardware watchdog). Also: **inotify** / **fanotify** (filesystem monitoring). Also: **Prometheus alerting rules** / **Kubernetes controller watch** (the `Watch` verb in the Kubernetes API is literally this). Also: **`monit`**, **`supervisord`**, **Nagios/Zabbix service check**.

**Confidence:** HIGH

**Gap analysis:** The Kubernetes API has a `Watch` verb that does exactly this: a controller watches a set of resources and acts on changes within its delegated scope. The `Watch` request returns events when resources change. The controller operates within its RBAC permissions (= "operator's authority within SOs"). A Kubernetes controller is literally a watch: it monitors a domain, has delegated authority to act within that domain, and escalates (logs errors, emits events) when something falls outside its scope.

The difference: the naval "watch" includes the human holding it. A Kubernetes controller watch is automated. But the structural concept is identical.

**Recommendation:** ADOPT `controller` or `watch` (the Kubernetes term is already "watch"). The naval usage is structurally identical to a Kubernetes controller reconciliation loop.

---

#### 4. officer_watch

**Naval definition:** Watch + operator's delegated authority + SOs + escalate.

**Linux equivalent:** **Kubernetes controller with RBAC** — a controller that has a `ClusterRole` granting specific permissions, operates within those permissions, and escalates (emits Events, writes to status conditions) when it encounters situations outside its authority. Also: **systemd service with `CapabilityBoundingSet`** — a daemon that runs with specific Linux capabilities (`cap_net_bind_service`, etc.) and cannot exceed them. Also: **sudoers with command restrictions** — `user ALL=(ALL) /usr/bin/systemctl restart nginx` grants delegated authority for a specific action.

**Confidence:** HIGH

**Gap analysis:** This is RBAC + delegation + escalation. All three are well-established Linux/Kubernetes concepts. The naval term bundles them into a single role name, which is convenient but less precise than the decomposed Linux version. In Linux, you can separately specify *what* authority is delegated (capabilities), *how* escalation works (syslog priority, event emission), and *what* standing policies apply (systemd unit directives). The naval term glues these together.

**Recommendation:** ADOPT `privileged controller` or `delegated operator`. The decomposition into RBAC + capabilities + escalation policy is more precise and already well-understood.

---

### Navigation & Orientation

#### 5. true_north

**Naval definition:** The objective that doesn't drift. `hired = proof > claim`.

**Linux equivalent:** **`/proc/cmdline`** — kernel boot parameters that are immutable after boot. Also: **Kubernetes `spec` vs `status`** — the spec is the desired state (immutable intent), the status is the observed state. Also: **Git `HEAD` on `main`** as the canonical truth. Partial: **North Star metric** (product/business term, not Linux).

**Confidence:** MEDIUM

**Gap analysis:** Linux doesn't have a single concept for "the immutable strategic objective." The kernel has immutable boot parameters. Kubernetes has the spec/status split where spec is declared intent. Git has the concept of a canonical branch. But none of these are "the thing we're optimising for."

The closest structural analogy is the Kubernetes desired state model: you declare what you want (`spec`), and the system continuously reconciles toward it. But `true_north` is a *human* objective, not a system specification. Linux doesn't model human intent because Linux doesn't need to — it has a human operator who holds the intent externally.

This term sits at the human-system boundary that Linux doesn't cross. The concept itself — an immutable reference objective for all decisions — is more of a product/business concept than a systems concept. "North Star metric" from product management is the direct equivalent, but it's not from the Linux world.

**Recommendation:** KEEP, but acknowledge it's a product/management concept, not a systems concept. The Linux ecosystem doesn't need this because Linux doesn't model human strategic intent. In an agentic system where the AI needs to know the human's objective, there's no established Linux term.

---

#### 6. bearing

**Naval definition:** Direction to target relative to True North. How aligned current work is with the objective.

**Linux equivalent:** **Drift detection** (Terraform `plan`, Kubernetes controller reconciliation delta, `diff` against desired state). Also: **health check** result (systemd `Type=notify` with `WATCHDOG=1`, Kubernetes readiness probe).

**Confidence:** MEDIUM

**Gap analysis:** Terraform `plan` shows you the delta between your declared state and reality — that's a bearing check. A Kubernetes controller's reconciliation loop continuously computes the delta between `spec` and `status` — that's continuous bearing. But "bearing" as used in the naval lexicon is fuzzier: it's a subjective assessment of alignment, not a computable delta. "Current bearing: pre-launch hardening" is a human-readable status, not a machine-checkable predicate.

When the bearing is computable (does this PR serve the spec? does the gate pass?), it maps to drift detection. When it's subjective ("how aligned are we with getting hired?"), there's no Linux equivalent because Linux doesn't model subjective alignment.

**Recommendation:** MERGE. Use `drift` or `reconciliation delta` for the computable part. Keep `bearing` only for the subjective human-assessment part that drift detection can't capture.

---

#### 7. dead_reckoning

**Naval definition:** Navigate from last known position when visibility is lost. Recovery after context window death.

**Linux equivalent:** **Crash recovery** — journaling filesystems (`ext4` journal, `XFS` log), Write-Ahead Log (WAL) in PostgreSQL, Redis AOF, systemd journal. Also: **Kubernetes controller restart** — a controller that crashes and restarts reads the current state of its resources from the API server (its "last known position") and reconciles forward without replaying history. Also: **`fsck`** (filesystem check after unclean shutdown).

**Confidence:** HIGH

**Gap analysis:** This is crash recovery. The Write-Ahead Log is the precise mechanism: you write durable state before operating, so that when the process dies, the next instance can read the log and resume. The project's `dead-reckoning.md` file IS a WAL — it records state so the next context window can resume.

The Kubernetes controller restart model is exactly dead reckoning: the controller doesn't remember its previous life. It reads current state from the API server (etcd) and reconciles from there. The "last known position" is whatever's in etcd. The controller doesn't need conversation history — it needs current state.

**Recommendation:** ADOPT `crash recovery` or `WAL-based recovery`. The mechanism is well-understood. Calling it "dead reckoning" adds nautical flavour but communicates less precisely than "the agent reboots and reads state from durable storage."

---

#### 8. tacking

**Naval definition:** Making progress against the wind by sailing at angles. Indirect but forward progress.

**Linux equivalent:** **Exponential backoff with jitter** (partial — indirect approach to a goal when direct approach fails). Also: **Simulated annealing** (optimisation that accepts worse states to escape local minima). Partial: **Feature flags / canary deployments** (indirect path to production). Loose: **A/B testing** (trying approaches to find the right heading).

**Confidence:** LOW

**Gap analysis:** Linux doesn't have a term for "making indirect progress toward a goal when direct progress is blocked." The closest operational concept is exponential backoff — you can't reach the server directly, so you wait and retry with increasing delays. But backoff is about *timing*, not *direction*.

The concept tacking names is strategic: the direct path is blocked, so you take diagonal approaches that each make partial progress. This is a planning/strategy concept, not a systems concept. It's closer to agile "pivoting" than to anything in the Linux kernel.

The term carries genuine information: it distinguishes intentional indirection from drift. "We're tacking" means "this looks indirect but it's calculated." Linux doesn't need this distinction because Linux processes don't explain their strategy.

**Recommendation:** KEEP if the team finds it useful for distinguishing intentional indirection from drift. But acknowledge it's a human communication concept, not a systems concept. No Linux term captures "deliberate indirect progress."

---

### Operational Tempo

#### 9. full_sail

**Naval definition:** Maximum velocity. High speed, high risk. The weave is stretched thin.

**Linux equivalent:** **`nice -n -20`** (maximum process priority). Also: **CPU pinning / `taskset`** (dedicating resources for speed). Also: **`sync` disabled / `nobarrier` mount** (filesystem speed at cost of safety). Also: **Kubernetes `QoS: BestEffort`** (no resource limits, maximum throughput, first to be evicted). Also: **Feature flags all on / trunk-based development** (shipping fast, accepting risk).

**Confidence:** MEDIUM

**Gap analysis:** Linux has many ways to express "go fast, accept risk": disabling fsync, removing I/O barriers, setting maximum priority. But these are individual settings, not a *mode declaration*. "Full sail" is a meta-declaration: "we are now operating in high-speed, high-risk mode, and everyone should adjust accordingly." Linux doesn't have a system-wide "go fast" toggle that changes all subsystem behaviour.

The closest is Kubernetes QoS classes — `BestEffort` means "no guarantees, maximum throughput, first to die under pressure." That's full sail.

**Recommendation:** MERGE. The concept of a system-wide tempo declaration is useful. Map it to QoS/priority vocabulary: `full_sail` = `priority: maximum, guarantees: none`. The Linux terms are more precise about *what* is being risked.

---

#### 10. making_way

**Naval definition:** Forward progress under discipline. The default state.

**Linux equivalent:** **Normal operation / steady state.** Systemd `active (running)`. Kubernetes pod in `Running` state with all probes passing. The system operating within its designed parameters.

**Confidence:** HIGH

**Gap analysis:** This is "the system is running normally." Every monitoring system has this concept: Nagios OK, Prometheus `up == 1`, systemd `active (running)`. The naval term adds the qualifier "under discipline" — which means "not just running, but running correctly." This maps to health checks passing: the process is up AND the liveness/readiness probes return 200.

**Recommendation:** ADOPT `healthy` or `nominal`. "Making way" is a poetic way of saying "system healthy, all checks passing."

---

#### 11. drifting

**Naval definition:** Moving without control or bearing. The opposite of making way.

**Linux equivalent:** **Configuration drift** (Terraform, Ansible, Puppet — when actual state diverges from declared state). Also: **Zombie process** (a process that exists but accomplishes nothing). Also: **Split-brain** (a node operating but disconnected from the cluster's consensus).

**Confidence:** HIGH

**Gap analysis:** Configuration drift is the precise equivalent. A system that's "drifting" is one where actual state has diverged from desired state and nobody has noticed. Terraform `plan` showing unexpected diffs is the detection mechanism for drift. The naval term and the infrastructure term are saying the same thing.

**Recommendation:** ADOPT `drift` or `drifted`. The infrastructure term is already well-established and communicates exactly this concept.

---

#### 12. heave_to

**Naval definition:** Deliberately stop forward progress. Hold position.

**Linux equivalent:** **`SIGSTOP`** / **`kill -STOP`** (pause a process without killing it — it holds its state). Also: **Kubernetes pod `Paused`** (in the context of deployments — pause rollout). Also: **Circuit breaker open** (Hystrix/Resilience4j — stop sending requests, hold position). Also: **Maintenance mode** (taking a service out of the load balancer but keeping it running). Also: **Pacemaker resource standby** (`crm resource standby <resource>`).

**Confidence:** HIGH

**Gap analysis:** `SIGSTOP` is exactly heave-to: the process is not terminated, it's suspended. It holds all its state and can be resumed with `SIGCONT`. A circuit breaker in the open state is also heave-to: we've stopped making requests, we're holding position, and we'll resume when conditions improve.

The key property — *deliberate* stop, not crash — is exactly the distinction between `SIGSTOP` (deliberate) and `SIGKILL`/`SIGSEGV` (crash). Linux has this distinction built into its signal model.

**Recommendation:** ADOPT `paused` or `suspended`. Engineers already understand `SIGSTOP` semantics. "Heave to" communicates the same thing with more syllables.

---

#### 13. beat_to_quarters

**Naval definition:** Emergency posture. Everything stops, everyone to stations.

**Linux equivalent:** **Kernel panic** (the system has detected an unrecoverable error and stops). Also: **`SIGKILL` to all non-essential processes** (`systemctl isolate rescue.target` — drop to single-user mode). Also: **Kubernetes `PodDisruptionBudget` violation / Incident response** (PagerDuty SEV-1). Also: **Pacemaker fencing** (STONITH — Shoot The Other Node In The Head — isolate a misbehaving node). Also: **Linux runlevel 1 / rescue mode** (minimal services, full attention on the problem).

**Confidence:** HIGH

**Gap analysis:** `systemctl isolate rescue.target` is beat-to-quarters: drop all non-essential services, enter single-user mode, deal with the emergency. The concept of incident severity levels (SEV-1/P0) in operations culture maps directly: everything stops, all hands on the incident, routine work pauses.

Linux's emergency modes (rescue, emergency) are well-established. The SRE concept of incident response levels is well-established. The naval term is a third name for something that already has two good names.

**Recommendation:** ADOPT `SEV-1` or `emergency mode`. Incident response culture already has mature vocabulary for this. Every on-call engineer knows what a P0/SEV-1 means.

---

### Integrity & Verification

#### 14. hull

**Naval definition:** Gate + tests + typecheck. Survival, not optimisation.

**Linux equivalent:** **`fsck`** / **filesystem integrity** (the thing that must pass before the system can be trusted). Also: **Kernel self-test** (`CONFIG_KUNIT`, `kselftest`). Also: **CI/CD pipeline gate** (well-established in DevOps). Also: **Kubernetes admission controller** (rejects invalid resources before they enter the cluster). Also: **`make check`** / **`make test`** — the Unix convention for "verify before ship."

**Confidence:** HIGH

**Gap analysis:** This is a CI gate. The `make check` convention predates the project by decades. A Kubernetes admission webhook rejects malformed resources before they're persisted — it's a hull check at the API boundary. GitHub branch protection rules enforce that CI passes before merge.

The "survival, not optimisation" qualifier maps to the distinction between blocking checks (must pass) and advisory checks (nice to pass). CI systems already distinguish required checks from optional checks. Kubernetes distinguishes admission webhooks (blocking) from audit logging (non-blocking).

**Recommendation:** ADOPT `gate` or `required checks`. The project already uses "gate" interchangeably with "hull" — just use "gate" consistently. Every CI system has this concept.

---

#### 15. on_point

**Naval definition:** Convention, convergence, and verification aligning across the stack.

**Linux equivalent:** **Convergence** (distributed systems — all nodes agreeing on state). Also: **Eventual consistency achieved** (Dynamo-style systems reaching quorum). Also: **Green build across the matrix** (CI passing on all platforms/configurations).

**Confidence:** LOW

**Gap analysis:** "On point" names a subjective feeling: patterns are proving out, the system is working well across layers, things are clicking. Linux doesn't have a term for this because it's a *qualitative assessment* of system health, not a quantitative one. Distributed systems have "convergence" — all replicas reaching the same state — but that's a specific technical property, not a vibe.

The concept is real and useful (it names the positive case of "everything working together"), but it's a human judgment call, not a system state.

**Recommendation:** RETIRE or KEEP as informal vocabulary. It's not precise enough to be a governance term and not technical enough to map to Linux. It's the engineering equivalent of "in the zone." Useful in conversation, not useful in a specification.

---

#### 16. staining

**Naval definition:** Applying a diagnostic artifact from one context to reveal structure in material from another context.

**Linux equivalent:** **`strace`** / **`perf`** / **`dtrace`** / **`bpftrace`** (applying an external diagnostic tool to a running system to reveal behaviour that was present but invisible). Also: **Differential analysis** (`diff`, `comm`, `vimdiff` — comparing two states to reveal what changed). Also: **Static analysis** (applying a linter or type checker to code — the rules are the "stain," the code is the material). Also: **`LD_PRELOAD`** (injecting a diagnostic layer into a running binary to observe hidden behaviour).

**Confidence:** MEDIUM

**Gap analysis:** The *mechanism* maps well: `strace` reveals system calls that were always happening but invisible. A linter reveals code patterns that were always present but uncategorised. `bpftrace` attaches probes to kernel functions to reveal internal behaviour.

But the naval term emphasises something the Linux tools don't: the diagnostic was *produced in a different context*. `strace` was written by someone else for general use. But the slopodar taxonomy was produced by this specific project and applied to this project's code. The "fusion of horizons" aspect — two contexts meeting to produce new meaning — is not something Linux tools model. Linux tools are context-free; the naval term describes a context-ful diagnostic practice.

**Recommendation:** MERGE. Use `diagnostic overlay` or `cross-context analysis` for the technical mechanism. The specific practice of applying project-generated taxonomies to project-generated code is a workflow pattern, not a system concept, and doesn't need a single-word name.

---

### Communication & Record

#### 17. muster

**Naval definition:** Present items for O(1) binary decision. Numbered table, one row per item.

**Linux equivalent:** **`select(2)` / `poll(2)` / `epoll(7)`** (present a set of file descriptors for binary ready/not-ready decisions). Also: **Interactive rebase pick list** (`git rebase -i` — numbered list, one action per line). Also: **`dpkg --configure -a`** (process pending items one at a time). Also: **Kubernetes `kubectl get pods`** (tabular output, one row per resource, human decides action per row).

**Confidence:** MEDIUM

**Gap analysis:** The UX pattern (numbered list, binary decision per row) is common in Unix tools. `git rebase -i` is probably the closest: a list of items, each with a verb (pick/squash/drop), processed sequentially. `select(2)` is the system-level equivalent: present file descriptors, get back which ones are ready, process each.

But "muster" names a *communication protocol between human and agent*, not a system call. The value is in the *format agreement* — both parties know what a muster looks like, so parsing overhead is zero. This is more of a UI/UX convention than a system concept.

**Recommendation:** KEEP as a communication protocol name, or ADOPT `pick list` / `triage table`. The concept (structured list for O(1) human decisions) is real and useful. The name "muster" works if the team already uses it. "Pick list" or "triage table" would communicate more immediately to outsiders.

---

#### 18. fair_winds

**Naval definition:** Closing signal. Conditions favourable.

**Linux equivalent:** **Exit code 0** (`$? == 0`). Process completed successfully, resources released.

**Confidence:** MEDIUM (structurally), but the term carries *social* meaning that exit codes don't.

**Gap analysis:** "Fair winds" is a social convention, not a system state. It signals "this conversation/session is ending on good terms." Exit code 0 signals "process completed successfully" but carries no social warmth. This is a human interaction convention, not a technical one.

**Recommendation:** RETIRE from any technical specification. Keep as informal sign-off if the team likes it. It has no technical content.

---

#### 19. extra_rations

**Naval definition:** Operator's commendation. Rare. Logged.

**Linux equivalent:** No direct equivalent. Partial: **commit trailers** (`Reviewed-by:`, `Tested-by:` in Git — formal attribution logged in the permanent record). Also: **GitHub "LGTM"** conventions.

**Confidence:** LOW

**Gap analysis:** This is a social/management concept: positive feedback, logged for the record. Linux doesn't model positive feedback because processes don't need encouragement. In an agentic system, the question is whether agent commendations have any effect on agent behaviour — and in a polecat model (fresh context, no memory), they don't. The commendation is for the *human's* record, not the agent's.

**Recommendation:** RETIRE from the technical lexicon. This is a project management convention, not a systems concept. If it serves a human purpose (Operator's morale/tracking), keep it as a project convention outside the technical lexicon.

---

#### 20. polecats

**Naval definition:** `claude -p` agents. One-shot. Fresh context. No interactive steering.

**Linux equivalent:** **`fork(2)` + `exec(2)`** (spawn a child process with a fresh address space). Also: **Kubernetes Job** (a pod that runs to completion and exits — no long-lived state, no interaction). Also: **AWS Lambda / serverless function** (stateless, event-triggered, runs and dies). Also: **`xargs -P`** (parallel execution of independent tasks). Also: **Unix pipeline stage** (each stage is independent, communicates only through stdin/stdout).

**Confidence:** HIGH

**Gap analysis:** A Kubernetes Job is exactly a polecat: it has a spec (the plan file), it runs to completion, it produces output, and it terminates. It has no memory of previous Jobs. It doesn't interact with the user during execution. Multiple Jobs can run in parallel. The Job's pod gets a fresh container with no state from previous runs.

`fork + exec` is the Unix primitive: spawn a new process with its own address space, pass it arguments, collect its exit code and output.

The only thing "polecat" adds over "job" or "subprocess" is the connotation of disposability — "expendable, task-scoped." But that's already what a Job is.

**Recommendation:** ADOPT `job` or `subprocess`. Every engineer knows what a subprocess is. "Polecat" requires explanation; "job" doesn't.

---

#### 21. darkcat

**Naval definition:** Adversarial review polecat. Read-only. Stains diffs against taxonomies.

**Linux equivalent:** **Static analysis tool in CI** (ESLint, Clippy, Semgrep, CodeQL — read-only analysis of code against a rule set). Also: **`seccomp` audit mode** (kernel auditing without enforcement — observe and report, don't block). Also: **Kubernetes admission webhook in `Audit` mode** (log policy violations without rejecting). Also: **SELinux permissive mode** (`setenforce 0` — log violations, don't enforce).

**Confidence:** HIGH

**Gap analysis:** A read-only static analysis pass against a defined rule set is exactly what ESLint, Semgrep, and CodeQL do in CI. They read the code, apply rules, report findings with severity and file:line, and don't modify anything. The darkcat is a custom static analysis tool whose ruleset is the slopodar taxonomy instead of a standard lint configuration.

SELinux permissive mode is a strong analogy: the system runs, violations are logged, but nothing is blocked. The darkcat logs findings but doesn't prevent commits.

**Recommendation:** ADOPT `adversarial lint` or `audit pass`. The concept is a read-only analysis pass with a custom rule set. Calling it a "darkcat" is memorable but communicates less than "adversarial static analysis."

---

#### 22. darkcat_alley

**Naval definition:** 3-model cross-triangulation. Pre-QA and post-QA runs. Delta is a data product.

**Linux equivalent:** **Multi-scanner pipeline** — running ClamAV + Sophos + ESET on the same binary (different detection engines, compare findings). Also: **N-version programming** (running independently developed implementations and comparing outputs — Avizienis, 1985). Also: **Kubernetes multi-admission-webhook chain** (multiple webhooks reviewing the same admission request independently).

**Confidence:** MEDIUM

**Gap analysis:** N-version programming is the closest established concept: run the same problem through N independently developed systems and compare outputs. Convergence builds confidence; divergence locates bugs or bias. The antivirus multi-scanner is the practical deployment of this idea.

The "pre/post delta" aspect — running the pipeline twice and measuring improvement — maps to regression testing with coverage measurement. Run tests before fix, run after fix, compare coverage/results. This is standard CI.

What's somewhat novel is combining multi-model analysis with before/after delta measurement as a *single defined process*. Linux doesn't bundle these because they're naturally separate concerns. But the bundling is a workflow convenience, not a conceptual contribution.

**Recommendation:** ADOPT `multi-engine audit` or `cross-model analysis pipeline`. The concept decomposes into well-understood parts (N-version programming + pre/post regression comparison). The bundle is useful but the name is opaque.

---

#### 23. sortie

**Naval definition:** The complete feature-to-commit cycle: spec → dev → review → verify → commit.

**Linux equivalent:** **CI/CD pipeline** (the end-to-end flow from code to deployment). Also: **Makefile target dependency chain** (a defined sequence of build steps). Also: **GitOps PR lifecycle** (branch → PR → review → CI → merge).

**Confidence:** HIGH

**Gap analysis:** This is a CI/CD pipeline. The spec → dev → review → verify → commit flow is the standard PR lifecycle in any modern engineering org. GitHub Actions, GitLab CI, and Jenkins all model this as a pipeline with stages. The "ROI gate on darkcat loops" is a stopping condition on review iterations, which maps to "max CI retry count" or "review approval threshold."

**Recommendation:** ADOPT `delivery pipeline` or `PR lifecycle`. The concept is well-understood. "Sortie" adds military flavour to a standard engineering workflow.

---

#### 24. gauntlet

**Naval definition:** Full verification pipeline: DEV → Darkcat Triad → Synthesis → Pitkeel → Walkthrough.

**Linux equivalent:** **CI pipeline with required stages** (GitHub required status checks, GitLab pipeline stages). Also: **Linux boot sequence** (`initramfs` → kernel modules → `systemd` targets — each stage must pass before the next). Also: **Kubernetes readiness gate** (a pod isn't ready until all readiness conditions are met).

**Confidence:** HIGH

**Gap analysis:** This is a multi-stage CI pipeline where each stage is required. GitHub's "required status checks" enforce exactly this: PR cannot merge until all required checks pass. The boot sequence analogy is also precise: `systemd` won't start `multi-user.target` until `basic.target` is met.

**Recommendation:** ADOPT `required pipeline` or `qualification gate`. The concept is a standard CI pipeline with all stages required.

---

### Spaces & Registers

#### 25. quarterdeck

**Naval definition:** Command register. Formal. Orders given, decisions made.

**Linux equivalent:** **`/dev/console`** — the system console, where kernel messages and root login happen. Also: **Kubernetes `kube-system` namespace** (the control plane namespace — privileged, operational). Also: **Root shell / `su -`** (operating with full authority).

**Confidence:** MEDIUM

**Gap analysis:** The concept is "the space where authoritative decisions happen." Linux has privileged execution contexts (root, capabilities, `kube-system`) but doesn't distinguish between "formal command context" and "exploratory thinking context" because Linux processes don't think exploratorily. This distinction is about *register of communication*, not about system privilege.

The quarterdeck/wardroom distinction is a human communication concept: "are we giving orders or brainstorming?" Linux doesn't model this because Linux doesn't brainstorm.

**Recommendation:** MERGE. Use `control plane` for the system-level concept. Keep `quarterdeck` only as a human communication register marker if the team finds the formal/informal distinction valuable. But acknowledge it's a communication convention, not a system concept.

---

#### 26. wardroom

**Naval definition:** Officers' thinking space. Exploratory. Less formal.

**Linux equivalent:** **`/tmp`** (scratch space, not authoritative, can be wiped). Also: **Feature branch** (Git — exploratory work that hasn't been accepted yet). Also: **Kubernetes `staging` namespace** (non-production, experimental).

**Confidence:** MEDIUM

**Gap analysis:** A feature branch is exploratory work that hasn't been committed to the main line — it's a wardroom. `/tmp` is scratch space. A staging environment is where you test ideas before promoting them. The concept maps, but it's about *human register*, not system topology.

**Recommendation:** Same as quarterdeck — this is a communication register convention, not a system concept. Use `staging` or `draft` if you want a systems term.

---

#### 27. below_decks

**Naval definition:** Where subagents work. Out of sight of the main thread.

**Linux equivalent:** **Background process** (`&`, `nohup`, `disown`). Also: **`screen` / `tmux` session** (work happening in a detached terminal). Also: **Kubernetes `Job` in a separate namespace** (work executing outside the operator's immediate view). Also: **`cron` job** (work running on a schedule without direct supervision). Also: **Child process** (`fork(2)` — inherits environment, reports exit code, doesn't interrupt parent).

**Confidence:** HIGH

**Gap analysis:** Background processes are exactly "below decks": they execute out of the user's immediate view, they report results when complete (exit code, output file), and they don't interrupt the foreground process. `nohup command &` is "dispatch below decks."

**Recommendation:** ADOPT `background` or `subprocess`. Every Unix user understands `&`. "Below decks" communicates the same thing with a naval accent.

---

#### 28. main_thread

**Naval definition:** Operator ↔ Agent direct. Protected from context compaction.

**Linux equivalent:** **Main thread** — this IS the Linux term. `pthread_main_np()`, process thread 0, the foreground process group. Also: **stdin/stdout** — the primary I/O channels. Also: **Kubernetes primary container** (vs sidecar containers).

**Confidence:** HIGH

**Gap analysis:** The naval lexicon literally uses the Linux term. The main thread is the primary execution context. Subagents are child threads or processes. The "protected from context compaction" qualifier maps to thread-local storage or pinned memory — resources that don't get swapped out.

**Recommendation:** Already using the Linux term. No change needed.

---

#### 29. clear_decks

**Naval definition:** Force compaction. All durable writes confirmed before context reset.

**Linux equivalent:** **`sync(2)`** — flush all pending writes to disk before shutdown. Also: **`fsync(2)`** — ensure specific file data is persisted. Also: **Graceful shutdown** (`SIGTERM` handler that flushes buffers and closes connections). Also: **Kubernetes `preStop` hook** (run cleanup before pod termination). Also: **`shutdown -h now`** with pending write flush.

**Confidence:** HIGH

**Gap analysis:** `sync` is exactly this: ensure all buffered data is written to persistent storage before the system state changes. A graceful shutdown handler does the same thing at the application level: flush logs, close database connections, persist state, then exit. The `preStop` hook in Kubernetes is the orchestration-level version.

The pattern is: **ensure durability before state transition.** This is a fundamental systems concept.

**Recommendation:** ADOPT `sync` or `graceful shutdown`. `sync(2)` has been doing this since 1971. "Clear the decks" is a verbose way of saying `sync && shutdown`.

---

### Weave Modes

#### 30. tight / loose / extra-tight

**Naval definition:** Communication register modes. Tight = formal execution. Loose = exploratory. Extra-tight = emergency, literal execution only.

**Linux equivalent:** **SELinux modes** — `enforcing` (tight), `permissive` (loose), `enforcing` under audit (extra-tight, everything logged). Also: **Kernel `debug` / `quiet` boot parameters** (controlling verbosity). Also: **systemd `--log-level`** (debug, info, warning, error — controlling how much the system tells you).

**Confidence:** LOW

**Gap analysis:** These are communication modes between human and agent: how formal, how verbose, how much creative latitude. Linux has verbosity controls (log levels, debug flags) and enforcement modes (SELinux enforcing/permissive), but these control *system behaviour*, not *communication register*. The weave modes control whether the agent should brainstorm or execute orders literally.

This is a human-AI interaction concept. Linux doesn't model the tone of communication between operator and system because Unix commands don't have tone.

**Recommendation:** KEEP if the team uses them. These are human-AI interaction modes with no Linux equivalent. Consider renaming to something more transparent: `mode: execute`, `mode: explore`, `mode: emergency` — which communicate the same thing without requiring knowledge of sailing.

---

### Iteration & Tempo

#### 31. HOTL (Human Out The Loop)

**Naval definition:** Machine-speed iteration. Human defines plan, reviews output, doesn't steer mid-execution.

**Linux equivalent:** **Batch processing** (`at`, `cron`, `sbatch` in SLURM). Also: **Kubernetes `Job` / `CronJob`** (submit work, collect results later). Also: **CI pipeline** (push triggers build, human reviews results). Also: **`make -j$(nproc)`** (parallel build, human reviews at the end). Also: **`nohup` / `disown`** (detach from terminal, collect results later).

**Confidence:** HIGH

**Gap analysis:** Batch processing is the established term for "submit work, don't interact during execution, review results." Every CI system operates in HOTL mode: push code, pipeline runs, human reviews results. `make all` is HOTL. `cron` is HOTL. This is the default mode for most automated systems.

**Recommendation:** ADOPT `batch` or `async`. HOTL is a backronym that sounds clever but communicates less than "batch processing." Every engineer knows what batch mode is.

---

#### 32. HODL (Hold On for Dear Life)

**Naval definition:** Human grips the wheel. Every step requires human approval.

**Linux equivalent:** **Interactive mode** (`-i` flag in many Unix tools: `rm -i`, `cp -i`, `apt install` without `-y`). Also: **`sudo`** (per-command human authorisation). Also: **Manual approval gate in CI** (GitHub environment protection rules — pipeline pauses until human approves). Also: **`--dry-run` + confirm** pattern (show what would happen, wait for human OK). Also: **Step debugging** (`gdb` step-by-step execution).

**Confidence:** HIGH

**Gap analysis:** Interactive mode is the precise Unix equivalent: the system pauses at each operation and waits for human confirmation. `rm -i` prompts before every deletion. CI manual approval gates pause the pipeline at designated points. `gdb` step execution lets the human inspect each instruction before proceeding.

**Recommendation:** ADOPT `interactive` or `step mode`. Every Unix tool with an `-i` flag implements HODL. The concept is universal and well-named in the Linux world.

---

#### 33. verifiable / taste_required

**Naval definition:** Verifiable = gate can check. Taste-required = only human judgment can evaluate.

**Linux equivalent:** **Automated test vs manual QA** (standard software engineering distinction). Also: **Linter rule vs code review** — linters catch verifiable issues, code review catches taste issues. Also: **`shellcheck` vs "is this script readable?"** Also: **Kubernetes conformance test vs "is this cluster well-designed?"**

**Confidence:** HIGH

**Gap analysis:** The automated/manual distinction in quality assurance is well-established. "Verifiable" = automatable check. "Taste-required" = needs human review. Every QA process distinguishes these. The terms themselves are descriptive and transparent; they don't need the naval lexicon to be understood.

**Recommendation:** ADOPT `automatable` / `requires review` or keep the current terms as-is. "Verifiable" and "taste-required" are already plain English and map directly to established QA concepts. They're among the best-named terms in the lexicon — no naval metaphor needed, and none used.

---

### Error & Observation

#### 34. oracle_contamination

**Naval definition:** Human error propagates through all verification layers because no layer has authority above the human.

**Linux equivalent:** **Root compromise** — if root is compromised, every security control is bypassed because every control trusts root. Also: **CA key compromise** (PKI — if the Certificate Authority's private key is compromised, all certificates it issued are suspect). Also: **Kernel rootkit** (if the kernel is compromised, no userspace tool can detect it because every tool relies on the kernel for syscalls). Also: **Ground truth contamination** (ML term the naval definition already acknowledges).

**Confidence:** HIGH

**Gap analysis:** Root compromise is the precise systems equivalent: the root account is the oracle. If root makes a mistake (or is compromised), no automated check can catch it because every automated check runs with permissions granted by root. `sudo` doesn't protect against a malicious or mistaken root user.

The PKI model is also exact: the CA is the root of trust. If the CA signs a bad certificate, every system that trusts the CA will trust the bad certificate. There's no automated way to detect a CA error from within the PKI hierarchy — you need an external observer.

The project's use of "oracle contamination" maps cleanly to "root of trust compromise" in security vocabulary.

**Recommendation:** ADOPT `root-of-trust failure` or keep `oracle contamination` (the ML term is already well-understood in the ML community). The concept is well-established; the naval wrapping adds nothing.

---

#### 35. naturalists_tax

**Naval definition:** Discovery overhead in parallel processes. Every observation needs human processing, and observations grow faster than processing capacity.

**Linux equivalent:** **Log flood / alert fatigue** — when monitoring systems generate more alerts than the operator can process, signal drowns in noise. Also: **Amdahl's Law** (the naval definition already references this — the serial fraction increases as more parallel processes generate work for the human bottleneck). Also: **Context switching overhead** (CPU or human — each switch has a cost, and at high switch rates the overhead dominates). Also: **Thundering herd** (many processes waking up to handle a single event, each requiring attention).

**Confidence:** HIGH

**Gap analysis:** Alert fatigue is the established operations term for exactly this: more signals than the operator can process, leading to missed critical alerts. The DevOps/SRE community has extensive literature on alert fatigue, including signal-to-noise ratio management, alert deduplication, and escalation policies.

Amdahl's Law formalises the scaling limit: the serial component (human processing) bounds the speedup from parallelism (more agents). This is textbook.

**Recommendation:** ADOPT `alert fatigue` or `Amdahl's bottleneck`. Both are well-established. "Naturalist's tax" is a charming name for a well-understood phenomenon — but charm isn't a design goal for a technical lexicon.

---

### Quality & Process

#### 36. effort_backpressure

**Naval definition:** Effort-to-contribute as implicit quality filter. AI eliminates effort, collapsing signal-to-noise.

**Linux equivalent:** **TCP backpressure** / **flow control** (`TCP_NODELAY`, sliding window, `SO_RCVBUF`). Also: **Rate limiting** (`tc` traffic control, `iptables` rate limiting, Kubernetes `ResourceQuota`). Also: **Proof of work** (cryptocurrency — computational cost as spam filter). Also: **CAPTCHAs** (effort barrier to filter bots from humans).

**Confidence:** MEDIUM

**Gap analysis:** TCP backpressure is the systems concept: when a receiver can't keep up with a sender, the receiver signals the sender to slow down. Rate limiting serves the same purpose: prevent a fast producer from overwhelming a slow consumer.

But the naval term describes a *social* phenomenon: when the cost of producing contributions drops to zero (because AI generates them), the quality filter that effort provided disappears. This is more analogous to proof-of-work or CAPTCHAs — computational cost as a quality filter — than to TCP flow control. The mapping is structural but the domains differ (social systems vs network systems).

**Recommendation:** MERGE. Use `backpressure` (already a well-understood systems term) but acknowledge the social-systems application is the novel part. The insight that "effort was doing quality filtering and AI removed the effort" is real and somewhat novel in how it applies to code contributions specifically.

---

#### 37. compound_quality

**Naval definition:** Clean code → better context for future AI → cleaner code. Slop → worse context → more slop. Bidirectional feedback loop.

**Linux equivalent:** **Feedback loop** / **compound interest** (general concepts). Also: **Kernel regression tracking** (a clean kernel makes future changes easier to test; a buggy kernel makes everything harder). Also: **Technical debt** (the inverse — accumulated poor decisions compound over time).

**Confidence:** MEDIUM

**Gap analysis:** The positive feedback loop of code quality is widely understood (though more often discussed in the negative: "technical debt compounds"). The novel insight is that *AI agent output quality is a function of codebase quality* — the codebase is context for the agent, so a clean codebase produces better agent output, which keeps the codebase clean.

Linux itself doesn't model this because Linux doesn't use its own codebase as AI context. But the concept of compounding quality/debt is well-established in software engineering.

**Recommendation:** KEEP the concept but consider renaming to `context quality loop` or `self-reinforcing quality`. "Compound quality" is clear enough but doesn't distinguish itself from general "quality compounds" advice. The specific insight — *codebase quality IS context engineering for AI agents* — is novel and worth naming.

---

#### 38. engineering_problem

**Naval definition:** If AI writes slop, that's an engineering problem (bad context/gates), not a model problem.

**Linux equivalent:** **PEBKAC** ("Problem Exists Between Keyboard And Chair") — blaming the operator, not the tool. Also: **Configuration error** — the tool is fine, the config is wrong.

**Confidence:** MEDIUM

**Gap analysis:** This is an attribution stance: "the models are capable; the failures are in how we use them." This maps to the general engineering principle that tools are as good as their operators. Linux doesn't need to name this because Linux users already assume that when `awk` produces wrong output, the `awk` script is wrong, not `awk`.

The stance is correct but not novel. It's the standard engineering assumption: the tool works; check your inputs.

**Recommendation:** RETIRE from the lexicon. This is a debugging heuristic ("check your inputs before blaming the tool"), not a term that needs a name. Every experienced engineer already operates this way.

---

#### 39. interrupt_sovereignty

**Naval definition:** The human controls when agent output is reviewed. Agent doesn't interrupt.

**Linux equivalent:** **`nice` / `ionice`** (priority control — background processes shouldn't starve foreground). Also: **`SIGSTOP` / `SIGCONT`** (human controls when processes run). Also: **Notifications off** / **Do Not Disturb** (OS-level). Also: **Asynchronous I/O** (`aio`, `io_uring` — submit work, collect results when ready, not when complete). Also: **Polling vs interrupts** — the choice between the CPU checking for completion (polling) vs devices interrupting the CPU (interrupts).

**Confidence:** HIGH

**Gap analysis:** The polling vs interrupt distinction in systems design is exactly this: does the operator check for results on their schedule (polling), or does the system interrupt the operator when results are ready (interrupts)? The naval term declares a preference for polling over interrupts at the human level.

In Linux kernel design, the NAPI (New API) networking subsystem switched from pure interrupts to a hybrid polling model specifically because interrupt storms were overwhelming the CPU. This is the exact same problem: too many completion notifications degrading the operator's ability to do deep work.

**Recommendation:** ADOPT `poll mode` or `async review`. The polling-vs-interrupts tradeoff is well-understood in systems design and maps precisely to this concept.

---

### HCI Foot Guns

#### 40. spinning_to_infinity

**Naval definition:** Recursive meta-analysis consuming context without producing decisions.

**Linux equivalent:** **Fork bomb** (`:(){ :|:& };:` — recursive process creation consuming all resources). Also: **Infinite loop** (obvious). Also: **Stack overflow** (recursive calls without termination condition). Also: **Livelock** (processes are running but making no progress — distinguished from deadlock where processes are blocked).

**Confidence:** HIGH

**Gap analysis:** Livelock is the precise equivalent: the system is active (not deadlocked), consuming resources (CPU/context), but making no forward progress. Each iteration produces output that looks like work but moves no closer to completion. The fork bomb is the pathological case where the recursion also consumes all available resources (context window).

**Recommendation:** ADOPT `livelock` or `recursive resource exhaustion`. Livelock is well-defined, well-understood, and precisely describes the failure mode.

---

#### 41. high_on_own_supply

**Naval definition:** Unbounded human creativity + sycophantic agent response = positive feedback loop producing impressive artifacts unmoored from the objective.

**Linux equivalent:** **Runaway process** (`while true; do work; done` — no termination condition, consuming resources). Partial: **Positive feedback loop** (control theory — system with no negative feedback diverges). Also: **OOM killer candidate** (a process consuming unbounded resources that eventually forces system intervention).

**Confidence:** LOW

**Gap analysis:** Linux doesn't model the *social* dynamics of human-AI interaction. There's no system concept for "two entities reinforcing each other's confidence without an external check." Control theory has "positive feedback loop" (system diverges without damping), which is structurally correct. But the specifically human element — sycophancy meeting creativity — has no Linux equivalent because Linux doesn't have sycophantic processes.

This is a genuine HCI concept that doesn't reduce to a systems concept. The failure mode is real, the control theory framing is accurate, but the name captures something about human-AI interaction that "positive feedback loop" doesn't fully convey.

**Recommendation:** KEEP, or rename to `undamped feedback loop` if you want the control theory framing. The concept names a specific human-AI failure mode that doesn't have an established systems equivalent.

---

#### 42. dumb_zone

**Naval definition:** Operating outside the model's effective context range. Syntactically valid output, semantically wrong.

**Linux equivalent:** **Working set exceeds cache** (CPU cache thrashing — the working set is larger than the L1/L2/L3 cache, so every access is a cache miss, and performance degrades catastrophically). Also: **Swap thrashing** (working set exceeds RAM, system spends all time swapping pages, no useful work done). Also: **OOM** (out of memory — the process needs more memory than available and either crashes or produces garbage).

**Confidence:** HIGH

**Gap analysis:** Cache thrashing is the precise mechanism: when the working set (information needed for correct operation) exceeds the cache (context window), every "access" (every reference the model makes) is a "miss" (the model doesn't actually have the relevant context), and the output degrades. The system keeps running (syntactically valid output) but produces wrong results (semantically disconnected).

Swap thrashing is the pathological version: the system is spending all its "time" (context budget) loading and evicting information, with no budget left for actual computation.

**Recommendation:** ADOPT `context thrashing` or `cache miss zone`. The mechanism is exactly cache behaviour and the Linux terminology is more precise about *why* the degradation happens.

---

#### 43. cold_context_pressure

**Naval definition:** On-file material (system prompts, role files) exerting gravitational pull on agent behaviour. Too much narrows the solution space.

**Linux equivalent:** **Initramfs / initrd bloat** (too much in the initial ramdisk slows boot and consumes memory before the real rootfs is mounted). Also: **Kernel command line length** (limited, every parameter competes for space). Also: **`LD_PRELOAD` pollution** (too many preloaded libraries interfere with normal operation). Also: **Systemd unit file accumulation** (too many unit files slow boot and increase surface area).

**Confidence:** MEDIUM

**Gap analysis:** The concept — "too much static configuration narrows dynamic behaviour" — has structural equivalents in Linux (initrd bloat, command line limits) but isn't commonly named as a single concept. Linux systems do experience this: servers with hundreds of systemd unit files boot slowly and have complex dependency graphs. But Linux admins don't have a single term for "too much config" — they just call it "bloat" or "cruft."

The specific application to AI systems (too much system prompt material degrades output quality) is a novel observation about LLM context dynamics, not a general systems concept.

**Recommendation:** MERGE. Use `config bloat` or `prompt saturation` for the mechanism. The observation that system prompts have diminishing and eventually negative returns is novel in the AI context and worth naming, but "cold context pressure" is opaque.

---

#### 44. hot_context_pressure

**Naval definition:** In-thread material accumulating, raising compaction risk and degrading signal-to-noise.

**Linux equivalent:** **Memory pressure** (`/proc/pressure/memory`, `MemAvailable` in `/proc/meminfo`). Also: **Log rotation** (`logrotate` — logs accumulate and must be rotated/compressed/deleted). Also: **Inode exhaustion** (filesystem running out of metadata capacity). Also: **Buffer bloat** (network buffers accumulating packets, increasing latency).

**Confidence:** HIGH

**Gap analysis:** Memory pressure is the direct equivalent: as a process accumulates more data in memory, performance degrades, and eventually the OOM killer intervenes (= context compaction). Linux's Pressure Stall Information (PSI) at `/proc/pressure/memory` quantifies exactly this: how much time the system spends stalled waiting for memory. `logrotate` is the operational response: periodically compress and remove old data to prevent accumulation from degrading the system.

**Recommendation:** ADOPT `memory pressure` or `context pressure`. PSI metrics are established Linux infrastructure for measuring exactly this phenomenon. "Hot context pressure" is a synonym for "memory pressure" applied to LLM context windows.

---

#### 45. compaction_loss

**Naval definition:** Context window death where unwritten decisions are permanently lost.

**Linux equivalent:** **Data loss on unclean shutdown** — `fsync` not called before crash. Also: **Uncommitted transaction rollback** (database — `BEGIN` without `COMMIT`, process dies, transaction lost). Also: **Volatile storage loss** (RAM contents lost on power failure — this is why we have `fsync`). Also: **`tmpfs` loss on reboot** (`/tmp` on tmpfs is cleared on every boot).

**Confidence:** HIGH

**Gap analysis:** This is data loss from failing to persist state before a state transition. The entire purpose of `fsync(2)`, WAL (write-ahead logging), and journaling filesystems is to prevent this exact failure mode. Databases solve this with transaction logs. Filesystems solve this with journals. The concept is so fundamental to systems engineering that it has dozens of solutions.

The application to LLM context windows is structurally identical: the context window is RAM, compaction is power loss, and decisions not written to disk (durable files) are permanently lost.

**Recommendation:** ADOPT `uncommitted state loss` or `volatile state loss`. The concept is fsync semantics — if you didn't write it to disk, it doesn't exist after a crash. Engineers already know this.

---

#### 46. cognitive_deskilling

**Naval definition:** Progressive atrophy of human verification capacity through over-delegation to AI.

**Linux equivalent:** **Automation complacency** (established human factors term from aviation and nuclear operations). Also: **Alarm fatigue** (medical/industrial — operators stop responding to alarms when there are too many). Partial: **Bainbridge's ironies of automation** (1983 — automation eliminates the practice that keeps humans competent at the task automation performs).

**Confidence:** LOW (as a Linux concept), HIGH (as an established human factors concept)

**Gap analysis:** Linux itself doesn't model this because Linux doesn't model human skill levels. But the concept is extremely well-established in human factors engineering under the name "automation complacency" or "skill degradation through automation" (Bainbridge 1983, Parasuraman & Riley 1997). Aviation has extensive literature on pilots losing manual flying skills through over-reliance on autopilot.

This is a genuine and important concept, but it's not novel — it's a well-studied phenomenon in human factors that the project has rediscovered and applied to AI-assisted software engineering.

**Recommendation:** ADOPT `automation complacency` (Bainbridge 1983). The human factors literature has 40+ years of research on this exact phenomenon. Using the established term connects to that body of knowledge instead of presenting the concept as a discovery.

---

### Context Engineering

#### 47. prime_context

**Naval definition:** The minimum set of information that enables correct output. If absent, correctness is impossible.

**Linux equivalent:** **Working set** (virtual memory — the set of pages a process needs in RAM for efficient operation; first formalised by Denning, 1968). Also: **Minimum viable config** (the smallest configuration that makes a service functional). Also: **Required mounts** (the filesystem mounts a container needs to function — `/proc`, `/sys`, `/dev`). Also: **Kubernetes `ConfigMap` / `Secret` required references** (pod won't start without them).

**Confidence:** HIGH

**Gap analysis:** Denning's working set model (1968) is exactly prime context: the minimum set of memory pages a process needs to operate without excessive page faults. If the working set isn't in RAM (= isn't in the context window), the process thrashes (= the model produces degraded output). Working set theory is foundational to virtual memory management.

The application to LLM context windows is a direct structural mapping: identify the minimal context the model needs for correct operation, load exactly that, avoid loading more (which causes "cold context pressure" / thrashing).

**Recommendation:** ADOPT `working set`. Denning's working set model is a foundational CS concept from 1968 that describes exactly this. "Prime context" reinvents the working set for LLM context windows.

---

### Remaining Communication Terms

#### 48. echo / check_fire

**Naval definition:** Agent compresses understanding into Signal notation before acting. Alignment check.

**Linux equivalent:** **`--dry-run`** (show what would happen without doing it). Also: **`make -n`** (print commands without executing). Also: **TCP three-way handshake** (`SYN → SYN-ACK → ACK` — mutual confirmation before data transfer). Also: **`plan` in Terraform** (show intended changes, wait for approval). Also: **Readback** (aviation — pilot reads back ATC instruction to confirm understanding).

**Confidence:** HIGH

**Gap analysis:** `--dry-run` is the direct operational equivalent: "tell me what you understood and what you plan to do, before doing it." `terraform plan` is precisely this: the system shows its interpretation of the desired state and the actions it would take, the human confirms, then `terraform apply` executes.

The TCP three-way handshake is the protocol-level equivalent: before data flows, both sides confirm they understand the connection parameters.

**Recommendation:** ADOPT `plan` or `dry-run`. Both are universally understood. "Echo" is fine as a verb ("echo back your understanding"), but `--dry-run` is the Unix convention for this pattern.

---

#### 49. log_that

**Naval definition:** Flag-and-capture trigger. Excerpt current exchange to durable file.

**Linux equivalent:** **`logger(1)`** (write a message to the system log). Also: **Core dump** (`SIGQUIT` / `ulimit -c` — capture process state at a point in time). Also: **`script(1)`** (record terminal session). Also: **Checkpoint** (CRIU — Checkpoint/Restore In Userspace: snapshot a process for later inspection). Also: **`dmesg` annotation** (`printk` — inject a message into the kernel log).

**Confidence:** HIGH

**Gap analysis:** `logger(1)` is the Unix command for "write this to the log right now." Core dumps capture state at a specific moment. CRIU checkpoints capture an entire process state. `script(1)` records terminal sessions. The concept — "capture this moment to durable storage" — has many Unix implementations.

**Recommendation:** ADOPT `checkpoint` or `log`. The command `logger -t session "this exchange was significant"` does exactly what "log that" does.

---

#### 50. scrub_that

**Naval definition:** Remove material from a durable file. Very rare.

**Linux equivalent:** **`shred(1)`** / **`rm -f`** (delete file). Also: **`git revert`** / **`git reset`** (undo committed changes). Also: **Log redaction** (removing sensitive data from logs — GDPR right to erasure). Also: **`truncate(1)`** (remove content from a file).

**Confidence:** HIGH

**Gap analysis:** Deleting or redacting content from files is a basic Unix operation. The naval emphasis on rarity is a policy decision ("you shouldn't need to do this often"), not a technical concept.

**Recommendation:** RETIRE. This is `sed -i '/pattern/d' file` or `git revert`. It doesn't need a naval name.

---

#### 51. mint

**Naval definition:** Create a new SD, ref, or artifact. Deliberate, not automatic.

**Linux equivalent:** **`touch(1)`** (create a file). Also: **`git tag`** (create a named, immutable reference point). Also: **Certificate issuance** (CA minting a new certificate). Also: **UUID generation** (`uuidgen(1)` — create a unique identifier).

**Confidence:** MEDIUM

**Gap analysis:** `git tag` is the closest: a deliberate act of creating a named, immutable reference in the project history. Certificate issuance captures the "deliberate, authoritative creation" aspect. But "mint" in the naval lexicon emphasises the *decision to create* rather than the *mechanism of creation* — it's about governance (should we create a new SD?) rather than operations (how to create a file).

**Recommendation:** RETIRE. Use `tag` or `issue` depending on what's being created. The governance question ("should we create this?") is a decision, not a vocabulary item.

---

---

## Synthesis

### 1. Coverage Statistics

| Confidence | Count | Percentage | Terms |
|-----------|-------|------------|-------|
| HIGH | 33 | 65% | conn, standing_order, watch, officer_watch, dead_reckoning, making_way, drifting, heave_to, beat_to_quarters, hull, polecats, darkcat, sortie, gauntlet, below_decks, main_thread, clear_decks, HOTL, HODL, verifiable/taste_required, oracle_contamination, naturalists_tax, spinning_to_infinity, hot_context_pressure, compaction_loss, echo/check_fire, log_that, scrub_that, prime_context, interrupt_sovereignty, cognitive_deskilling, dumb_zone, darkcat_alley |
| MEDIUM | 12 | 24% | true_north, bearing, full_sail, staining, muster, quarterdeck, wardroom, cold_context_pressure, effort_backpressure, compound_quality, engineering_problem, mint |
| LOW | 6 | 12% | tacking, on_point, weave_modes (tight/loose/extra-tight), high_on_own_supply, fair_winds, extra_rations |

**65% of the naval lexicon maps directly to established Linux/Unix concepts.** Another 24% maps with caveats. Only 12% (6 terms) names something genuinely absent from the Linux/Unix ecosystem.

### 2. Overloaded Terms

These naval terms are doing double duty and should be split:

| Term | What it bundles | Should decompose to |
|------|----------------|-------------------|
| **conn** | Mutex semantics + decision authority role | `lock` (exclusive resource) + `leader` (role with authority) |
| **watch** | Monitoring + delegated authority + domain scope | `controller` (monitoring loop) + `RBAC` (permissions) + `namespace` (domain scope) |
| **bearing** | Computable drift (gate results) + subjective alignment (strategic fit) | `drift` (measurable delta from spec) + `alignment` (subjective assessment) |
| **full_sail** | Speed + risk tolerance + reduced verification | `priority` (speed) + `QoS` (risk profile) + `check level` (verification depth) |
| **staining** | Diagnostic application + cross-context transfer | `analysis` (applying rules) + `cross-reference` (context transfer) |

### 3. Genuinely Novel Concepts

These 4 terms name something the Linux/Unix ecosystem has not needed to name, primarily because they describe human-AI interaction dynamics that don't exist in traditional human-computer interaction:

1. **high_on_own_supply** — The positive feedback loop between human creativity and agent sycophancy. Control theory has "undamped oscillation," but the specifically sycophantic component (the agent validates everything) is novel to AI interaction. Linux processes don't flatter their operators.

2. **tacking** — Deliberate indirect progress communicated as intentional. Linux doesn't need to explain *why* it's taking an indirect path because Linux doesn't communicate strategy. In human-AI coordination, distinguishing "indirect but intentional" from "drifting" has communication value.

3. **weave modes (tight/loose/extra-tight)** — Communication register control between human and AI. Unix has verbosity levels (`-v`, `-q`) but not *formality* levels that change the agent's creative latitude. This is a human-AI interaction concept with no Unix parallel.

4. **compound_quality** (partially novel) — The specific insight that codebase quality is context engineering for AI agents. The feedback loop concept is established, but its application to AI-as-context-consumer is novel.

Two additional terms (**fair_winds**, **extra_rations**) are also absent from Linux, but they're social conventions rather than technical concepts and don't represent conceptual contributions.

### 4. Missing Linux Concepts

Linux/Unix concepts the project should have been using but wasn't:

| Linux Concept | What it would have named | Current naval term (if any) |
|--------------|-------------------------|----------------------------|
| **Working set** (Denning 1968) | The minimum context for correct operation | `prime_context` — reinvented |
| **Livelock** | Recursive meta-analysis consuming resources without progress | `spinning_to_infinity` — reinvented |
| **Cache thrashing** | Context window overload causing degraded output | `dumb_zone` — reinvented |
| **Memory pressure / PSI** | Context accumulation degrading performance | `hot_context_pressure` — reinvented |
| **WAL / crash recovery** | Resuming from durable state after context death | `dead_reckoning` — reinvented |
| **Leader election** | Exclusive decision authority with explicit transfer | `conn` — reinvented |
| **Graceful shutdown** | Flush state to durable storage before reset | `clear_decks` — reinvented |
| **Controller reconciliation loop** | Monitoring + corrective action within delegated scope | `watch` / `officer_watch` — reinvented |
| **N-version programming** | Multi-model analysis for independent validation | `model_triangulation` / `darkcat_alley` — reinvented |
| **Alert fatigue** | Discovery overhead saturating human attention | `naturalists_tax` — reinvented |
| **Automation complacency** (Bainbridge 1983) | Human skill degradation through over-delegation | `cognitive_deskilling` — reinvented |
| **Batch processing** | Human-out-of-loop execution | `HOTL` — reinvented |
| **Interactive mode** | Human-in-the-loop, per-step approval | `HODL` — reinvented |
| **`--dry-run` / `terraform plan`** | Show intent before executing | `echo` / `check_fire` — reinvented |
| **Backpressure / flow control** | Effort as quality filter | `effort_backpressure` — partially reinvented |

15 of 51 terms (29%) reinvent established Linux/Unix or computer science concepts.

### 5. Proposed Hybrid Lexicon

Terms organised by recommendation. This is what the lexicon looks like after applying the Linux mapping.

#### ADOPT (use the Linux term — 26 terms)

| Current | Proposed | Source |
|---------|----------|--------|
| conn | `leader` / `lock holder` | Distributed systems |
| standing_order | `persistent policy` | `/etc/`, systemd, k8s policy |
| watch | `controller` | Kubernetes controller pattern |
| officer_watch | `privileged controller` | RBAC + capabilities |
| dead_reckoning | `crash recovery` / `WAL` | Journaling filesystems, databases |
| making_way | `healthy` / `nominal` | Monitoring (Nagios OK, systemd active) |
| drifting | `drift` / `drifted` | Terraform, Ansible, Puppet |
| heave_to | `paused` / `suspended` | `SIGSTOP`, circuit breaker |
| beat_to_quarters | `SEV-1` / `emergency` | SRE incident response |
| hull | `gate` / `required checks` | CI/CD |
| polecats | `job` / `subprocess` | Kubernetes Job, `fork+exec` |
| darkcat | `adversarial lint` / `audit pass` | Static analysis, SELinux audit |
| darkcat_alley | `multi-engine audit` | N-version programming |
| sortie | `delivery pipeline` | CI/CD pipeline |
| gauntlet | `required pipeline` | CI required checks |
| below_decks | `background` | Unix `&`, `nohup` |
| clear_decks | `sync` / `graceful shutdown` | `sync(2)`, `SIGTERM` handlers |
| HOTL | `batch` / `async` | Batch processing, cron |
| HODL | `interactive` / `step` | `rm -i`, `gdb step` |
| spinning_to_infinity | `livelock` | OS scheduling |
| dumb_zone | `context thrashing` | Cache/VM thrashing |
| hot_context_pressure | `memory pressure` | `/proc/pressure/memory` |
| compaction_loss | `volatile state loss` | `fsync` semantics |
| cognitive_deskilling | `automation complacency` | Bainbridge 1983 |
| echo / check_fire | `plan` / `dry-run` | `--dry-run`, `terraform plan` |
| naturalists_tax | `alert fatigue` | SRE/DevOps |

#### MERGE (use Linux term as primary, keep residual meaning — 6 terms)

| Current | Proposed primary | Residual | Notes |
|---------|-----------------|----------|-------|
| bearing | `drift` (computable) | `alignment` (subjective) | Split the term |
| full_sail | `priority: max` | `risk: high` | Decompose into orthogonal controls |
| staining | `diagnostic overlay` | Cross-context aspect | Workflow, not system concept |
| cold_context_pressure | `config bloat` | Prompt saturation insight | Novel for LLM context |
| effort_backpressure | `backpressure` | Social application | Novel for AI-generated contributions |
| quarterdeck / wardroom | `control-plane` / `staging` | Communication register | Keep if register distinction matters |

#### KEEP (genuinely novel or useful — 7 terms)

| Term | Why keep | Consider renaming to |
|------|----------|---------------------|
| true_north | No Linux equivalent for immutable strategic objective | Keep or use `objective` |
| tacking | No Linux equivalent for communicated intentional indirection | Keep (distinctive, useful) |
| high_on_own_supply | Novel human-AI sycophancy feedback loop | `undamped feedback` (less vivid but more precise) |
| weave modes (tight/loose) | No Linux equivalent for communication register modes | `mode: execute/explore/emergency` |
| compound_quality | Novel application to AI-as-context-consumer | `context quality loop` |
| muster | Useful communication protocol name | `pick list` or keep |
| verifiable / taste_required | Already well-named, no change needed | Keep |

#### RETIRE (redundant, confusing, or non-technical — 12 terms)

| Term | Why retire |
|------|-----------|
| fair_winds | Social convention, no technical content |
| extra_rations | Social convention, no technical content |
| on_point | Too vague, subjective — "converged" or "aligned" is more precise |
| engineering_problem | A debugging heuristic, not a vocabulary item |
| main_thread | Already the Linux term — nothing to do |
| scrub_that | `sed` / `git revert` — doesn't need a name |
| mint | `tag` / `issue` — doesn't need a name |
| log_that | `checkpoint` / `logger` — marginal value as named term |
| oracle_contamination | Already well-named in ML; use `root-of-trust failure` or keep ML term |
| prime_context | Adopt `working set` — Denning 1968 is the exact concept |
| interrupt_sovereignty | Adopt `poll mode` — the systems concept is more precise |
| darkcat (name) | Keep concept (adversarial lint), retire the opaque name |

---

### Surprising Findings

**The lexicon is approximately 65% reinvention.** Most of the naval terms describe well-established systems concepts (crash recovery, leader election, backpressure, livelock, cache thrashing, batch processing, interactive mode, graceful shutdown, N-version programming). The naval metaphor wraps these in memorable names but obscures the direct connection to the engineering literature.

**The novel contributions cluster around human-AI interaction.** The 4 genuinely novel terms all describe dynamics at the boundary between human and AI agent — feedback loops, communication registers, intentional indirection. This makes sense: Linux models human-computer interaction through terminals and signals, not through collaborative dialogue. The agentic system introduces interaction dynamics that the Unix model never needed to address.

**Several terms would benefit from decomposition rather than renaming.** `conn`, `watch`, `bearing`, and `full_sail` each bundle multiple orthogonal concepts that Linux separates. Splitting them would increase precision without losing expressiveness.

**The project independently rediscovered Denning's working set model (1968).** "Prime context" is working set theory applied to LLM context windows. The structural isomorphism is exact: minimum pages in RAM for efficient operation ≡ minimum tokens in context for correct generation. This rediscovery validates the concept but suggests the project would benefit from reading the virtual memory literature, where these dynamics have been studied for 58 years.

**The strongest terms are the ones that aren't naval.** `verifiable` / `taste_required`, `compound_quality`, and `engineering_problem` are already plain English and communicate clearly. The naval metaphor doesn't improve them. The worst terms are the ones where naval flavour obscures a well-known concept: `dead_reckoning` for crash recovery, `naturalists_tax` for alert fatigue, `spinning_to_infinity` for livelock.
