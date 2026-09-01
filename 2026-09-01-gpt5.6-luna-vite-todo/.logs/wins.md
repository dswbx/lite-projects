# Wins

### 2026-09-01T16:55:40Z — Vite plugin booted schema and auth together
- `supalite({ admin: false })` mounted the local API inside Vite and applied the migration on dev-server start without a second process.
- why it mattered: the generated app has one obvious `bun dev` command and a same-origin client URL.
- Supalite-specific win: the package README and PATTERNS.md gave a direct Vite recipe and the per-user RLS shape used here.
- version: `@supabase/lite@0.9.0`.

### 2026-09-01T16:57:10Z — familiar Supabase client shape preserved ownership rules
- `supabase.auth.signUp`, `signInWithPassword`, `getSession`, and `from("tasks").select/insert/update/delete` worked through `@supabase/supabase-js` unchanged.
- why it mattered: the task UI could stay small and readable while row-level security remained the source of truth.
- parity win: a second signed-in user received zero rows without any special client-side filtering logic.

### 2026-09-01T17:25:40Z — additive date migration preserved existing data
- `alter table public.tasks add column due_date date;` applied on boot without rewriting or dropping existing task rows.
- why it mattered: date support could ship without a reset or account migration, and undated tasks remain valid.
- Supalite-specific win: the SQLite/Postgres translator accepted the portable `date` column and the existing RLS policies continued to protect the expanded row.
