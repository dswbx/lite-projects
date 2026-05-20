### 2026-05-20T13:21Z — `lite db reset` does not apply declarative `schema_paths` [major]

- **expected:** `lite db reset` replays migrations and applies `supabase/schemas/schema.sql` per README ("replay migrations + seed" and "Migrations and declarative schemas coexist").
- **actual:** After `lite db reset`, only auth + migration metadata tables exist. `lite db schema --diff` still shows `+ categories`, `+ monthly_budgets`, `+ expenses` as pending.
- **workaround (invalid):** `lite migration diff --execute --force` writes SQLite DDL to `supabase/.temp/migrations/`, not Postgres DDL to `supabase/migrations/` — `db reset` does not replay it. See 2026-05-20T16:00Z correction.
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

### 2026-05-20T15:10Z — retest with pkg.pr.new build 206 (refs 2026-05-20T13:21Z) [major]

- **canary:** `https://pkg.pr.new/@supabase/lite@206` via `npm install … --legacy-peer-deps` (bun failed: dependency loop)
- **installed:** `@supabase/lite@0.0.1` (pkg tarball version field; CLI reports `Supalite v0.0.1`)
- **expected (if fixed):** `lite db reset` applies `schema_paths` or replays generated migrations so app tables exist afterward
- **actual:** Same as before. After reset, only auth + `supabase_migrations.*` tables; `lite db schema --diff` still lists `+ categories`, `+ monthly_budgets`, `+ expenses`
- **new behavior in 206:** reset prints guidance when declarative schema is pending:

```text
Declarative schemas detected with pending changes.
Run `lite db diff -f <name>` to generate a migration, then re-run `lite db reset`.
```

- **suggested path blocked:** `lite db diff -f canary206-retest` fails on this project:

```text
Error: Driver 'pglite' selected but '@electric-sql/pglite' is not installed.
```

(config has `driver = "sqlite-postgres"`; `lite migration diff --execute --force` still works and writes to `supabase/.temp/migrations/`)

- **after `migration diff --execute --force`:** app tables present; then `lite db reset` removes them again (`categories`/`expenses`/`monthly_budgets` query returns empty) and schema diff is pending again
- **conclusion:** not resolved on build 206; `migration diff --execute --force` is not a valid workaround (see 2026-05-20T16:00Z)

```bash
# fresh data.db
$ lite db reset
# warning printed; tables: auth.*, supabase_migrations.* only

$ lite db schema --diff
# + categories, + monthly_budgets, + expenses
```

### 2026-05-20T16:00Z — retest build 206 updated (force reinstall); reframe + partial fix (refs 2026-05-20T13:21Z) [major]

- **canary:** `https://pkg.pr.new/@supabase/lite@206` force-reinstalled (`npm install … --force --legacy-peer-deps`); tarball `last-modified` 2026-05-20 ~15:45 GMT
- **pglite bundled:** confirmed — `@supabase/lite@0.0.1` now depends on `@electric-sql/pglite@0.4.5` (no manual install). Prior `Driver 'pglite' selected but '@electric-sql/pglite' is not installed` is **unreachable** on this build.
- **reframe (per upstream parity):** `lite db reset` replays `supabase/migrations/*.sql` + seed; declarative `schema_paths` are not applied directly on reset (matches upstream: `SchemaPaths` in diff, not reset). Reset hint to run `db diff -f` first is intentional.
- **`migration diff --execute --force` is not a workaround:** writes to `supabase/.temp/migrations/` as SQLite DDL; `Ss()` reads `supabase/migrations/*.sql` for `sqlite-postgres` driver — reset never sees temp migrations.

**`db diff -f` on fresh install (full `schema.sql` with RLS):**

```bash
$ rm -f supabase/.temp/data.db supabase/migrations/*.sql
$ lite db diff -f budget_schema
■  error: role "authenticated" does not exist
```

- **cause:** `db diff -f` uses PGlite only as a **materialization layer** (`om()` → `tl()` → `pglite.exec(full declarative schema)`). `CREATE POLICY … TO authenticated` runs before `anon`/`authenticated` roles (or `auth` schema) exist in ephemeral PGlite. Runtime sqlite-postgres still applies RLS from declarative schema separately.

**`db diff -f` with table-only declarative schema (lines 3–32, no RLS):**

```bash
$ lite db diff -f budget_schema
 ➜ Wrote migration supabase/migrations/20260520155834_budget_schema.sql
```

Emitted Postgres DDL:

```sql
CREATE TABLE public.categories ( ... );
CREATE TABLE public.expenses ( ... );
CREATE TABLE public.monthly_budgets ( ... );
```

**`lite db reset` after `db diff -f`:**

```bash
$ lite db reset
 ✓ Applied 20260520155834_budget_schema.sql
Database reset.

$ lite db query "select name from ... where name in ('categories','monthly_budgets','expenses')"
# categories, expenses, monthly_budgets present
```

