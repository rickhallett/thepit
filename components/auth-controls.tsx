'use client';

import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from '@clerk/nextjs';

import { cn } from '@/lib/cn';

export function AuthControls({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <SignedOut>
        <SignInButton mode="modal">
          <button
            type="button"
            className="rounded-full border-2 border-foreground/60 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-muted transition hover:-translate-y-0.5 hover:border-accent hover:text-accent"
          >
            Sign in
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button
            type="button"
            className="rounded-full border-2 border-foreground/60 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-muted transition hover:-translate-y-0.5 hover:border-accent hover:text-accent"
          >
            Sign up
          </button>
        </SignUpButton>
      </SignedOut>
      <SignedIn>
        <UserButton
          appearance={{
            elements: {
              avatarBox: 'h-8 w-8 rounded-full border-2 border-foreground/60',
            },
          }}
        />
      </SignedIn>
    </div>
  );
}
