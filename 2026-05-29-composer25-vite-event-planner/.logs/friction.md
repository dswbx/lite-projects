### 2026-06-10T00:00Z — `lite upgrade` rehearsal aborts: `function auth.uid() does not exist` for per-user RLS policies [blocker]

Discovered while adding an e2e + upgrade-verification suite to this project (upgrade attempted with `lite upgrade --target local`). The upgrade never reaches the target: the mandatory in-memory PGlite **rehearsal** fails when it applies the user schema's RLS policies, because `auth.uid()` is not defined in the rehearsal database. There is no flag to skip rehearsal, so this blocks the entire upgrade for any app using the canonical per-user RLS pattern (`using (auth.uid() = user_id)`), which is the pattern the package's own `PATTERNS.md` recommends.

- expected: `lite upgrade` rehearses and applies the schema; `auth.uid()` resolves like in real Supabase.
- actual: rehearsal aborts on the first RLS policy that calls `auth.uid()`; upgrade aborts.
- versions: reproduced on **both** `@supabase/lite@0.3.1-next.3` (the project pin) and `@supabase/lite@0.4.0` (npm `latest`). bun 1.3.13, macOS (darwin 25.5.0), Docker 29.5.3 running.

#### Repro

```bash
cd 2026-05-29-composer25-vite-event-planner
bun install
# materialize the local sqlite db (vite plugin applies schema on dev start)
bun run dev &   # wait ~8s, then kill
bunx lite upgrade --dry-run         # or: bunx lite upgrade --target local --force --no-migrate-sessions
```

#### Output (0.4.0, `--dry-run`)

```
Readiness Report
  db reachable: yes  schema statements: 14  schema bytes: 2017
  ...
Ready to upgrade.

SQLite Shim Audit
  fields: 9  passed: 9  warned: 0  failed: 0
  shim audit passed

Rehearsing upgrade against in-memory pglite...

Rehearsal (in-memory pglite)
  auth schema: 19 stmts  user schema: 14 stmts  auth: 0 inserts  data: 0 inserts
  1 failure(s):
    ✗ [schema] schema 3/14
      create policy "events_select_own"
  on events
  for select
  to authenticated
  using (auth.uid() = user_id)
      error: function auth.uid() does not exist
  rehearsal failed
```

On the real (non-dry-run) `--target local` invocation the same rehearsal failure ends with: `Error: Rehearsal failed. Upgrade aborted.` — the local Supabase stack is never started.

#### Offending schema (this project, `supabase/schemas/schema.sql`)

```sql
create policy "events_select_own"
  on events
  for select
  to authenticated
  using (auth.uid() = user_id);
```

(Every table in this app — `events`, `guests` — uses `auth.uid()` in its policies. Same for the per-user pattern in `node_modules/@supabase/lite/PATTERNS.md`.)

#### Root cause (from installed package source)

- The **live** supalite RLS engine never creates a real `auth.uid()` SQL function. `dist/cli/lib.js` / `dist/cli/index.js` translate `auth.uid()` / `auth.jwt()` / `auth.role()` into placeholders (`{{auth.uid}}`, …) and `dist/db/postgres/{PostgresConnection,pglite/PgliteConnection}.js` substitute the JWT claim (`request.jwt.claim.sub`, etc.) at query time.
- The **upgrade rehearsal** instead applies the raw user-schema SQL (with literal `auth.uid()`) to a vanilla PGlite that has the `auth` rows/roles bootstrapped ("auth schema: 19 stmts", roles `anon`/`authenticated`/`service_role`) but **not** the Supabase `auth.*()` helper functions (`auth.uid()`, `auth.role()`, `auth.jwt()`, `auth.email()`).
- Real Supabase defines those functions (shipped by GoTrue/platform migrations), so the policies would apply fine against the actual target. The gap is purely in the rehearsal harness: it must create the `auth.*()` helper functions before applying the user schema.

#### What I tried, in order

