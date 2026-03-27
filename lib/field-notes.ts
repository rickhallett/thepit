import fs from 'fs';
import path from 'path';

export type FieldNote = {
  slug: string;
  title: string;
  date: string;
  tags: string[];
  body: string;
};

const NOTES_DIR = path.join(process.cwd(), 'docs', 'field-notes');

function parseNote(filename: string, raw: string): FieldNote {
  const slug = filename.replace(/\.md$/, '');

  // Title: first # heading, falling back to slug
  const titleMatch = raw.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : slug;

  // Date: **Date:** YYYY-MM-DD, or Date: YYYY-MM-DD, or from filename prefix
  const dateMatch =
    raw.match(/\*\*Date:\*\*\s*([\d]{4}-[\d]{2}-[\d]{2})/) ||
    raw.match(/^Date:\s*([\d]{4}-[\d]{2}-[\d]{2})/m) ||
    filename.match(/^([\d]{4}-[\d]{2}-[\d]{2})/);
  const date = dateMatch ? dateMatch[1] : '';

  // Tags: any **Tag:** or **Layer refs:** or **Subject:** lines collapsed into tags
  const tags: string[] = [];
  const tagPatterns = [
    /\*\*Observer:\*\*\s*(.+)/,
    /\*\*Subject:\*\*\s*(.+)/,
    /\*\*Layer refs:\*\*\s*(.+)/,
  ];
  for (const pat of tagPatterns) {
    const m = raw.match(pat);
    if (m) tags.push(m[1].trim());
  }

  // Body: full text, strip the first heading to avoid double-rendering title
  const body = raw.replace(/^#[^#].*\n/, '').trim();

  return { slug, title, date, tags, body };
}

export function getAllFieldNotes(): FieldNote[] {
  if (!fs.existsSync(NOTES_DIR)) return [];

  const files = fs
    .readdirSync(NOTES_DIR)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .reverse(); // newest first (relies on YYYY-MM-DD prefix)

  return files.map((f) => {
    const raw = fs.readFileSync(path.join(NOTES_DIR, f), 'utf-8');
    return parseNote(f, raw);
  });
}
