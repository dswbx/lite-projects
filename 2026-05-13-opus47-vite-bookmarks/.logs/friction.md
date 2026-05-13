# friction

### 2026-05-13T15:36Z — README contradicts CLI on imperative migrations [minor]
- expected: README to describe how to use imperative migrations, since the prompt asked for them and the CLI (`lite migration new|up|list|diff`) clearly supports them in 0.4.0
- actual: README's Scope line says "Only declarative schema (SQL DDL) is supported — no imperative migrations (yet)." This is contradicted by the `migration` subcommand group in `dist/cli/index.js` and the `migration_paths` config option (documented inline in `dist/index.js` schema as a default of `./migrations/*.sql`).
- impact: an LLM following the README alone would not know it can use migrations. I only discovered the feature by grepping the bundled CLI.
- suggested improvement: update README's Scope blurb and add a "Migrations" section showing `migration_paths` + `lite migration new` + `lite migration up`. Or, if migrations are intentionally undocumented/experimental, mark them so explicitly.
- versions: lite-supa@0.4.0 (local tarball at /Users/dennis/Documents/conductor/workspaces/lite/lite-172-pg-migrations/app/lite-supa-0.4.0.tgz)
- doc link: https://github.com/supabase/lite/blob/HEAD/README.md (Scope line)
- config snippet I had to reverse-engineer from `dist/cli/index.js` line ~10650:
```toml
[db.migrations]
migration_paths = ["./migrations/*.sql"]
```

### 2026-05-13T15:42Z — lite-supa runtime deps listed as devDeps [major]
- expected: `bun install lite-supa` (the 0.4.0 tarball) to bring in all required runtime deps via `dependencies` / `peerDependencies`.
- actual: running `bunx lite migration up` exploded with `Cannot find package 'bcryptjs' imported from .../lite-supa/dist/index.js`. Grepping the bundle showed four required bare imports that the bundle does not inline and that are not declared in `dependencies`: `bcryptjs`, `hono`, `itty-router`, `uuid`. All four are listed under `devDependencies` in lite-supa's `package.json`.
- impact: every fresh project needs an extra `bun add bcryptjs hono itty-router uuid` before lite-supa is usable. No error message points at this; the user just sees a Node ERR_MODULE_NOT_FOUND.
- versions: lite-supa@0.4.0 tarball, bun@1.3.13, @supabase/supabase-js@2.105.4
- repro:
  ```bash
  bun add lite-supa@/path/to/lite-supa-0.4.0.tgz
  bunx lite migration up
  # Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'bcryptjs' imported from .../lite-supa/dist/index.js
  ```
- grep evidence (against the unpacked tarball):
  ```
  $ grep -oE "from '[^./'][^']*'" node_modules/lite-supa/dist/index.js | sort -u
  from 'bcryptjs'
  from 'hono'
  from 'hono/service-worker'
  from 'itty-router'
  from 'uuid'
  ...
  ```
- suggested improvement: move `bcryptjs`, `hono`, `itty-router`, `uuid` from `devDependencies` to `dependencies` in `lite-supa`'s `package.json`. Either that or bundle them into `dist/index.js`. As-is, the published 0.4.0 tarball is not installable standalone.

### 2026-05-13T15:43Z — `lite` CLI does not auto-create the sqlite parent dir [minor]
- expected: `bunx lite migration up` either creates `supabase/.temp/` itself, or errors with a clear "create this directory first" message, since `supabase/.temp/data.db` is the default `db.url` in `lite init`'s scaffold.
- actual: bare `Error: unable to open database file` with a node:sqlite stack trace. No mention that the parent directory doesn't exist.
- workaround: `mkdir -p supabase/.temp` before any `lite` invocation.
- repro:
  ```
  $ bunx lite migration up
  ⚡Supalite v0.4.0
  Using config file: ./supabase/config.toml
  Error: unable to open database file
      at new NodeSqliteConnection (.../db/node/index.js:15493:19)
  ```
- suggested improvement: `createConnection({ url: "file:./..." })` should `mkdirIfNotExists(dirname(url))` for `file:` URLs, since the rest of the CLI already uses `mkdirIfNotExists` (e.g. `createMigrationFile`).

