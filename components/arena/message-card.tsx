"use client";

// MessageCard — displays a single agent turn in the bout.
// Shows agent name, colored left border, turn number, and content.
// Blinking cursor indicator during streaming.

interface MessageCardProps {
  agentName: string;
  agentColor: string;
  content: string;
  turnIndex: number;
  isStreaming?: boolean;
}

export function MessageCard({
  agentName,
  agentColor,
  content,
  turnIndex,
  isStreaming,
}: MessageCardProps) {
  return (
    <div
      data-testid="message-card"
      className="border-l-4 bg-stone-900 p-4"
      style={{ borderLeftColor: agentColor }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-sm font-bold" style={{ color: agentColor }}>
          {agentName}
        </span>
        <span className="font-mono text-xs text-stone-500">
          Turn {turnIndex + 1}
        </span>
      </div>
      <div className="whitespace-pre-wrap text-stone-200">
        {content}
        {isStreaming && (
          <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-stone-400" />
        )}
      </div>
    </div>
  );
}
