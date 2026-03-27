import { getAllFieldNotes } from '@/lib/field-notes';

export const metadata = {
  title: 'Devlog — The Pit',
  description:
    'Lab notes from inside the build. Observations, failures, decisions, and things that worked. Appended as they happen.',
};

function formatDate(iso: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

// Minimal markdown → text renderer: preserves structure without a full parser.
// Handles headings, bold, inline code, code blocks, and lists.
function renderBody(md: string): React.ReactNode[] {
  const lines = md.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      nodes.push(
        <pre
          key={i}
          className="my-3 overflow-x-auto rounded border border-foreground/10 bg-foreground/5 p-3 text-xs text-foreground/80"
        >
          {lang && <span className="mb-1 block text-foreground/40">{lang}</span>}
          <code>{codeLines.join('\n')}</code>
        </pre>,
      );
      i++;
      continue;
    }

    // H2
    if (line.startsWith('## ')) {
      nodes.push(
        <h2 key={i} className="mb-1 mt-5 text-sm font-semibold uppercase tracking-wider text-foreground/60">
          {line.slice(3)}
        </h2>,
      );
      i++;
      continue;
    }

    // H3
    if (line.startsWith('### ')) {
      nodes.push(
        <h3 key={i} className="mb-1 mt-4 text-sm font-medium text-foreground/80">
          {line.slice(4)}
        </h3>,
      );
      i++;
      continue;
    }

    // Blank line
    if (line.trim() === '') {
      i++;
      continue;
    }

    // List item
    if (line.startsWith('- ') || line.match(/^[\*\+] /)) {
      const items: string[] = [];
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].match(/^[\*\+] /))) {
        items.push(lines[i].slice(2));
        i++;
      }
      nodes.push(
        <ul key={i} className="my-2 space-y-0.5 pl-4">
          {items.map((item, j) => (
            <li key={j} className="list-disc text-sm text-foreground/80">
              {inlineFormat(item)}
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    // Paragraph
    nodes.push(
      <p key={i} className="my-2 text-sm leading-relaxed text-foreground/80">
        {inlineFormat(line)}
      </p>,
    );
    i++;
  }

  return nodes;
}

// Handle **bold** and `code` inline
function inlineFormat(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="rounded bg-foreground/10 px-1 py-0.5 font-mono text-xs text-foreground/90">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

export default function DevlogPage() {
  const notes = getAllFieldNotes();

  return (
    <main className="mx-auto max-w-3xl px-4 py-12" id="main-content">
      {/* Header */}
      <div className="mb-10 border-b border-foreground/10 pb-8">
        <p className="mb-2 text-xs uppercase tracking-widest text-foreground/40">Lab Notes</p>
        <h1 className="mb-3 text-2xl font-semibold text-foreground">Devlog</h1>
        <p className="text-sm leading-relaxed text-foreground/60">
          Observations, decisions, and failures appended as they happen. Not polished retrospectives —
          notes from inside the work.
        </p>
      </div>

      {/* Notes */}
      {notes.length === 0 ? (
        <p className="text-sm text-foreground/40">No notes yet.</p>
      ) : (
        <div className="space-y-12">
          {notes.map((note) => (
            <article
              key={note.slug}
              className="border-b border-foreground/10 pb-10 last:border-0"
              id={note.slug}
            >
              {/* Date + title */}
              <div className="mb-4">
                {note.date && (
                  <time className="mb-1 block text-xs text-foreground/40" dateTime={note.date}>
                    {formatDate(note.date)}
                  </time>
                )}
                <h2 className="text-base font-semibold text-foreground">{note.title}</h2>
                {note.tags.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {note.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded border border-foreground/10 px-1.5 py-0.5 font-mono text-xs text-foreground/40"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Body */}
              <div>{renderBody(note.body)}</div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
