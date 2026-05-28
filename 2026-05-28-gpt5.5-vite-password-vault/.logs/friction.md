# Friction

### 2026-05-28T07:02Z - Postgres `trim()` in schema CHECK constraint blocks Lite migration [major]
- expected: the Vite plugin would translate and apply a simple Postgres DDL schema containing `CHECK (length(trim(site_name)) > 0)` and `CHECK (length(trim(username)) > 0)`.
- actual: `@supabase/lite` rejected the schema during Vite startup with `Migration error: Error: Function call "btrim" not supported`, leaving the app database with zero user tables.
- impact: a common validation expression for non-blank text prevented the app schema from applying. The generated app had to weaken the database constraint to `length(site_name) > 0` and `length(username) > 0` so the Lite migration could complete.
- versions: `@supabase/lite@0.3.1-next.1`, `@supabase/supabase-js@2.106.2`, `vite@8.0.14`, `npm@10.9.7`; Bun was unavailable in this cloud environment.
- public package docs consulted: `node_modules/@supabase/lite/README.md` says schemas are written as Postgres DDL and translated for SQLite; `node_modules/@supabase/lite/STATUS.md` documents the Postgres-to-SQLite translation layer but did not list `trim()` or `btrim()` in the visible supported/unsupported type sections I used.
- offending schema before fix:

```sql
CREATE TABLE IF NOT EXISTS vault_entries (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  site_name TEXT NOT NULL CHECK (length(trim(site_name)) > 0),
  username TEXT NOT NULL CHECK (length(trim(username)) > 0),
  password_ciphertext TEXT NOT NULL CHECK (length(password_ciphertext) > 0),
  password_iv TEXT NOT NULL CHECK (length(password_iv) > 0),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

- command run:

```bash
npm run dev -- --host 127.0.0.1
```

- full relevant output:

```text
> gpt55-password-vault@0.0.0 dev
> vite --host 127.0.0.1

Using config file: ././supabase/config.toml
 ➜ Database located at file:./supabase/.temp/data.db
Migration error: Error: Function call "btrim" not supported

[ DATA ] tables: 0 / columns: 0 / indexes: 0
[ AUTH ] enabled: ✓ / tables: 0 / policies: 0

  VITE v8.0.14  ready in 372 ms

  ➜  Local:   http://127.0.0.1:5173/
  ➜  press h + enter to show help
Watching for changes...
```
