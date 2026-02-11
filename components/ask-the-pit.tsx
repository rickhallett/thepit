'use client';

import { useCallback, useRef, useState } from 'react';

type Message = {
  id: number;
  role: 'user' | 'assistant';
  content: string;
};

let nextMessageId = 0;

export function AskThePit({ enabled }: { enabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }, 50);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = input.trim();
      if (!trimmed || streaming) return;

      const userMessage: Message = { id: nextMessageId++, role: 'user', content: trimmed };
      setMessages((prev) => [...prev, userMessage]);
      setInput('');
      setStreaming(true);
      scrollToBottom();

      try {
        const res = await fetch('/api/ask-the-pit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: trimmed }),
        });

        if (!res.ok) {
          const text = await res.text();
          setMessages((prev) => [
            ...prev,
            { id: nextMessageId++, role: 'assistant', content: `Error: ${text}` },
          ]);
          setStreaming(false);
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) {
          setMessages((prev) => [
            ...prev,
            { id: nextMessageId++, role: 'assistant', content: 'No response stream.' },
          ]);
          setStreaming(false);
          return;
        }

        const decoder = new TextDecoder();
        let assistantContent = '';
        const assistantId = nextMessageId++;

        setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          assistantContent += chunk;

          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              id: assistantId,
              role: 'assistant',
              content: assistantContent,
            };
            return updated;
          });
          scrollToBottom();
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          { id: nextMessageId++, role: 'assistant', content: 'Failed to connect.' },
        ]);
      } finally {
        setStreaming(false);
      }
    },
    [input, streaming, scrollToBottom],
  );

  if (!enabled) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full border-2 border-accent bg-background text-accent shadow-lg transition hover:bg-accent hover:text-background"
        aria-label="Ask The Pit"
      >
        ?
      </button>

      {open && (
        <div className="fixed bottom-20 right-6 z-50 flex h-[420px] w-[340px] flex-col overflow-hidden rounded-lg border-2 border-foreground/60 bg-background shadow-2xl">
          <div className="border-b-2 border-foreground/40 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.3em] text-accent">
              Ask The Pit
            </p>
          </div>

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 py-3"
          >
            {messages.length === 0 && (
              <p className="text-xs text-muted">
                Ask anything about The Pit.
              </p>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`mb-3 text-sm ${
                  msg.role === 'user'
                    ? 'text-foreground'
                    : 'text-muted'
                }`}
              >
                <span className="text-[10px] uppercase tracking-[0.2em] text-accent">
                  {msg.role === 'user' ? 'You' : 'Pit'}
                </span>
                <p className="mt-1 whitespace-pre-wrap">{msg.content}</p>
              </div>
            ))}
            {streaming && messages[messages.length - 1]?.content === '' && (
              <p className="text-xs text-muted animate-pulse">Thinking...</p>
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            className="border-t-2 border-foreground/40 px-4 py-3"
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question..."
                className="flex-1 border-2 border-foreground/40 bg-transparent px-3 py-2 text-xs text-foreground placeholder:text-muted/60 focus:border-accent focus:outline-none"
                disabled={streaming}
              />
              <button
                type="submit"
                disabled={streaming || !input.trim()}
                className="border-2 border-accent px-3 py-2 text-xs uppercase tracking-[0.2em] text-accent transition hover:bg-accent hover:text-background disabled:opacity-40"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
