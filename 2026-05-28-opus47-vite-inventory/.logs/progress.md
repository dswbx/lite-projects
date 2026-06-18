- model: opus47
- stack: vite + react + ts + bun + tailwind v4
- started: 2026-05-28T07:54Z
- ended: 2026-05-28T08:00Z

### 2026-05-28T07:54Z — start
- slug: 2026-05-28-opus47-vite-inventory
- pinned package: @supabase/lite@0.3.1-next.1
- plan: scaffold vite+react+ts, add tailwind v4 vite plugin, install supabase/lite, read its package contents to learn API before coding

### 2026-05-28T07:55Z — scaffold
- `bun create vite@latest app --template react-ts`, moved contents up so slug is the project root (AGENTS layout rule)
- `bun install`; added `tailwindcss`, `@tailwindcss/vite`; pinned `@supabase/lite@0.3.1-next.1`; added `@supabase/supabase-js`
- versions: bun 1.3.11, vite 8.0.14, react 19.2.6, tailwindcss 4.3.0, @supabase/lite 0.3.1-next.1, @supabase/supabase-js 2.106.2

### 2026-05-28T07:56Z — read package
- read `node_modules/@supabase/lite/README.md` and `STATUS.md`
- decisions:
  - use the `@supabase/lite/vite` plugin so dev is one process (`bun dev`)
  - use `@supabase/supabase-js` against the plugin's mounted `/auth/v1` + `/rest/v1` (relative URL via `window.location.origin`)
  - schema in `supabase/schemas/schema.sql`; RLS enforced via `auth.uid()`
- assumed: SQLite driver default is fine (`sqlite-postgres` per scaffold); deferred OAuth/email confirm (disabled by default in scaffold)

### 2026-05-28T07:57Z — schema + app
- ran `bunx lite init` to scaffold `supabase/`
- wrote `items` table with `user_id REFERENCES auth.users(id)`, RLS policies for SELECT/INSERT/UPDATE/DELETE bound to `auth.uid()`
- wired vite config with `tailwindcss()` and `supalite()` plugins
- built Auth screen (email/password sign-in + sign-up) and Inventory screen (add/edit/delete/filter by category & location)
- `index.css` is just `@import "tailwindcss";` (v4 plugin handles the rest)

### 2026-05-28T07:58Z — smoke test
- started `bun dev`, hit `/`, `/auth/v1/health`, `/rest/v1/items` → all 200
- end-to-end via curl: signup → got JWT + user.id → POST item with `user_id` → 201 with row → GET items returns the row
- first attempt without `user_id` in the payload: RLS rejected (`PGRST301 new row violates row-level security policy`). expected — the policy requires the inserted row's user_id to match `auth.uid()`. client already sends `user_id` from `session.user.id`.

### 2026-05-28T07:59Z — build
- `bun run build` (tsc -b && vite build) clean: 61 modules, 401 kB JS, 14.5 kB CSS, no TS errors

### 2026-05-28T08:00Z — done
- README written for non-technical users; index.html title set; scaffold leftovers removed
- no @supabase/lite frictions to log this run; everything documented worked first try

### 2026-06-18T00:00Z — meta: add e2e + upgrade-verification suite (skill validation)
- not part of the original run; this project was chosen as the next validation target for the `supalite-upgrade-test` skill (after `2026-05-29-composer25-vite-event-planner`)
- bumped `@supabase/lite` 0.3.1-next.1 → 0.5.0 (latest stable, ships `lite upgrade`; installs cleanly with bun) — human-approved version choice; `0.3.1-next.1` predates the upgrade command
- added Playwright e2e (`e2e/`, `playwright.config.ts`, `test:e2e` script) covering auth (signup/signin/signout), items CRUD (insert/select/update/delete), client-side category+location filters, and RLS cross-user isolation; coverage map in `e2e/COVERAGE.md`
- made `vite.config.ts` skip the embedded supalite plugin when `VITE_SUPABASE_URL` is set; `src/supabase.ts` was already env-configurable (`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` with `window.location.origin` fallback), so it was left unchanged
- baseline e2e vs supalite (Vite plugin, no env vars): 7/7 green
- outcome: ok

### 2026-06-18T00:30Z — local upgrade + re-run SAME suite
- `bunx lite upgrade --dry-run`: readiness + in-memory pglite rehearsal passed
- `bunx lite upgrade --target local --force --no-migrate-sessions`: first attempt failed on the missing `postgres` npm driver after it had already rewritten `config.toml` and started the Docker stack (see friction.md) — installed `postgres`, stopped the stack, removed `supabase/.branches`/`.temp`, reran → upgrade complete; local Supabase at `http://127.0.0.1:49713`
- re-ran the SAME suite with `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` pointing at the upgraded stack: 7/7 green
- green-green (supalite 7/7, upgraded Supabase 7/7) — upgrade preserved behavior
- teardown: `supabase stop --no-backup`, removed `.branches`/`.temp`/`supabase-credentials.json`/`config.toml.bak`, `git checkout supabase/config.toml`; re-confirmed supalite baseline 7/7 green
- outcome: ok
