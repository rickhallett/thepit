// Clerk auth middleware — protects non-public routes.
// Auth only. No analytics, no consent tracking, no custom headers.

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
