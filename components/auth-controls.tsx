'use client';

import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from '@clerk/nextjs';

import { cn } from '@/lib/cn';
import { useCopy } from '@/lib/copy-client';

/** Icon for the subscription menu item inside the UserButton dropdown. */
function SubscriptionIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: '1em', height: '1em' }}
    >
      <path d="M2 10h20" />
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M6 16h.01" />
      <path d="M10 16h4" />
    </svg>
  );
}

/** Auth controls with sign-in/up buttons (signed out) or UserButton with subscription link (signed in). */
export function AuthControls({ className }: { className?: string }) {
  const c = useCopy();
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <SignedOut>
        <SignInButton mode="modal">
          <button
            type="button"
            className="rounded-full border-2 border-foreground/60 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-muted transition hover:-translate-y-0.5 hover:border-accent hover:text-accent"
          >
            {c.authControls.signIn}
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button
            type="button"
            className="rounded-full border-2 border-foreground/60 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-muted transition hover:-translate-y-0.5 hover:border-accent hover:text-accent"
          >
            {c.authControls.signUp}
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
        >
          <UserButton.MenuItems>
            <UserButton.Link
              label={c.authControls.manageSubscription}
              labelIcon={<SubscriptionIcon />}
              href="/arena#upgrade"
            />
          </UserButton.MenuItems>
        </UserButton>
      </SignedIn>
    </div>
  );
}
