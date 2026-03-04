// Health check endpoint — minimal, no auth, no deps.
export async function GET() {
  return Response.json({ status: "ok" });
}