- **remaining gap:** projects with RLS + `auth.uid()` in `schema.sql` cannot complete `db diff -f` until PGlite materialization bootstraps roles (and likely `auth` schema) or strips policies from the materialization exec while still emitting them elsewhere.
- **conclusion:** original friction **partially reframed**, not fully resolved — reset works once a proper `supabase/migrations/` file exists; blocker moved to `db diff -f` failing on standard RLS declarative schemas.

### 2026-05-20T18:15Z — retest pkg.pr.new build 209 (refs 2026-05-20T13:21Z) [major] [resolved]

- **canary:** `https://pkg.pr.new/@supabase/lite@209` (`npm install … --force --legacy-peer-deps`)
- **`db diff -f` with full `schema.sql` (tables + RLS):** works; no `role "authenticated" does not exist`

```bash
$ lite db diff -f budget_209
 ➜ Wrote migration supabase/migrations/20260520181412_budget_209.sql
```

- **`lite db reset` on freshly emitted file:** fails — `SqlError: syntax error at or near "ALTER"` because `Em()` joins pg-delta statements with `\n\n` only (no `;`), and `Kn()` splits migrations on `;` only → entire file is one statement
- **workaround verified:** adding `;` terminators to each statement → `✓ Applied …budget_209.sql`, app tables present
- **upstream-intended flow:** `db diff -f` → `db reset` is unblocked for RLS schemas; remaining gap is semicolon emission in migration writer (filed as new friction below)
- **conclusion:** reframed friction **resolved** for the RLS/`db diff -f` blocker; reset replay needs semicolon fix (see 2026-05-20T18:15Z minor entry)

---

### 2026-05-20T18:15Z — `db diff -f` migration file missing statement semicolons (refs reset replay) [minor]

- **expected:** emitted `supabase/migrations/*.sql` is replayable by `lite db reset` / `lite migration up` without manual edits
- **actual:** statements joined with double newlines only; `Kn()` treats whole file as one statement → `syntax error at or near "ALTER"`
- **versions:** `@supabase/lite@209` (pkg.pr.new, tarball `last-modified` 2026-05-20 ~18:08 GMT)
- **workaround:** terminate each statement with `;` before reset
- **repro:** fresh `lite db diff -f` → `lite db reset` (fails); add semicolons → reset succeeds

### 2026-05-20T19:40Z — retest build 209 updated (refs 2026-05-20T18:15Z) [minor] [resolved]

- **canary:** `https://pkg.pr.new/@supabase/lite@209` force-reinstalled (`last-modified` 2026-05-20 ~19:37 GMT)
- **fix:** `Em()` now maps statements through `hx()` before join (adds `;` terminators)
- **actual:** fresh `lite db diff -f budget_209_retest` → 29 lines ending with `;`; `lite db reset` → `✓ Applied …budget_209_retest.sql`; app tables present; `npm run dev` starts without ALTER error
- **RLS spot-check:** signup + insert category + anon sees `[]`, authenticated user sees own row
- **conclusion:** resolved on build 209

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

### 2026-05-20T20:05Z — retest build 210 (refs 2026-05-20T13:19Z) [minor] [resolved]

- **canary:** `https://pkg.pr.new/@supabase/lite@210` in fresh temp dir (`lite init`)
- **actual:** `config.toml` includes `[api]`, `[db.migrations] schema_paths`, `[db.seed]`, `[auth]` with `jwt_secret`, `jwt_expiry`, `enable_signup`, `[auth.email] enable_confirmations`
- **conclusion:** resolved on build 210

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
- **note:** `migration diff --execute` is not the persistent path; use `db diff -f` instead.

### 2026-05-20T18:15Z — retest build 209: `db diff -f` emits RLS in `supabase/migrations/` (refs 2026-05-20T13:22Z) [minor] [resolved]

- **canary:** `https://pkg.pr.new/@supabase/lite@209`
- **actual:** `lite db diff -f` writes Postgres DDL to `supabase/migrations/` including:

```sql
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY categories_select_own ON public.categories FOR SELECT TO authenticated USING ((user_id = auth.uid()));
-- (12 policies total across 3 tables)
```

- **persistent path confirmed:** `supabase/migrations/*.sql` (not `.temp/migrations/`)
- **conclusion:** resolved on build 209 for the `db diff -f` workflow

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

### 2026-05-20T20:05Z — retest build 210 (refs 2026-05-20T13:19Z) [minor] [resolved]

- **canary:** `https://pkg.pr.new/@supabase/lite@210`
- **actual:** `peerDependencies.vite` is `^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0`; `npm install @supabase/lite@210 vite@8.0.13` completes with no peer warnings
- **conclusion:** resolved on build 210