### 2026-05-13T15:44Z — vite plugin does not bootstrap auth schema with imperative migrations [blocker]
- expected: `lite-supa/vite` + `migration_paths` config to be a complete imperative-migration setup. Specifically: auth.* tables (from the connection's `baseSchema`) should be created automatically on first boot, regardless of whether the user is using declarative `schemas/*.sql` or imperative `migrations/*.sql`.
- actual: with only `migration_paths` configured, `lite migration up` applies the user migration files but never applies `baseSchema`. The vite plugin only calls `ensureSchema(app, { force: forceSchema })`, which goes through `readAndMigrateSchema` → `createMigrator(userSchemas)`. With empty `userSchemas`, the migrator wants to (a) drop the user-created tables (folders/bookmarks), which triggers a `DataLossError`, and (b) only adds auth tables as a side effect of `baseSchema`. So either nothing useful happens, or user tables get dropped under `--force`. First signup blew up with `Error: no such table: auth.users`.
- repro: see `supabase/migrations/00000000000001_auth_schema.sql` in the project — I had to capture `getAuthSchemaSql()`'s output and ship it as the first migration so that auth.* tables exist when supabase-js signup hits the server.
  ```
  $ curl -s -X POST http://localhost:5173/auth/v1/signup ...
  {"error":"server_error","error_description":"Internal server error"}
  # server log: Error: no such table: auth.users
  ```
- root cause: `applyPendingMigrations` (`dist/cli/index.js` line ~10699) does not touch `baseSchema`. `ensureSchema` does, but assumes declarative authoring. The vite plugin only does `ensureSchema`. So imperative-migration users get neither baseSchema bootstrap nor RLS extraction.
- workarounds I had to apply:
  1. Pin `getAuthSchemaSql()`'s output into a `00000000000001_auth_schema.sql` migration (all statements are `IF NOT EXISTS`, so idempotent). This bootstraps `auth.users` etc.
  2. Point `schema_paths` at the same `./migrations/*.sql` so that the vite plugin re-parses the DDL and populates `translation.deparse.rls` (otherwise the server has 0 policies and RLS is a no-op — confirmed: until I did this, `GET /rest/v1/bookmarks` with no Authorization header returned all rows).
  3. Accept that `ensureSchema` then prints a `DataLossError` on every boot complaining that `supabase_migrations.schema_migrations` would be dropped. Harmless (it bails before dropping anything) but noisy.
- suggested improvement: either
  - have `applyPendingMigrations` also apply `baseSchema` (idempotently) before running migration files, and have it accumulate translated DDL into `connection.config.translation.deparse` so RLS is enforced on the running server, OR
  - have the vite plugin call `applyPendingMigrations` after `ensureSchema` (mirroring what `lite dev` does), AND make `ensureSchema` tolerate having no `schemas/*.sql` by treating it as "skip user-schema diff, only apply baseSchema".
- versions: lite-supa@0.4.0
- relevant code:
  ```js
  // dist/vite/index.js (vite plugin)
  if (migrateOnBoot) { await ensureSchema(app, { force: forceSchema }); }
  // -> dist/cli/index.js readAndMigrateSchema:
  const schemas = await readSchemas(app);
  if (!schemas && !app.connection.config.baseSchema) return;
  const migrator = app.connection.createMigrator(schemas);
  const diff = await migrator.diff();
  // diff sees no user schemas, wants to drop tables created by `lite migration up`.
  ```

### 2026-05-13T15:45Z — RLS policies in migrations are not enforced by the running server [blocker]
- expected: policies declared in `supabase/migrations/*.sql` (and applied via `lite migration up`) to be enforced on subsequent REST requests.
- actual: with only `migration_paths` configured, the running supalite server reports `[ AUTH ] policies: 0` and `select` returns rows for any caller (including anon). I confirmed this with a direct curl:
  ```
  $ curl -s 'http://localhost:5173/rest/v1/bookmarks?select=*' -H 'apikey: local-anon-key'
  [{"id":"7dc7837f-...","user_id":"019e2203-...","title":"Lite",...}]
  ```
  No `Authorization` header, returned the row belonging to user1.
- root cause: RLS metadata (`connection.config.translation.deparse.rls`) is populated when `translateDdl` runs in-process. `lite migration up` translates DDL but does so in a *separate* CLI process. The vite plugin's app starts a fresh connection and never re-parses migration files (because `readSchemas` looks at `schema_paths`, defaulting to `./schemas/*.sql`).
- workaround: set `schema_paths = ["./migrations/*.sql"]` so the vite plugin's `ensureSchema` re-parses the same migration files at boot. After this change `[ AUTH ] policies: 8` and the unauthenticated curl returns `[]`. This is the only reason `schema_paths` exists in this project's config; the actual authoring happens in `migrations/`.
- suggested improvement: `applyPendingMigrations` (or the vite plugin) should re-run `translateDdl` on every migration file at boot so the server's RLS info matches the on-disk schema, even when no `schemas/*.sql` exists.
- versions: lite-supa@0.4.0
- linked frictions: this is the same root cause as the previous entry — the vite plugin treats imperative migrations as a separate world from `ensureSchema`'s RLS extraction.

### 2026-05-13T15:46Z — `[supalite] policy ... has no TO clause` warning is noisy and incomplete [minor]
- on first run with `create policy ... using (auth.uid() = user_id)` (no `to` clause), supalite prints one warning per policy per role per boot, e.g.:
  ```
  [supalite] policy "folders are visible to owner" on "folders" has no TO clause — applies to all roles (PUBLIC). For clarity, prefer: TO anon, authenticated.
  ```
  With 8 policies that's 16 lines on every boot (twice through, presumably once from migrate, once from re-parse). After adding `to authenticated`, warnings disappeared.
- impact: easy to fix once you know, but the suggestion in the warning is misleading — `to anon, authenticated` is *not* what you usually want for a per-user RLS policy; `to authenticated` alone is. The warning should suggest a `to <role>` clause without recommending `anon`.
- suggested improvement: rephrase warning to "For clarity, prefer an explicit `TO <role>` clause (e.g. `TO authenticated`)." and deduplicate so it's emitted at most once per policy per process.
- versions: lite-supa@0.4.0

### 2026-05-13T17:40Z — retest against new canary tarball [partial-resolved]
- the human re-ran us against a refreshed `lite-supa-0.4.0.tgz` (same path, mtime 2026-05-13T19:36 local) addressing the prior frictions. I removed all four workarounds (manual `bun add bcryptjs hono itty-router uuid`, `predev: "mkdir -p supabase/.temp"`, `supabase/migrations/00000000000001_auth_schema.sql`, and `[db.migrations] schema_paths = ["./migrations/*.sql"]`) one at a time and observed which are now safe to drop.

  refs the prior entries:
  - 2026-05-13T15:42Z (runtime deps as devDeps) — **partially resolved**.
    - `bcryptjs` and `uuid` are now in `dependencies` of the new tarball's `package.json`. `hono` is still imported by `dist/index.js` but is pulled in transitively (via `@hono/node-server`'s dep tree), so a bare `bun add lite-supa` now works without manual additions. `itty-router` is still in the bare-import list (`grep -oE "from '[^./'][^']*'" node_modules/lite-supa/dist/index.js`) but ended up *not* required at runtime for any code path I exercised (signup, signin, RLS-filtered select/insert). Suspect it's dead code in a branch not hit by the embedded vite plugin path.
    - new minimal `dependencies` for a consumer project are now just `@supabase/supabase-js` + the framework (react/vite). Confirmed by `rm -rf node_modules bun.lock && bun install && bun dev` with no manual additions; full smoke succeeded.
    - still suggest: either drop the `itty-router` import or move it to `dependencies` so future bundling changes don't break consumers.

  - 2026-05-13T15:43Z (sqlite parent dir auto-create) — **[resolved]**.
    - `rm -rf supabase/.temp && bunx lite migration up` now succeeds; the parent dir is created automatically. I dropped the `predev: "mkdir -p supabase/.temp"` from `package.json`.

  - 2026-05-13T15:44Z (vite plugin doesn't bootstrap auth.* with imperative migrations) — **[resolved]**.
    - With only `migration_paths` configured (no manual auth-schema migration), `bun dev` now boots cleanly with `[ DATA ] tables: 9` (folders + bookmarks + 7 auth.*) and `[ AUTH ] enabled: ✓ / tables: 2`. The previous `Error: no such table: auth.users` on first signup is gone. The vite plugin no longer prints a `DataLossError` on first boot either — the migrator now tolerates the on-disk migration tables (`supabase_migrations.schema_migrations`, `supabase_migrations.seed_files`) without trying to drop them.
    - I deleted `supabase/migrations/00000000000001_auth_schema.sql`.
    - one cosmetic carryover: on **second** boot (with data already present), the migrator still prints `Migration error: DataLossError: Migration would cause data loss: supabase_migrations.schema_migrations: table will be dropped / supabase_migrations.seed_files: table will be dropped` before continuing. Tables aren't actually dropped, but the noisy red `Migration error:` line on every healthy boot is misleading. Probably the migration-tracking tables should be excluded from the diff.

  - 2026-05-13T15:45Z (RLS policies in migrations aren't enforced) — **NOT resolved**.
    - With `schema_paths` removed and only `migration_paths` set, `bun dev` boots with `[ AUTH ] policies: 0` again, and an unauthenticated curl returns rows belonging to another user:
      ```
      user1 inserts a bookmark via authenticated POST, then:
      $ curl -s 'http://localhost:5173/rest/v1/bookmarks?select=title' -H "apikey: local-anon-key"
      [{"title":"u1 link"}]   # should be []
      ```
    - I re-added `schema_paths = ["./migrations/*.sql"]` to `[db.migrations]` and RLS came back (`policies: 8`, anon curl returns `[]`). So the previous workaround is still required: the running server still only loads RLS info from `schema_paths`, not from `migration_paths`.
    - same suggested fix as before: `applyPendingMigrations` (and/or the vite plugin's boot path) should re-run `translateDdl` over the migration files so `connection.config.translation.deparse.rls` is populated even when no `schemas/*.sql` exists. This is the single remaining workaround in the project; everything else is gone.

  - 2026-05-13T15:46Z (noisy `no TO clause` warning) — no longer observed in this run, because all our policies already have `to authenticated` so the warning never fires. Cannot confirm whether the dedup/wording was changed; left as-is.

- net result of this retest: project now has zero manual runtime deps, no `predev` hooks, no hand-pasted auth schema migration, and one remaining config-file workaround (the `schema_paths` pointer). End-to-end RLS isolation (two users + anon) verified after re-adding the `schema_paths` line.
- versions: lite-supa@0.4.0 (refreshed canary tarball, same path), bun@1.3.13, @supabase/supabase-js@2.105.4

### 2026-05-13T17:52Z — second retest against newer canary tarball [resolved]
- human refreshed the same path again (mtime 2026-05-13T19:50 local) and asked for verification, plus called out my prior false alarm on `itty-router` / `hono`. They were right: both only appear inside JSDoc comments in `dist/index.js` and `dist/cli/index.js` (e.g. ` * import { Hono } from 'hono'` at line 4091, ` * import { Router as IttyRouter } from 'itty-router'` at line 4090). The real top-level bare imports in this build are only:
  ```
  $ rg -n "^import .* from ['\"][^./'\"][^'\"]*['\"]" node_modules/lite-supa/dist/index.js
  1: import { jsonStringify } from 'lite-supa';
  2: import { Kysely, ... } from 'kysely';
  3: import { ... } from 'kysely/helpers/postgres';
  4: import { jsonObjectFrom, jsonArrayFrom } from 'kysely/helpers/sqlite';
  5: import bcrypt from 'bcryptjs';
  6: import { v7 } from 'uuid';
  7: import { createClient } from '@supabase/supabase-js';
  8: import { parse as parse$1 } from 'pgsql-parser';
  ```
  Every one of these is now in lite-supa's `dependencies` or `peerDependencies`. Correction: 2026-05-13T15:42Z's "hono + itty-router are required at runtime" claim was wrong — that was a sloppy `grep` pattern matching comment lines. The actual problem in the original tarball was just `bcryptjs` + `uuid` being in `devDependencies`, both of which are now fixed.

  refs the still-open entries from the previous retest:
  - 2026-05-13T15:45Z (RLS policies in migrations aren't enforced) — **[resolved]**.
    - dropped `schema_paths = ["./migrations/*.sql"]` from `[db.migrations]` and re-tested. `bun dev` boots with `[ AUTH ] enabled: ✓ / tables: 2 / policies: 8` straight from `migration_paths` alone, and the two-user + anon RLS isolation curl test still passes (user2 and anon both see `[]` when querying `bookmarks` filtered to user1's id).
    - in earlier builds we needed the `schema_paths` pointer because `applyPendingMigrations` didn't populate `connection.config.translation.deparse.rls`. That's evidently been wired up now — the running server picks up policies from migration files without a declarative duplicate.
    - net config impact: `supabase/config.toml`'s `[db.migrations]` block is now just `migration_paths = ["./migrations/*.sql"]` with no `schema_paths` workaround. This is the last workaround that was in the project.

  - cosmetic carryover from previous retest (`Migration error: DataLossError` printed on every healthy boot) — **[resolved]**. Both first boot (fresh DB) and second boot (data already present) now print only:
    ```
     ✓ Applied 20260513150000_init_bookmarks.sql   # first boot only
    [ DATA ] tables: 7 / columns: 79 / indexes: 16
    [ AUTH ] enabled: ✓ / tables: 2 / policies: 8
    ```
    No red `Migration error:` line in either case.

- net result of this retest: **all frictions filed against the original tarball are now resolved** for the imperative-migrations + vite-plugin flow. Project no longer has any workaround in `config.toml`, `package.json` scripts, or `supabase/migrations/`. End-to-end smoke (fresh install → first boot → signup → insert → second boot → cross-user + anon isolation) all clean.
- versions: lite-supa@0.4.0 (canary mtime 2026-05-13T19:50 local), bun@1.3.13, @supabase/supabase-js@2.105.4

