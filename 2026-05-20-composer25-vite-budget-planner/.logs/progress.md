- model: composer25
- stack: vite-react-ts
- started: 2026-05-20T13:18:00Z
- ended: 2026-05-20T15:12:00Z

### 2026-05-20T13:18Z — read harness rules
- read: `AGENTS.md`, `CLAUDE.md` (missed on first pass; reorganizing into slug + logs after user feedback)
- assumed: slug `2026-05-20-composer25-vite-budget-planner`, stack vite+react+ts; npm for install (deviation from default Bun — see below)
- outcome: ok

### 2026-05-20T13:18Z — inspect @supabase/lite (public only)
- ran `npm view @supabase/lite@0.2.1-next.2 --json`
- read: `node_modules/@supabase/lite/README.md`, `package.json`, `STATUS.md` (RLS section)
- read: `node_modules/@supabase/lite/dist/vite/index.d.ts` (`SupaliteOptions`)
- assumed: Vite plugin + declarative schema in `supabase/schemas/schema.sql` + `@supabase/supabase-js` client
- outcome: ok

### 2026-05-20T13:19Z — scaffold project (initially at repo root — wrong layout)
- ran `npm init -y` and `npm install @supabase/lite@0.2.1-next.2 @supabase/supabase-js react react-dom vite @vitejs/plugin-react typescript @types/react @types/react-dom`
- note: peer warning — vite@8 vs @supabase/lite peer `^5 || ^6 || ^7`
- ran `./node_modules/.bin/lite init` → created `supabase/config.toml`, `supabase/schemas/schema.sql`
- outcome: ok (layout corrected later)

### 2026-05-20T13:20Z — schema + app
- wrote Postgres DDL + RLS in `supabase/schemas/schema.sql` (categories, monthly_budgets, expenses)
- expanded `supabase/config.toml` (api, migrations schema_paths, auth jwt)
- wired `vite.config.ts` with `@supabase/lite/vite` plugin (`migrateOnBoot`, `watchSchema`)
- built React UI: auth, category CRUD, monthly budgets, expense log, current-month dashboard
- outcome: ok

### 2026-05-20T13:21Z — dev server + schema apply
- ran `npm run dev` (vite + supalite plugin on :5173)
- first API test: `Could not find the table 'categories' in the schema cache` — declarative schema not yet applied to existing DB
- ran `./node_modules/.bin/lite db schema --diff` — showed pending tables
- ran `./node_modules/.bin/lite migration diff --execute --force` — applied tables
- restarted vite; curl tests: auth, insert, RLS isolation, budgets, expenses, FK embed `categories(name)` — all ok
- outcome: ok after manual migration diff

### 2026-05-20T13:24Z — harness compliance
- moved project into `2026-05-20-composer25-vite-budget-planner/`
- created `.logs/` (prompt, progress, friction, wins)
- rewriting README for non-technical users + Bun per AGENTS.md
- ran `bun install` in slug; removed root orphans
- outcome: ok

### 2026-05-20T15:10Z — canary retest: lite db reset @ pkg.pr.new build 206
- user asked to retest friction from `https://pkg.pr.new/@supabase/lite@206`
- bun add failed (dependency loop); installed with `npm install … --legacy-peer-deps`
- ran: `lite db reset` (fresh + after migration), `lite db schema --diff`, `lite db diff -f` (failed pglite), `lite migration diff --execute --force`
- outcome: friction **not resolved** on 206; appended correction to `.logs/friction.md`
- commented on https://github.com/dswbx/lite-projects/issues/14

### 2026-05-20T16:00Z — canary 206 updated retest (user guidance)
- force-reinstalled `https://pkg.pr.new/@supabase/lite@206`; verified `@electric-sql/pglite@0.4.5` bundled
- `db diff -f` fails on full schema (RLS): `role "authenticated" does not exist`
- `db diff -f` succeeds on table-only schema; writes `supabase/migrations/*_budget_schema.sql` (Postgres DDL)
- `db reset` after that migration: ✓ applies migration, app tables present
- reframed: `migration diff --execute --force` not valid; reset behavior matches upstream (migrations dir, not schema_paths)
- outcome: partial; appended correction to friction.md; issue #14 comment updated

### 2026-05-20T18:15Z — canary retest build 209 (both migration frictions)
- force-installed `https://pkg.pr.new/@supabase/lite@209`; `@electric-sql/pglite@0.4.5` bundled
- `db diff -f` full RLS schema: OK; migration includes ENABLE ROW LEVEL SECURITY + CREATE POLICY in `supabase/migrations/`
- `db reset` on fresh emission: FAIL (missing `;` terminators); OK after adding semicolons manually
- friction #16 (RLS in migrations): resolved on 209
- friction #14 (db reset flow): RLS + `db diff -f` blocker resolved; semicolon emission remains (new minor)
- commented on GitHub issues #14, #16

### 2026-05-20T19:40Z — canary 209 updated retest (semicolon friction)
- force-reinstalled pkg.pr.new @209 (tarball 19:37 GMT); Em() now uses hx() for semicolon terminators
- fresh db diff -f + db reset: OK without manual edits; npm run dev OK; RLS curl OK
- friction semicolons: resolved; closed GitHub issue #14

### 2026-05-20T20:05Z — canary retest build 210 (init config + vite peer)
- force-installed `https://pkg.pr.new/@supabase/lite@210`
- `lite init` in temp dir: full config.toml (schema_paths, auth jwt, seed paths)
- vite@8 + lite@210 install: no peer warnings; peer range includes ^8.0.0
- migration flow regression: db diff -f + db reset OK (29 semicolons, tables present)
- closed GitHub issues #15, #17

### Stack deviations (not @supabase/lite)
- used **npm** instead of default **Bun** for install/scripts (canary 206 install also npm)
- no **Tailwind v4** (plain CSS for speed; prompt did not specify UI stack)
