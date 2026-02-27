+++
title = "Every Prototype Should Be Deployable: How I Ship Fast Without Accumulating Debt"
author = "Richard Hallett"
date = "2025-01-25"
description = "My approach to building software that ships fast without becoming unmaintainable. Opinionated choices, minimal abstraction, and treating every build as potentially production."
categories = ["Engineering", "Process"]
tags = ["shipping", "prototypes", "architecture", "best practices", "velocity"]
draft = false
+++

# Every Prototype Should Be Deployable

I have a rule: every prototype I build should be deployable to production within an hour of starting.

This isn't about being reckless. It's about eliminating the gap between "building" and "shipped." The longer that gap, the more likely the project dies in development.

## The Prototype Graveyard

We've all been there. You start building something exciting. You scaffold the project. Set up linting. Configure CI/CD. Design the database schema. Create the authentication system. Build the component library.

Three weeks later, the feature you were excited about still doesn't exist. You've been doing "preparation" instead of building.

Half of these projects never ship. They die in setup.

## The Alternative: Deploy First

Here's my process for new projects:

**Hour 1:**
1. `npx create-next-app@latest` (or equivalent)
2. Push to GitHub
3. Deploy to Vercel
4. Send myself the live URL

Now I have a deployed application. It doesn't do anything yet, but it's real. I can share it. It has a URL.

**Hours 2-4:**
Build the core feature. Not the authentication. Not the admin panel. The actual thing that makes this project worth existing.

**Day 2 onward:**
Add infrastructure as needed. Authentication when users need it. Database when persistence matters. Each addition is deployed immediately.

## Why This Works

### 1. Motivation Compounds

Seeing your work deployed keeps you motivated. Every push is visible progress. Every feature goes live immediately.

Contrast this with weeks of "foundation work" before anything is usable. That's a motivation leak.

### 2. Feedback Happens Earlier

When the project is deployed, you can share it. Friends can use it. Potential users can see it. You discover problems sooner because real people encounter them.

### 3. You Build What's Needed

Without a deployed target, you imagine what you'll need. "I should probably add role-based access control." "I might need a caching layer."

With a deployed product, you build what's actually needed. Most of those "probably need" features never become necessary.

## Practical Patterns

### Database: Start with SQLite

For new projects, I start with SQLite via Turso or local file. It's zero configuration and scales further than people think.

```typescript
// Works locally and in production
import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.DATABASE_URL || "file:local.db",
  authToken: process.env.DATABASE_AUTH_TOKEN,
});
```

When I actually need PostgreSQL (concurrent writes, complex queries, PostGIS), I migrate. But that's months away for most projects.

### Authentication: Magic Links First

Full OAuth with multiple providers is a week of work. Magic links are an afternoon:

```typescript
// Send magic link
await resend.emails.send({
  to: email,
  subject: "Sign in to MyApp",
  html: `<a href="${signInUrl}">Sign in</a>`,
});

// Verify on click
const { email } = await verifyToken(token);
await createSession(email);
```

Add Google OAuth later when users ask for it. They usually don't.

### Styling: Tailwind, No Component Library

I use raw Tailwind instead of component libraries like shadcn or Material UI. Why?

1. No learning curve for the library's API
2. No fighting the library's opinions
3. Complete control over every pixel
4. Smaller bundle size

Copy-paste from my previous projects is my component library.

### State Management: React State, Then Context

Don't reach for Redux or Zustand on day one. React's built-in state handles 80% of cases:

```typescript
// Simple state
const [items, setItems] = useState([]);

// When you need cross-component state
const ItemsContext = createContext();

function ItemsProvider({ children }) {
  const [items, setItems] = useState([]);
  return (
    <ItemsContext.Provider value={{ items, setItems }}>
      {children}
    </ItemsContext.Provider>
  );
}
```

I've shipped entire products without anything more sophisticated.

### API Design: File-Based Routes

Next.js API routes are underrated. Each route is a file. No separate backend deployment. No CORS issues.

```typescript
// app/api/items/route.ts
export async function GET() {
  const items = await db.query("SELECT * FROM items");
  return Response.json(items);
}

export async function POST(request: Request) {
  const body = await request.json();
  await db.execute("INSERT INTO items (name) VALUES (?)", [body.name]);
  return Response.json({ success: true });
}
```

The entire backend is part of the frontend deploy. One command ships everything.

## What I Don't Do Early

### Abstraction

Early abstraction is the enemy of shipping. I repeat code three times before extracting a function. I copy components between projects instead of creating a shared library.

Why? Because premature abstraction creates the wrong abstraction. You don't know what the right abstraction is until you've built the thing.

### Testing

Controversial, but: I don't write tests until the feature is validated with users.

Tests lock in behavior. But in the first weeks, I'm still figuring out what the behavior should be. Writing tests too early means I'm testing the wrong thing.

Once a feature is validated, I add tests to prevent regression. But not before.

### Documentation

README files for projects under active development are usually lies. The code changes faster than documentation.

I write docs when shipping v1.0. Not during exploration.

## The Mindset Shift

This approach requires letting go of "best practices" as a security blanket.

Best practices exist for mature codebases with teams and long-term maintenance requirements. A solo developer exploring an idea has different constraints.

The best practice for a prototype is to ship. Everything else is negotiable.

## When to Add Structure

Structure becomes necessary when:

1. **Multiple contributors**: Others need to understand your decisions
2. **User data matters**: You need tests to prevent breaking things
3. **Scaling issues**: Performance problems require architectural solutions
4. **Maintenance horizon**: You'll be maintaining this for years

Until then, keep it simple. Deploy constantly. Ship the thing.

---

*See this philosophy in action across my [portfolio](/portfolio). Every project started as a deployable prototype.*
