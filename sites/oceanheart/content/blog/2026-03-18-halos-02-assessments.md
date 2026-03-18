+++
title = "Behavioural evaluation at machine speed: testing AI assistants before deployment"
date = "2026-03-18"
description = "Pre/post Likert instruments, multi-turn dialogue scenarios, three-strike relent rules, and an eval harness that runs 8 behavioural tests in seconds."
tags = ["halos", "evaluation", "testing", "agents", "verification"]
series = ["halos"]
+++

## The problem

How do you know an AI assistant behaves correctly before deploying it to a non-technical user?

Unit tests verify code paths. Integration tests verify API contracts. But assistant behaviour is emergent. It depends on personality calibration, conversation history, user phrasing, and the sequence of prior exchanges. You cannot unit test "does this assistant gracefully handle a user who goes on a tangent and then returns to the original topic?"

What you can do is inject synthetic conversations and verify the responses match expected behavioural patterns.

## The assessment system

Three layers:

**Pre/post instruments.** Likert scale questions delivered by the assistant itself. "On a scale of 1-5, how comfortable do you feel asking me for help?" These measure user perception before and after a usage period.

**Qualitative drop-ins.** Open-ended questions that require rapport to work. "What's one thing I could do better?" These only fire after 3+ conversations - too early and they feel invasive.

**Behavioural governance.** Rules that constrain when and how assessments are delivered:
- Never interrupt a task to ask assessment questions
- If user is mid-conversation, prioritise their need
- If user deflects three times, stop asking (three-strike relent)
- Assessment state persists across sessions

## The eval harness

```bash
halctl assess dad
```

This runs 8 scenarios against an instance:

| Scenario | Description | Turns |
|----------|-------------|-------|
| likert_delivery | Does the assistant initiate assessment after onboarding? | 1 |
| qualitative_not_too_early | Does it hold qualitative questions until 3+ conversations? | 1 |
| qualitative_dropin_eligible | Does it ask qualitative after rapport builds? | 1 |
| no_interrupt_during_task | Does it prioritise user task over assessment? | 1 |
| likert_deflection | Does three-strike relent work? | 3 |
| tangent_and_resume | Can it handle tangent then resume from correct position? | 11 |
| deflect_then_resume | After relent, can user opt back in? | 7 |
| edit_response | Can users revise previous answers mid-assessment? | 6 |

## State reset

Each scenario starts with complete state reset:

```python
# State reset (per scenario)
docker kill $(docker ps -q)          # Kill active containers
DELETE FROM sessions, messages, assessments, onboarding, router_state
rm onboarding-state.yaml
rm -rf data/sessions/
```

State isolation is non-negotiable. Leftover state from a previous test will contaminate results. The scenarios must be independent.

## DB injection

The harness injects messages directly into SQLite:

```python
INSERT INTO messages (
  chat_id, content, sender, timestamp
) VALUES (
  'test_chat', 'hello', 'user', datetime('now')
)
```

The message loop polls the database every 2 seconds. It sees the injected message, spawns a container, processes it, and writes the response to stdout.

The harness captures responses by tailing pm2 logs for `Agent output:` lines.

## Multi-turn dialogue

The tangent_and_resume scenario tests an 11-turn conversation:

```
Turn 1: user -> "hello"
Turn 2: bot -> [greeting + Likert Q1]
Turn 3: user -> "3"
Turn 4: bot -> [acknowledge + Q2]
Turn 5: user -> "actually what's the weather like?"
Turn 6: bot -> [handles tangent, doesn't lose assessment state]
Turn 7: user -> "ok back to the questions"
Turn 8: bot -> [resumes from Q3, not Q1]
Turn 9: user -> "4"
Turn 10: bot -> [Q4 or completes assessment]
Turn 11: user -> "2"
Turn 12: bot -> [assessment complete acknowledgment]
```

Each turn:
1. Inject user message
2. Poll for assistant response
3. Assert response matches expected pattern
4. Record to eval YAML

If the assistant forgets position after the tangent and restarts from Q1, the scenario fails.

## Three-strike relent

The deflect_then_resume scenario tests recovery:

```
Turn 1: user -> "hello"
Turn 2: bot -> [Likert Q1]
Turn 3: user -> "not now"
Turn 4: bot -> [respects deflection, continues normally]
Turn 5: user -> "not now" (to next attempt)
Turn 6: bot -> [second deflection noted]
Turn 7: user -> "not now" (third)
Turn 8: bot -> [relents - stops assessment attempts]
Turn 9: user -> "actually I want to answer the questions"
Turn 10: bot -> [resumes assessment from beginning]
```

This tests two things: the relent rule works, and users can opt back in after relenting.

## Edit response handling

The edit_response scenario tests mid-assessment revision:

```
Turn 1: user -> "hello"
Turn 2: bot -> [Q1]
Turn 3: user -> "3"
Turn 4: bot -> [Q2]
Turn 5: user -> "wait, I want to change Q1 to a 4"
Turn 6: bot -> [confirms edit: "Updated Q1 to 4. Continuing..."]
Turn 7: bot -> [continues from Q2, not Q1]
```

Non-technical users will do this. The assistant needs to handle it gracefully.

## Output format

The harness produces YAML records:

```yaml
record_id: assess_dad_2026-03-18T10:23:45
scenario: tangent_and_resume
instance: dad
timestamp: 2026-03-18T10:23:45Z
turns:
  - role: user
    content: "hello"
  - role: assistant
    content: "Good morning! On a scale of 1-5..."
    assertions:
      - pattern: "scale of 1"
        result: pass
  # ... remaining turns
passed: true
duration_ms: 4521
```

These records are the evidence that the assistant behaves correctly. They're versioned, timestamped, and instance-specific.

## The verification sequence

```bash
halctl create --name dad --personality dad   # Provision
halctl smoke dad                              # 15 infrastructure checks
halctl assess dad                             # 8 behavioural scenarios
# Review results
halctl push dad                               # Deploy governance updates
```

Nothing reaches a user without passing both gates. The cost is minutes. The alternative is deploying a broken assistant to someone who cannot debug it.

## What this catches

Before deployment, I have machine-verified evidence that:

- Assessment questions fire at appropriate times
- The assistant respects user deflection
- Multi-turn conversations maintain state
- Users can revise previous answers
- The three-strike rule works
- Opt-back-in after relent works

These are not edge cases. They are the core interaction patterns that determine whether an assistant feels helpful or annoying.

## Source

- Scenario runner: `halos/halctl/assess.py`
- State reset: `halos/halctl/state_reset.py`
- Response capture: `halos/halctl/log_capture.py`
- Assessment governance: `templates/microhal/blocks/assessment.md`

---

*This is part 2 of the halos series. Previous: [fleet provisioning](/blog/2026-03-18-halos-01-fleet/). Next: [the halos toolchain](/blog/2026-03-18-halos-03-toolchain/) - 8 CLI modules for memory, work tracking, fleet ops, and agent telemetry.*
