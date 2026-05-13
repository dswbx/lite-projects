- model: opus47
- stack: vite + react + ts + tailwind v4 + bun + lite-supa
- started: 2026-05-13T15:34Z
- ended: 2026-05-13T17:53Z (re-tested twice against refreshed canaries)

### 2026-05-13T15:35Z — inspected lite-supa tarball
- ran `tar -tzf lite-supa-0.4.0.tgz` and read `package/package.json`
- confirmed exports include `lite-supa/vite` plugin
- inspected `dist/cli/index.js` for migration commands: `migration new`, `migration up`, `migration list`, `migration diff`
- found config option `[db.migrations].migration_paths` (default `./migrations/*.sql` for postgres-family drivers, `./sqlite-migrations/*.sql` for sqlite)
- assumption: prompt says "use supabase migrations utils (not declarative schema)" => skip `schema_paths`, only set `migration_paths`, write versioned migration files, and rely on `migration up` (called by `lite dev`/plugin on boot, or via CLI)

### 2026-05-13T15:36Z — fetched lite README
- `gh api repos/supabase/lite/contents/README.md`
- reason: confirm vite plugin usage, config.toml shape, and supabase-js client pattern
- noted README's Scope line ("Only declarative schema (SQL DDL) is supported — no imperative migrations (yet)") conflicts with the prompt; however the actual 0.4.0 CLI ships `lite migration new/up/list/diff` and `migration_paths` config, so imperative migrations are in fact available. Logged this README/feature mismatch in friction.md.

### 2026-05-13T15:38Z — scaffolded vite + react + ts + tailwind v4 + lite-supa
- bypassed `bun create vite` and wrote `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/` by hand to keep deps tight
- `lite-supa` installed from local tarball via `file:` protocol
- vite plugin: `supalite()` from `lite-supa/vite`
- env: `.env` with `VITE_SUPABASE_URL=http://localhost:5173` so the supabase-js client hits the same vite dev server (auth + rest + app on one port)

### 2026-05-13T15:40Z — wrote `supabase/migrations/20260513150000_init_bookmarks.sql`
- `folders(id, user_id -> auth.users, name, created_at)` + `bookmarks(id, user_id, folder_id -> folders, title, url, description, created_at)`
- enable RLS on both tables + 8 policies (`select/insert/update/delete`) gated by `auth.uid() = user_id`, scoped `to authenticated`
- relied on `gen_random_uuid()` (Supabase parity); supalite translated it to a uuidv4 source on SQLite without issue

### 2026-05-13T15:42Z — first `bunx lite migration up` failed: missing `bcryptjs`
- ran `bun add bcryptjs hono itty-router uuid` after grepping `dist/index.js` for bare imports
- second failure: `unable to open database file` (no `supabase/.temp/` dir)
- workaround: `mkdir -p supabase/.temp` before invoking lite
- both filed in friction.md

### 2026-05-13T15:44Z — first signup failed: `no such table: auth.users`
- imperative migrations don't bootstrap auth.* tables — the vite plugin only runs the declarative `ensureSchema` path which (a) tries to drop our user tables and (b) is the only thing that knows about `baseSchema`
- workaround: captured `getAuthSchemaSql()` output via a one-line `bun -e "..."` script and saved it as `supabase/migrations/00000000000001_auth_schema.sql` (all `IF NOT EXISTS`, runs first by timestamp)
- filed [blocker] in friction.md

### 2026-05-13T15:45Z — RLS was bypassed: anon could SELECT user data
- discovered via `curl 'http://localhost:5173/rest/v1/bookmarks?select=*' -H 'apikey: local-anon-key'` (no Authorization) returning rows
- root cause: `[ AUTH ] policies: 0` — the running server never parsed our migration DDL for policy info; that only happens for `schema_paths` files
- workaround: set `schema_paths = ["./migrations/*.sql"]` in `config.toml` so the vite plugin re-parses the same migration files at boot. After this, `[ AUTH ] policies: 8` and the curl above returns `[]`.
- re-tested with two users + an anon caller; isolation confirmed.
- filed [blocker] in friction.md

