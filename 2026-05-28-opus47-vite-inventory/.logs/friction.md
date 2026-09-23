### 2026-06-18T00:30Z — `lite upgrade --target local` rewrites config.toml + starts Docker stack BEFORE checking the `postgres` driver, then fails half-way [major]

Surfaced while validating the `supalite-upgrade-test` skill on this project (upgrade lane, `@supabase/lite@0.5.0`).

- expected: `lite upgrade --target local` either bundles/declares the driver it needs, or fails its readiness/rehearsal phase (which both passed) before mutating the project or starting Docker.
- actual: the in-memory pglite rehearsal passed, then the command rewrote `supabase/config.toml` in place (stripping the supalite `[db].driver`/`[db].url`), started the local Supabase Docker stack, and only THEN tried to apply the schema with the `postgres` npm driver — which is not installed — and aborted on the first DDL statement. This leaves the project in a half-migrated state: `config.toml` already rewritten (so `bun run dev`/supalite is broken until restored) and a Supabase stack left running, even though no schema was applied.

```
◇  Local Supabase is running at http://127.0.0.1:49402

Your project's supabase/config.toml was rewritten in place for the local Supabase CLI. The original was backed up to supabase/config.toml.bak. ...
■  Error: Failed SQL (schema 1/6): Error: Driver 'postgres' selected but 'postgres' is not installed. Run: bun add postgres
│  CREATE TABLE items (
│     id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
│     ...
■  Canceled
```

- workaround (matches UPGRADE.md "rerun cleanly"): `bun add postgres`, then `bunx supabase@2.98.1 stop --workdir . --no-backup`, `rm -rf supabase/.branches supabase/.temp`, and rerun `bunx lite upgrade --target local --force --no-migrate-sessions`. Second run completed and the same e2e suite passed 7/7 against the upgraded stack.
- suggestion: treat `postgres` as a real dependency of the local-upgrade path (declare it / install on demand), OR add a readiness check for the selected driver that runs BEFORE rewriting `config.toml` and starting Docker. The driver requirement is knowable up front; discovering it after the destructive/side-effecting steps is the painful part.
- versions: @supabase/lite@0.5.0, bun 1.3.13, supabase CLI 2.98.1 (via `bunx supabase@2.98.1`), Docker running. `postgres@3.4.9` after the fix.
- note: `postgres@3.4.9` was added to `package.json` dependencies to complete the upgrade. It is only needed for the local-upgrade path, not for supalite dev — flagged here so the human can decide whether to keep it in this run's manifest.

### 2026-09-23T11:32Z — after bump 0.10.1-next.6 → 0.10.1-next.7, dev boot prints `Migration error: cannot INSERT into generated column "confirmed_at"` on every start [major]

Surfaced while re-running the `supalite-upgrade-test` skill on this project (full baseline + upgraded re-run at `0.10.1-next.7`).

- context: `supabase/.temp/data.db` was created by an earlier `@supabase/lite` version (last used at `0.10.1-next.6`, created at `0.5.0` or earlier). Only change: `bun add @supabase/lite@0.10.1-next.7 --exact`.
- expected: the internal `auth.users` table migration either succeeds or fails the boot loudly.
- actual: the internal migration fails, the error is printed, and the dev server starts anyway. The same error is printed on every boot (checked on two boots in a row). `/auth/v1/health` returns 200.
- observed impact: at this version, `POST /auth/v1/signup` and `POST /auth/v1/token?grant_type=password` still returned 200 on the stale DB, so auth was not visibly broken. But the `auth.users` table stays on the old shape with a failed migration each boot, and nothing tells the user to reset.

```
$ bun run dev -- --port 5231 --strictPort
$ vite --port "5231" --strictPort
Failed to execute statement: INSERT INTO "_auth.users_migrate_new" ("id", "aud", "role", "email", "encrypted_password", "phone", "email_confirmed_at", "confirmed_at", "invited_at", ... "last_sign_in_at", "created_at", "updated_at")
                  SELECT "id", "aud", "role", "email", "encrypted_password", "phone", "email_confirmed_at", "confirmed_at", ... FROM "auth.users";
Migration error: Error: cannot INSERT into generated column "confirmed_at"

[ DATA ] tables: 7 / columns: 93 / indexes: 32
[ AUTH ] enabled: ✓ / tables: 1 / policies: 4
  VITE v8.0.14  ready in 563 ms
```

