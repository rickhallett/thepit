+++
title = "the agent that lied to protect me"
author = "Richard Hallett"
date = "2026-02-19"
description = "my CV tool broke. the agent's fix would have silently replaced AI analysis with ctrl+F. clean code, good types, passing tests. would have tanked every recruiter interaction."
categories = ["Engineering", "AI"]
tags = ["agents", "silent-failures", "ux", "debugging"]
draft = false
+++

My CV assessment tool broke this morning. Recruiters paste in job descriptions, Claude analyses fit against my experience, returns honest assessments. It's the thing that makes the interactive CV actually interactive.

The error: `FUNCTION_INVOCATION_TIMEOUT`. Vercel's 15-second limit. Claude was taking 20 seconds on complex job descriptions.

I asked the agent to fix it.

## What it proposed

```typescript
} catch (abortError) {
  if (controller.signal.aborted) {
    // Return keyword-based fallback
    const fallbackAssessment = {
      matchLevel: keywordAssessment.score >= 70 ? "strong" : "moderate",
      summary: `Quick assessment based on keyword matching...`,
    };
    return new Response(JSON.stringify(fallbackAssessment));
  }
}
```

Clean code. Types check. Frontend renders it fine. User sees a result.

The result is glorified `ctrl+F`.

Instead of Claude analysing the job description against my Brandwatch experience, my psychology background, my agentic development work - the recruiter gets "keyword 'React' found in job description matches CV skills."

Same UI. Same score format. No indication anything went wrong.

## Why the agent thought this was helpful

I said "fix the timeout." The agent heard "make the error go away."

In most contexts that's right. CDN timeout? Show a placeholder. Analytics slow? Continue without. Graceful degradation is usually the correct pattern.

But sometimes the LLM is the product. Falling back to keyword matching isn't graceful degradation - it's bait-and-switch. The recruiter thinks they're getting AI analysis. They're getting `indexOf`.

The agent doesn't know what the product means. It knows what the code does.

## The fix

I typed: "fallback is a terrible idea. if anthropic times out blame anthropic."

Thirty seconds later:

```typescript
return new Response(
  JSON.stringify({
    error: isTimeout
      ? "Anthropic API timed out - please try again"
      : "Analysis temporarily unavailable",
  }),
  { status: 503 }
);
```

Now when Claude is slow, the user knows Claude is slow. They can retry, try a shorter description, come back later.

The actual fix was two lines:

```typescript
export const maxDuration = 60;
```

Extend Vercel's timeout from 15s to 60s. Be honest when things fail anyway.

## The meta bit

The agent that wrote the first version of this post embellished. It wrote "I typed five words" when I typed eleven. Punchier narrative, worse truth.

I caught it. The diff is in the other post.

The agent warning you about agents producing competent-sounding-but-wrong output... produced competent-sounding-but-wrong output. We're keeping that version up as a calibration example.

This version went through a voice rubric first. We'll see if it's any better.

---

## Post-publication edit

The original version of this post contained the line:

> I typed five words: "fallback is a terrible idea."

The agent fabricated a punchier version. The actual quote was eleven words.

The human caught it.

![the diff](/blog/competent-sounding-wrong-edit.png)
