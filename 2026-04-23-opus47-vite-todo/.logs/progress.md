- model: claude-opus-4-7
- stack: vite + react + ts + bun + tailwind v4 + lite-supa
- started: 2026-04-23T20:00Z
- tokens / cost: n/a

### 2026-04-23T20:00Z — fetched supabase/lite docs
- ran `gh repo view supabase/lite` + read README + `examples/todo`
- why: AGENTS.md requires supabase/lite integration; examples/todo matches the prompt (public/private todos with RLS)
- outcome: ok, adopted example structure

### 2026-04-23T20:02Z — scaffolded project
- dir: `2026-04-23-opus47-vite-todo/`
- files: package.json, vite.config.ts, tsconfig.json, index.html, .gitignore, supabase/{config.toml,schemas/schema.sql,seed.sql}, src/{main.tsx,App.tsx,index.css,supabase.ts,components/{AuthForm.tsx,TodoList.tsx}}
- assumed: use `lite-supa` from npm (latest), not workspace ref as in upstream example
- assumed: SQLite default driver (supalite init default); no config override needed
- outcome: ok

### 2026-04-23T20:03Z — bun install
- `bun install` — 154 packages in 2.69s
- outcome: ok

### 2026-04-23T20:04Z — dev server failed: missing optional db drivers
- ran `bun dev`
- error: `Cannot find package 'postgres'` imported by `lite-supa/dist/vite/index.js`
- fix attempt 1: `bun add postgres` → new error: `Cannot find package '@electric-sql/pglite'`
- fix attempt 2: `bun add @electric-sql/pglite` → ok
- see friction.md
- outcome: ok after installing both

### 2026-04-23T20:06Z — dev server up, verified endpoints
- vite on :5173, supalite mounted
- schema applied: 6 tables, 5 policies on `todos`
- verified: `GET /` 200, `POST /auth/v1/signup` returns JWT, `GET /rest/v1/todos` returns `[]` for anon
- outcome: ok

### 2026-04-23T20:08Z — wrote README for non-technical users
- plain language per AGENTS.md
- outcome: ok

### 2026-04-23T21:10Z — retest on lite-supa canary
- `bun remove postgres @electric-sql/pglite`
- `bun add lite-supa@0.3.0-canary-20260423190458-11f0141`
- original friction (eager driver imports in vite plugin): FIXED, confirmed via grep on `dist/vite/`
- new friction: `bun dev` fails — circular self-import in `dist/db/node/index.js` leaves `SqliteConnection` undefined at class-extends
- see friction.md 21:12Z [blocker]
- outcome: blocked on canary

### 2026-04-23T21:26Z — retest on lite-supa@0.3.0-canary-20260423192442-46c4f17
- `rm -rf node_modules/lite-supa && bun add lite-supa@0.3.0-canary-20260423192442-46c4f17 --force`
- `bun dev` boots, vite ready in 1.65s, sqlite db provisioned (6 tables / 5 policies)
- curl: `/` → 200, `/rest/v1/todos` → 200
- outcome: ok — both prior frictions resolved on this canary

### 2026-04-24T09:00Z — retest types on canary 29f2906
- bumped lite-supa → 0.3.0-canary-20260424070306-29f2906
- `bunx tsc --noEmit` → exit 0
- `lite-supa/vite` now resolves types via package `exports.types`
- outcome: ok, types friction resolved