- workaround: stop dev, `bunx lite db reset --hard`, boot again. Next boot was clean (`Migration written to supabase/.temp/migrations/20260923133246.sql`, `+ items`, `policies: 4`). This wipes local users/data.
- suggestion: the table-rebuild copy for `auth.users` should exclude generated columns (`confirmed_at`) from the INSERT column list. If a migration of internal tables fails, fail the boot (or print a clear "run `lite db reset --hard`" hint) instead of continuing.
- versions: @supabase/lite@0.10.1-next.7, bun 1.3.13, vite 8.0.14, macOS.

### 2026-09-23T11:32Z — `lite db reset --hard` warns that declarative schema + RLS are "gone", but the Vite plugin re-applies them on next boot [minor]

- command and output:

```
$ bunx lite db reset --hard
 ➜ removed supabase/.temp/data.db

Declarative schemas detected with pending changes.
The reset database reflects the migrations only — schema changes that were never diffed, including RLS policies, are gone.
Run `lite db diff -f <name>` to capture them as a migration, then re-run `lite db reset`.
Database reset.
```

- actual: the next `bun run dev` (Vite plugin, `[db.migrations] schema_paths = ["./schemas/schema.sql"]`) re-applied the declarative schema automatically: `+ items`, `policies: 4`. Nothing was lost.
- why it matters: the message tells the user to run `lite db diff -f <name>`. In a Vite-plugin project that step is not needed for dev, and (see next entry) it breaks the next dev boot.
- suggestion: when the project uses `schema_paths`, say that the schema is re-applied on the next `lite dev` / Vite plugin boot, instead of "gone".
- versions: @supabase/lite@0.10.1-next.7.

### 2026-09-23T11:33Z — `lite db diff -f prepare_upgrade` (required before `lite upgrade` for declarative-only projects) breaks the next supalite dev boot: `table items already exists` [major]

- context: this project is declarative-only (`supabase/schemas/schema.sql`, no `supabase/migrations/`). At `0.5.0` (2026-06-18 run) `lite upgrade` worked on it directly. At `0.10.1-next.7` the dry-run refuses:

```
$ bunx lite upgrade --dry-run
■  Error: `lite upgrade` requires recorded PostgreSQL migration history or pending migration files. Run `lite db diff -f prepare_upgrade`, review the migration, then retry.
```

- followed the hint (also in UPGRADE.md "Migration requirement"):

```
$ bunx lite db diff -f prepare_upgrade
 ➜ Wrote migration supabase/migrations/20260923113319_prepare_upgrade.sql
```

  The file contains the full `CREATE TABLE "public"."items" ...`, FK, `ENABLE ROW LEVEL SECURITY`, and the 4 policies. After this, `lite upgrade --dry-run` and `lite upgrade --target local` both passed.

- problem: the migration is left `[pending]` in the local DB, even though the DB already has the `items` table from the declarative apply. The next supalite dev boot tries to apply it and crashes:

```
$ bunx lite migration list
Migrations in ./migrations:
  [pending] 20260923113319_prepare_upgrade.sql

$ bun run dev -- --port 5231 --strictPort
Failed to execute statement: CREATE TABLE items (
  id TEXT DEFAULT (lower(hex(randomblob(4))) || ...) PRIMARY KEY CHECK (...),
  user_id TEXT NOT NULL CONSTRAINT items_user_id_fkey REFERENCES "auth.users" (id) ON DELETE CASCADE ...,
  ...
) STRICT
error when starting dev server:
Error: table items already exists
    at l.exec (.../node_modules/@supabase/lite/dist/db/node/index.js:11:1527)
    at l.transaction (.../node_modules/@supabase/lite/dist/index.js:750:5190)
    at async Iu (.../node_modules/@supabase/lite/dist/cli/lib.js:102:2165)
    at async E (.../node_modules/@supabase/lite/dist/vite/index.js:12:3800)
    at async BasicMinimalPluginContext.configureServer (.../node_modules/@supabase/lite/dist/vite/index.js:12:4733)
  code: 'ERR_SQLITE_ERROR', errcode: 1, errstr: 'SQL logic error'
error: script "dev" exited with code 1
```

