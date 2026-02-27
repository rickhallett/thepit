+++
title = "Building RAG Systems for Therapeutic Context: Lessons from Sidekick"
author = "Richard Hallett"
date = "2025-01-22"
description = "What 15 years as a therapist taught me about building AI systems that understand human context—and why most RAG implementations miss the point."
categories = ["Engineering", "AI"]
tags = ["RAG", "LLM", "therapy", "AI", "embeddings", "context"]
draft = false
+++

# Building RAG Systems for Therapeutic Context

When I started building [Sidekick](https://sidekick.oceanheart.ai), a reflective chat environment for meditation practitioners, I thought the hard part would be the technical implementation. Vector databases, embedding models, chunk strategies—the usual RAG complexity.

I was wrong.

The hard part was getting an AI system to actually understand context the way a human therapist does.

## The Problem with Naive RAG

Standard RAG implementations work like this:

1. User asks a question
2. System retrieves semantically similar chunks from a knowledge base
3. LLM generates a response using those chunks

This works fine for factual Q&A. Ask "What is the capital of France?" and you'll get "Paris" with source citations.

But therapy isn't factual Q&A. It's relational. Context-dependent. The same words mean completely different things depending on who says them and what came before.

## Example: The Word "Stuck"

Consider a user who says: "I feel stuck."

Naive RAG might retrieve:
- Definitions of psychological "stuckness"
- Generic advice about overcoming obstacles
- Motivational content about moving forward

But a therapist would ask:
- Stuck in what? A decision? A relationship? A thought pattern?
- What does "stuck" feel like in your body?
- When did you first notice this feeling?
- What would "unstuck" look like?

The semantic similarity between "I feel stuck" and generic content about stuckness is high. But the therapeutic relevance is low.

## What Therapists Actually Do

After 15 years of CBT practice, I've learned that good therapy isn't about having the right answers. It's about:

**1. Tracking Context Over Time**
A therapist remembers that last week you mentioned conflict with your sister. When you say "I feel stuck" today, they consider whether that might be related.

**2. Understanding the Presenting Problem vs. the Real Problem**
People rarely say what they actually mean the first time. "I feel stuck" might mean "I'm afraid to make a decision" or "I'm angry but don't know how to express it."

**3. Meeting Resistance, Not Fighting It**
When someone is stuck, the last thing they need is more advice. They need to feel understood first.

## Implementing Contextual RAG

Here's how I approach this in Sidekick:

### 1. Session-Level Memory

Instead of treating each message independently, I maintain session context:

```python
class SessionContext:
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.message_history = []
        self.emotional_trajectory = []
        self.themes = set()
        self.resistance_markers = []
```

Every message updates this context. When retrieving from the knowledge base, I weight results by relevance to accumulated themes, not just the current query.

### 2. Emotional State Tracking

Before retrieval, I classify the emotional tone of the message:

```python
emotional_states = [
    "seeking_validation",
    "exploring_curiosity",
    "expressing_frustration",
    "processing_grief",
    "avoiding_topic",
    "ready_for_challenge"
]
```

Different emotional states call for different retrieval strategies. Someone expressing frustration needs empathic acknowledgment before practical content. Someone ready for challenge can handle more direct guidance.

### 3. Multi-Stage Retrieval

Instead of single-shot retrieval, I use a staged approach:

**Stage 1: Understanding Query**
- What is the user actually asking?
- What emotional state are they in?
- What themes from previous sessions might be relevant?

**Stage 2: Contextual Retrieval**
- Retrieve content relevant to both the query AND the accumulated context
- Weight recent themes more heavily
- Include "bridging" content that connects current topic to previous discussions

**Stage 3: Response Framing**
- Choose response style based on emotional state
- Include appropriate therapeutic techniques (reflection, validation, gentle challenge)
- Reference previous discussions where relevant

### 4. Knowledge Base Structure

My knowledge base isn't a flat collection of documents. It's structured by:

- **Topic hierarchy**: meditation > mindfulness > breath awareness
- **Practitioner stage**: beginner, intermediate, advanced
- **Therapeutic function**: psychoeducation, technique, reflection prompt, normalization

This structure allows retrieval that considers not just what content is relevant, but what type of content serves the user's current need.

## The Code: Simplified Example

Here's a simplified version of the retrieval flow:

```python
async def contextual_retrieve(
    query: str,
    session: SessionContext,
    knowledge_base: VectorStore
) -> list[RetrievedChunk]:

    # Analyze query emotional context
    emotional_state = await classify_emotional_state(query)

    # Build compound query from session themes
    theme_queries = [
        f"context: {theme}"
        for theme in session.themes
    ]

    # Multi-query retrieval
    results = []

    # Primary retrieval on user query
    primary = await knowledge_base.similarity_search(
        query,
        k=5,
        filter={"practitioner_stage": session.stage}
    )
    results.extend(primary)

    # Contextual retrieval on themes
    for theme_query in theme_queries[-3:]:  # Recent themes only
        theme_results = await knowledge_base.similarity_search(
            theme_query,
            k=2
        )
        results.extend(theme_results)

    # Re-rank by composite relevance
    ranked = rerank_by_context(
        results,
        emotional_state,
        session.emotional_trajectory
    )

    return ranked[:7]  # Top results
```

## Results

This approach produces responses that feel qualitatively different. Instead of generic advice, the system:

- Acknowledges emotional states before offering guidance
- References previous discussions naturally
- Asks clarifying questions instead of assuming
- Adjusts depth and directness based on user readiness

Is it as good as a human therapist? No. But it's meaningfully better than naive RAG, and it demonstrates that therapeutic understanding can be encoded in system design.

## The Bigger Lesson

The technical challenge in building AI for human domains isn't the AI—it's understanding the domain deeply enough to know what the AI should actually do.

Vector databases and embedding models are commodities. The scarce resource is domain expertise that can be translated into system design.

That's the value I bring: 15 years of understanding how humans actually work, encoded into systems that work for humans.

---

*Sidekick is in active development. [Try the prototype](https://sidekick.oceanheart.ai) or [view the code](https://github.com/rickhallett/sidekick.oceanheart.ai).*