### 2026-05-13T15:48Z — wrote React UI
- `src/App.tsx` switches between `Auth` and `Dashboard` on `supabase.auth.onAuthStateChange`
- `src/Auth.tsx` email+password sign-in / sign-up (toggle)
- `src/Dashboard.tsx` left rail of folders (with All bookmarks / Unfiled / per-folder, counts on each), main area with search box (title or URL, client-side filter over the already-RLS-filtered server response), add-bookmark modal, per-bookmark folder dropdown + delete, folder rename/delete
- styling: Tailwind v4 via `@tailwindcss/vite`, single `@import "tailwindcss";` in `src/index.css`

### 2026-05-13T15:55Z — end-to-end smoke
- `bun dev` boots in ~200ms after the migration step
- signup + sign-in + folder insert + bookmark insert + cross-user RLS isolation all verified via curl
- UI loads, search filters live, folder CRUD works

### 2026-05-13T15:58Z — wrote README aimed at non-technical users
- bun-first instructions, copy-pasteable, no jargon
- ended: 2026-05-13T15:58Z

### 2026-05-13T17:40Z — retest against refreshed canary tarball
- human refreshed `/Users/dennis/Documents/conductor/workspaces/lite/lite-172-pg-migrations/app/lite-supa-0.4.0.tgz` (mtime 2026-05-13T19:36 local) addressing the prior frictions; asked us to re-verify.
- procedure: removed each workaround one at a time and observed which were still needed. Each toggle was followed by `rm -rf node_modules supabase/.temp bun.lock && bun install && bun dev` plus a curl-based RLS smoke test (signup two users, insert as one, verify the other and anon see `[]`).
- result:
  - dropped manual `bun add bcryptjs hono itty-router uuid` (lite-supa now declares `bcryptjs` + `uuid` in `dependencies`; `hono` pulled transitively; `itty-router` unreferenced at runtime for our paths)
  - dropped `predev: "mkdir -p supabase/.temp"` (parent dir auto-created)
  - deleted `supabase/migrations/00000000000001_auth_schema.sql` (vite plugin now bootstraps `auth.*` on its own; first signup works without the hand-pasted base schema)
  - kept `schema_paths = ["./migrations/*.sql"]` in `[db.migrations]` (still the only way to get RLS policies loaded into the running server; without it, anon can read user rows — verified)
- friction.md updated with one `[partial-resolved]` correction entry referencing the four prior timestamps. wins.md unchanged.

### 2026-05-13T17:45Z — final smoke against refreshed canary
- `bun install` → 206 packages, no manual extras
- `bun dev` boots in ~1.3s, prints `[ DATA ] tables: 9 / [ AUTH ] enabled: ✓ / tables: 2 / policies: 8`
- two-user + anon RLS isolation curl test passes
- one cosmetic carryover: `Migration error: DataLossError` line still printed on every healthy boot for the migration-tracking tables; doesn't actually drop anything

### 2026-05-13T17:52Z — second retest against newer canary
- human refreshed the tarball again at the same path (mtime 2026-05-13T19:50 local) and corrected my prior false alarm: `hono` and `itty-router` only appear inside JSDoc comments in `dist/index.js` / `dist/cli/index.js`, not as real top-level imports. My earlier `grep -oE "from '...'"` was matching ` * import { X } from 'y'` lines inside doc comment blocks. Re-grepped with `^import` anchored and confirmed: real bare imports are only kysely, bcryptjs, uuid, @supabase/supabase-js, pgsql-parser, all of which are now declared.
- dropped `schema_paths = ["./migrations/*.sql"]` from `supabase/config.toml`, retested.
- `bun dev` cold boot: `[ AUTH ] policies: 8` straight from `migration_paths`, no `Migration error: DataLossError` line on either first or second boot. Two-user + anon RLS isolation test passes.
- friction.md updated with a `[resolved]` entry referencing 2026-05-13T15:45Z and the cosmetic carryover. All five frictions originally filed are now resolved against the canary.
- ended: 2026-05-13T17:53Z