- there is no `lite migration repair` (subcommands: `new`, `up`, `list`) to mark it as applied. The only options are `lite db reset` (wipes the local users and data that the upgrade is meant to migrate) or deleting the migration file.
- workaround used: deleted `supabase/migrations/` after the upgrade run, so the project stays declarative-only. Dev boot and baseline e2e were green again. A future upgrade re-run must regenerate it.
- suggestion: `lite db diff -f` should record the new migration as applied when the local DB already matches it (like `supabase db diff` + `migration repair`), or `lite upgrade` should build the migration from `schemas/*.sql` itself for declarative-only projects. At least document the dev-boot crash and the fix in UPGRADE.md.
- versions: @supabase/lite@0.10.1-next.7, bun 1.3.13.

### 2026-09-23T11:36Z — re: 2026-06-18T00:30Z — `postgres` driver still discovered only after the Docker stack starts, at 0.10.1-next.7 [major]

Correction/update for the 2026-06-18T00:30Z entry. Retested on purpose (moved `node_modules/postgres` aside for one run, restored after).

- still reproduces at `0.10.1-next.7`. Readiness and the pglite rehearsal pass, the local Supabase stack starts, then the first real SQL fails:

```
$ bunx lite upgrade --target local --local-dir /tmp/inv-upgrade2 --force --no-migrate-sessions
Ready to upgrade.
Rehearsing upgrade against in-memory pglite...
Rehearsal (in-memory pglite)
  auth schema: 23 stmts  user migrations: 8 stmts  auth: 60 inserts  data: 10 inserts
  rehearsal passed
■  Error: Failed SQL (20260923113319_prepare_upgrade.sql (8 statements)): Error: Driver 'postgres' selected but 'postgres' is not installed. Run: bun add postgres
│  CREATE SCHEMA IF NOT EXISTS "auth";
│  CREATE TABLE "public"."items" (...);
│  ...
exit code 1
```

- change since 0.5.0: with `--local-dir`, `supabase/config.toml` is not touched, so the project is not left half-broken. The Docker stack is still left running and must be stopped by hand (`bunx supabase@2.98.1 stop --workdir <dir> --no-backup`).
- `postgres` is still an optional peer dependency of `@supabase/lite` (`peerDependenciesMeta.postgres.optional = true`), and `lite upgrade --dry-run` does not check for it.
- suggestion unchanged: check for the driver in readiness, before starting Docker.
- `postgres@3.4.9` stays in this project's `dependencies` (added in the 2026-06-18 run) because `lite upgrade --target local` needs it.

### 2026-09-23T11:34Z — readiness report shows `public.items: 0 rows`, then migrates 5 rows [minor]

- `lite upgrade --dry-run` and `lite upgrade --target local` readiness both print:

```
Readiness Report
  db reachable: yes  migration statements: 8  migration bytes: 1145
  auth — users: 8  sessions: 7  identities: 8  refresh_tokens: 7  jwt_secret: set
  tables:
    ...
    public.items: 0 rows
...
Rehearsal (in-memory pglite)
  auth schema: 23 stmts  user migrations: 8 stmts  auth: 30 inserts  data: 5 inserts
...
◇  Migrating public.items (5 rows)
```

- expected: readiness row count matches what gets migrated (5; rows left by the baseline e2e run).
- hypothesis: the readiness count runs under RLS (the `items` policies are `TO authenticated USING (user_id = auth.uid())`), so it sees 0 rows. A user could think "no data to migrate".
- versions: @supabase/lite@0.10.1-next.7.
