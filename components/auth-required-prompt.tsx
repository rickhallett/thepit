import Link from 'next/link';

const RESEARCH_PATH = '/research';

export function AuthRequiredPrompt({ message }: { message: string }) {
  const parts = message.split(RESEARCH_PATH);
  return (
    <div className="border-2 border-foreground/20 bg-black/30 p-8">
      <p className="text-sm text-muted">
        {parts.length === 1 ? (
          <>
            {message}{' '}
            <Link
              href={RESEARCH_PATH}
              className="text-accent underline underline-offset-4 transition hover:text-foreground"
            >
              {RESEARCH_PATH}
            </Link>
          </>
        ) : (
          parts.map((part, i) =>
            i === 0 ? (
              <span key={`auth-prompt-${i}`}>{part}</span>
            ) : (
              <span key={`auth-prompt-${i}`}>
                <Link
                  href={RESEARCH_PATH}
                  className="text-accent underline underline-offset-4 transition hover:text-foreground"
                >
                  {RESEARCH_PATH}
                </Link>
                {part}
              </span>
            ),
          )
        )}
      </p>
    </div>
  );
}