1. `bunx lite upgrade --dry-run` on `0.3.1-next.3` → rehearsal failed on `auth.uid()`.
2. `bunx lite upgrade --target local --force --no-migrate-sessions` on `0.3.1-next.3` → `Error: Rehearsal failed. Upgrade aborted.`
3. Bumped to `@supabase/lite@0.4.0` (latest), re-seeded the sqlite db, re-ran `--dry-run` → identical `function auth.uid() does not exist`.
4. Checked `bunx lite upgrade --help` for an escape hatch → no `--skip-rehearsal` / `--no-rehearsal` option exists.

#### Impact

Blocks the documented upgrade path (UPGRADE.md "Testing the Upgrade Path") for realistic supalite apps: any project that uses RLS with `auth.uid()` (the recommended multi-tenant pattern) cannot run `lite upgrade` at all on current published versions.

#### Suggested fix (for the package, not a user workaround)

Have the rehearsal bootstrap the Supabase `auth` helper functions (`auth.uid()`, `auth.role()`, `auth.jwt()`, `auth.email()`) into the PGlite rehearsal database before applying the user schema, mirroring what the real target provides. (Do not ask users to add a `create function auth.uid()` stub to their app schema — that hard-codes a workaround that outlives the fix.)

---

### 2026-06-10T01:00Z — [resolved] rehearsal `auth.uid()` blocker fixed on canary build @236

Corrects the `2026-06-10T00:00Z` blocker above. Re-tested with the canary `https://pkg.pr.new/supabase-community/lite/@supabase/lite@236` (CLI banner reports `v0.0.1`). The rehearsal now passes for the same unchanged schema:

```
Rehearsing upgrade against in-memory pglite...
Rehearsal (in-memory pglite)
  auth schema: 19 stmts  user schema: 14 stmts  auth: 0 inserts  data: 0 inserts
  rehearsal passed
```

The full `lite upgrade --target local --force --no-migrate-sessions` then completed (after two further issues below), and the same Playwright e2e suite passed 7/7 against both Supalite and the upgraded local Supabase. Marking the `auth.uid()` rehearsal blocker resolved as of canary @236.

---

### 2026-06-10T01:10Z — `lite upgrade --target local` crashes under node: `Cannot find package 'bun'` [major]

After the rehearsal passes, the local-target path immediately throws before/while starting the Supabase CLI stack:

```
■  Error: Cannot find package 'bun' imported from
   .../node_modules/@supabase/lite/dist/cli/index.js
◒  Starting local Supabase in <project>
■  Canceled
```

- versions: canary @236 (`v0.0.1`), bun 1.3.13, Supabase CLI `2.98.1` (via `bunx supabase@2.98.1`), Docker 29.5.3.
- cause: `dist/cli/index.js` does a bare `import ... from 'bun'` on the local-target code path. That specifier only resolves under the **bun** runtime. Invoking the CLI via `bunx lite ...` executed the bin under **node** (its shebang), so the import failed.
- workaround that worked: force the bun runtime explicitly —
  ```bash
  bun --bun node_modules/@supabase/lite/dist/cli/index.js upgrade --target local --force --no-migrate-sessions
  ```
- why it's a friction: the documented invocation in UPGRADE.md is plain `lite upgrade --target local ...`, with no mention that the bin must run under bun. A node user (or anyone whose `lite` bin runs under node) hits a hard crash with no hint that the fix is the runtime. Either the CLI should avoid a hard `import 'bun'` on a path reachable by node, lazy-load it, or the bin/docs should require bun for the local target.

---

### 2026-06-10T01:20Z — local upgrade schema-apply needs the `postgres` npm driver, not auto-installed [minor]

With the bun runtime forced, the stack starts (`Local Supabase is running at http://127.0.0.1:NNNNN`) but applying the schema to the target Postgres fails on statement 1/14:

