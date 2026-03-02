# db

Database schema, connection, and Drizzle configuration.

## Files

- `schema.ts` — all table definitions (12 tables, 4 enums)
- `index.ts` — Neon serverless Pool connection + Drizzle instance export

## Rule

Schema is the source of truth. One file, all tables.
Domain libraries import from `db` to run queries.
No business logic in this directory.
