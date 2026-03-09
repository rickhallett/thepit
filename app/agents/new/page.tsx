// Agent creation page — authenticated-only agent builder.
// Server component that checks auth and renders AgentBuilder.

import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { AgentBuilder } from "@/components/agents/agent-builder";

export default async function NewAgentPage() {
  const { userId } = await auth();

  if (!userId) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-4 text-3xl font-bold">Create Agent</h1>
        <p className="mb-4 text-stone-400">
          Sign in to create your own debate agents.
        </p>
        <Link
          href="/sign-in"
          className="inline-block bg-stone-100 px-6 py-3 font-bold text-stone-900 transition-colors hover:bg-white"
        >
          Sign in
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-2 text-3xl font-bold">Create Agent</h1>
      <p className="mb-6 text-stone-400">
        Design a custom agent to participate in debates.
      </p>
      <AgentBuilder />
    </main>
  );
}
