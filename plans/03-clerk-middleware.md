# 03-clerk-middleware

## Context
depends_on: [02]
produces: [middleware.ts, app/sign-in/[[...sign-in]]/page.tsx, app/sign-up/[[...sign-up]]/page.tsx, lib/auth/middleware.ts]
domain: lib/auth/
gate: typecheck + lint + test:unit

## References
Read these files before implementing:
- SPEC.md (Auth Flow section, UI Pages section for sign-in/sign-up)
- lib/auth/DOMAIN.md
- lib/common/env.ts (for env var access pattern)

## Task

### 1. Install Clerk

```
pnpm add @clerk/nextjs
```

### 2. Root middleware

Create `middleware.ts` in the project root (not inside `app/`):

```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/arena(.*)",
  "/bout/(.*)",
  "/b/(.*)",
  "/agents(.*)",
  "/leaderboard(.*)",
  "/recent(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/health",
  "/api/run-bout",
  "/api/reactions",
  "/api/short-links",
  "/api/credits/webhook",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
```

This middleware does auth ONLY. Do NOT add:
- Analytics tracking
- A/B testing
- UTM parameter capture
- Cookie consent checking
- Any custom headers beyond what Clerk sets

### 3. Sign-in page

Create `app/sign-in/[[...sign-in]]/page.tsx`:
```typescript
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn />
    </div>
  );
}
```

### 4. Sign-up page

Create `app/sign-up/[[...sign-up]]/page.tsx`:
```typescript
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignUp />
    </div>
  );
}
```

### 5. ClerkProvider in layout

Update `app/layout.tsx` to wrap children in `<ClerkProvider>`:
```typescript
import { ClerkProvider } from "@clerk/nextjs";
```

Wrap the body content (not the html/body tags themselves) in `<ClerkProvider>`.

### 6. Auth helper

Create `lib/auth/middleware.ts`:
```typescript
import { auth } from "@clerk/nextjs/server";

export async function getAuthUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}

export async function requireAuth(): Promise<string> {
  const userId = await getAuthUserId();
  if (!userId) {
    throw new Error("Authentication required");
  }
  return userId;
}
```

### Do NOT
- Install any analytics packages
- Add consent tracking middleware
- Create a custom session management system — use Clerk's built-in session handling
- Add webhook handling for Clerk events — user mirroring is handled in task 04

## Verification
After implementing, verify:
- `pnpm run typecheck` exits 0
- `pnpm run lint` exits 0
- `middleware.ts` exists at project root (not in app/ or src/)
- `middleware.ts` imports only from `@clerk/nextjs/server`
- `app/layout.tsx` wraps content in `<ClerkProvider>`
- Both sign-in and sign-up pages render Clerk components
- `lib/auth/middleware.ts` exports `getAuthUserId` and `requireAuth`