```
■  Error: Failed SQL (schema 1/14): Error: Driver 'postgres' selected but 'postgres' is not installed. Run: bun add postgres
   create table events ( ... )
```

- fix (per the error): install the `postgres` package (`postgres@3.4.9`). After installing it, the upgrade applied all 14 statements and completed.
- friction: `postgres` is a required peer for the `--target local` apply step but isn't a dependency of `@supabase/lite` nor mentioned in UPGRADE.md's prerequisites. The error message is clear and actionable (good), so severity is minor — but a one-line "local target requires the `postgres` driver" note in UPGRADE.md / readiness checks would save a failed run. Ideally the readiness check (which runs *before* starting Docker) should detect the missing driver instead of failing after the stack is up.

---

### 2026-06-10T01:30Z — canary `pkg.pr.new` URL cannot be installed with Bun (dependency loop) [major]

The pinned canary `https://pkg.pr.new/supabase-community/lite/@supabase/lite@236` cannot be added with Bun:

```
$ bun add https://pkg.pr.new/supabase-community/lite/@supabase/lite@236
error: Package "@supabase/lite@https://pkg.pr.new/..." has a dependency loop
  Resolution: "@supabase/lite@0.4.0"
  Dependency: "@supabase/lite@https://pkg.pr.new/..."
error: An internal error occurred (DependencyLoop)
```

- workaround: `npm install "https://pkg.pr.new/supabase-community/lite/@supabase/lite@236"` succeeded (installs as version `0.0.1`). Per repo AGENTS.md pinned-version rule, switched this project to npm for canary + `postgres` installs (a `package-lock.json` now exists alongside `bun.lock`).
- impact: a bun-first project that pins a `pkg.pr.new` canary of `@supabase/lite` can't `bun install` / `bun add`; must use npm. Bun resolves the URL spec back to an existing registry version (`0.4.0`) and reports a self-dependency loop. Likely the canary tarball's `package.json` lists `@supabase/lite` (itself) somewhere bun follows. Worth confirming the published canary manifest doesn't self-reference.

### 2026-06-10T02:40Z — [resolved] pkg.pr.new + bun handled by AGENTS.md rule (not a per-run friction)

Corrects `2026-06-10T01:30Z`. This is a stable, known Bun limitation rather than a one-off bug to fix in `@supabase/lite`, so it's now captured as harness guidance instead: `AGENTS.md` → "Pinned package versions" instructs that any `pkg.pr.new` `@supabase/lite` pin must be installed with `npm` (skip `bun add`), delete the stale `bun.lock`, and switch the README / Playwright `webServer` to npm. No package fix tracked; closing this friction.

---

### 2026-06-10T01:40Z — `lite upgrade --target local` rewrites the project's `config.toml` in place (breaks supalite dev) [minor]

Running `lite upgrade --target local` with the default workdir (the project dir) overwrites `supabase/config.toml`: it drops the supalite keys `[db].driver = "sqlite-postgres"` and `[db].url`, repoints `[api].port`/`[db].port` to the Supabase CLI ports, and adds `[studio]`/`[realtime]`/`[storage]`/`[edge_runtime]`/`[analytics]`/`[db.pooler]` sections. After the upgrade, `bun run dev` (the supalite Vite plugin) no longer has a `sqlite-postgres` driver to use — local supalite dev is broken until `config.toml` is restored.

- this is partly documented (UPGRADE.md: "initializes or updates `./supabase/config.toml` in the project being upgraded"), so it's expected behavior, but it's destructive for a *verification* workflow where you want to keep running supalite afterward.
- mitigation for a non-destructive verify loop: run with `--local-dir <tmp>` so the Supabase CLI workdir/config lives elsewhere, or back up `config.toml` before the upgrade and restore it after. (I restored via `git checkout supabase/config.toml` and confirmed supalite dev + the e2e baseline work again.)
- severity minor because it's documented and recoverable, but a louder warning ("this will overwrite your config.toml; use --local-dir to avoid") would help.
