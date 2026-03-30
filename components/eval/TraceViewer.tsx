// Collapsible trace viewer for request/response messages (M3.4).
'use client';

import type { TraceMessage } from '@/db/schema';

type TraceViewerProps = {
  requestMessages: TraceMessage[];
  responseContent: string | null;
};

const roleLabelColors: Record<string, string> = {
  system: 'text-purple-400',
  user: 'text-blue-400',
  assistant: 'text-green-400',
};

export function TraceViewer({
  requestMessages,
  responseContent,
}: TraceViewerProps) {
  return (
    <div className="space-y-2">
      <details className="group">
        <summary className="cursor-pointer text-xs uppercase tracking-[0.3em] text-muted transition hover:text-foreground">
          Request Messages ({requestMessages.length})
        </summary>
        <div className="mt-2 space-y-2">
          {requestMessages.map((msg, idx) => (
            <div
              key={idx}
              className="rounded border border-foreground/10 p-3"
            >
              <p
                className={`mb-1 text-[10px] uppercase tracking-[0.2em] ${
                  roleLabelColors[msg.role] ?? 'text-foreground/50'
                }`}
              >
                {msg.role}
              </p>
              <pre className="whitespace-pre-wrap text-sm text-foreground/70">
                {msg.content}
              </pre>
            </div>
          ))}
        </div>
      </details>

      <details className="group" open>
        <summary className="cursor-pointer text-xs uppercase tracking-[0.3em] text-muted transition hover:text-foreground">
          Response
        </summary>
        <div className="mt-2 rounded border border-foreground/10 p-3">
          <pre className="whitespace-pre-wrap text-sm text-foreground/70">
            {responseContent ?? '(no response)'}
          </pre>
        </div>
      </details>
    </div>
  );
}
