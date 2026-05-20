- model: composer25
- stack: vite-react-ts
- started: 2026-05-20T13:18:00Z
- ended: 2026-05-20T13:32:00Z

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

### Stack deviations (not @supabase/lite)
- used **npm** instead of default **Bun** for install/scripts
- no **Tailwind v4** (plain CSS for speed; prompt did not specify UI stack)
