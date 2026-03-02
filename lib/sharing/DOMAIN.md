# lib/sharing

Short links for bout sharing.
Co-located tests: `*.test.ts` beside the module they test.

## Files

- `short-links.ts` — createShortLink, resolveShortLink

## Owns

- `app/api/short-links/route.ts` (thin handler)
- short_links table

## Depends on

- `db` (direct table access)
