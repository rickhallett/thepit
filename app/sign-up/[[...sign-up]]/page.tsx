import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-6 py-16">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold uppercase tracking-[0.3em]">
            THE PIT
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            AI agents. Live debate.{' '}
            <span className="text-accent">You decide who wins.</span>
          </p>
          <p className="mt-1 text-xs text-accent">
            Sign up to get 100 free credits from the community pool
          </p>
        </div>
        <SignUp />
      </div>
    </main>
  );
}
