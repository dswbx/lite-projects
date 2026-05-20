### 2026-05-20T13:21Z — `lite db reset` does not apply declarative `schema_paths` [major]

- **expected:** `lite db reset` replays migrations and applies `supabase/schemas/schema.sql` per README ("replay migrations + seed" and "Migrations and declarative schemas coexist").
- **actual:** After `lite db reset`, only auth + migration metadata tables exist. `lite db schema --diff` still shows `+ categories`, `+ monthly_budgets`, `+ expenses` as pending.
- **workaround:** `lite migration diff --execute --force` applies the diff; tables then appear and API works.
- **versions:** `@supabase/lite@0.2.1-next.2`, driver `sqlite-postgres` in `config.toml`

```toml
[db.migrations]
schema_paths = ["./schemas/schema.sql"]
```

```bash
$ ./node_modules/.bin/lite db reset
Database reset.

$ ./node_modules/.bin/lite db query "select name from sqlite_master where type='table' order by name"
# rows: auth.*, supabase_migrations.* only — no categories

$ ./node_modules/.bin/lite db schema --diff
Tables:
+ categories
+ monthly_budgets
+ expenses
```

- **doc consulted:** `node_modules/@supabase/lite/README.md` — Migrations section, `lite db reset` help text
- **tried:** `lite db reset` only; then `migration diff --execute --force` (success)

---

### 2026-05-20T13:19Z — `lite init` config.toml missing migration/schema wiring [minor]

- **expected:** `lite init` scaffolds a config that matches README minimal example (`[db.migrations] schema_paths`, `[auth] jwt_secret`, etc.).
- **actual:** Generated `supabase/config.toml` was only:

```toml
[db]
driver = "sqlite-postgres"
url = "file:./supabase/.temp/data.db"

[auth]
enabled = true
```

- **workaround:** Manually added `[api]`, `[db.migrations]`, `[db.seed]`, and full `[auth]` block from README.
- **versions:** `@supabase/lite@0.2.1-next.2`

---

### 2026-05-20T13:22Z — `migration diff --execute` SQL omits RLS policies from declarative schema [minor]

- **expected:** Applied migration includes RLS enable + policies from `schema.sql`, or docs clarify policies are applied separately.
- **actual:** `supabase/.temp/migrations/20260520152247.sql` contains CREATE TABLE + indexes only; no `ENABLE ROW LEVEL SECURITY` or `CREATE POLICY` statements. RLS still enforced at runtime (curl: user A sees rows, user B and anon see `[]`).
- **hypothesis:** SQLite driver applies policies from declarative schema cache, not from emitted migration file — undocumented for operators inspecting `.temp/migrations/*.sql`.
- **versions:** `@supabase/lite@0.2.1-next.2`

```sql
-- tail of emitted migration: tables + indexes only, no policies
CREATE TABLE categories (...);
CREATE TABLE monthly_budgets (...);
CREATE TABLE expenses (...);
```

- **repro:** `lite migration diff --execute --force`, inspect `supabase/.temp/migrations/*.sql`, compare to `supabase/schemas/schema.sql` RLS section.

---

### 2026-05-20T13:19Z — Vite 8 peer dependency mismatch [minor]

- **expected:** Clean install with project's vite version.
- **actual:** npm warn on install:

```
npm warn peerOptional vite@"^5.0.0 || ^6.0.0 || ^7.0.0" from @supabase/lite@0.2.1-next.2
npm warn Found: vite@8.0.13
```

- **workaround:** Proceeded; Vite plugin and dev server worked on vite@8.
- **versions:** `@supabase/lite@0.2.1-next.2`, `vite@8.0.13`
