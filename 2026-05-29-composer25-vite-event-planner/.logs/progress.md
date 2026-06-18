- model: composer25
- stack: vite-react-ts-tailwind4
- started: 2026-05-29T12:50:00Z
- ended: 2026-05-29T12:56:00Z

### 2026-05-29T12:50:00Z — run start
- slug: 2026-05-29-composer25-vite-event-planner
- pinned: @supabase/lite@0.3.1-next.3
- assumed: email/password auth for per-user isolation; RSVP states pending/yes/no
- outcome: started

### 2026-05-29T12:51:00Z — scaffold
- `bun create vite` cancelled twice; hand-wrote Vite + React + TS + Tailwind v4 layout
- outcome: ok

### 2026-05-29T12:52:00Z — install @supabase/lite@0.3.1-next.3
- `bun install` — 277 packages, @supabase/lite@0.3.1-next.3 resolved
- read: node_modules/@supabase/lite/LIMITATIONS.md, README.md, PATTERNS.md (per-user RLS)
- `bunx @supabase/lite init` — scaffolded supabase/
- outcome: ok

### 2026-05-29T12:54:00Z — schema + app
- Postgres DDL in supabase/schemas/schema.sql (events, guests, RLS, updated_at trigger)
- denormalized guests.user_id for SQLite insert RLS (LIMITATIONS.md)
- outcome: ok

### 2026-05-29T12:55:00Z — verify
- `bun run build` — pass
- `bun run dev` — schema applied, API on :5173
- curl signup + insert event + embedded select — ok
- outcome: ok

### 2026-05-29T13:00:00Z — commit attribution
- commit trailer: `Co-authored-by: Cursor <cursoragent@cursor.com>` (same as feat/2026-05-28-composer25-vite-watchlist in repo history)
- outcome: ok

### 2026-06-10T00:00Z — meta: add e2e + upgrade-verification suite (skill validation)
- not part of the original run; this project was chosen as the validation target for a new `supalite-upgrade-test` skill
- added Playwright e2e (`e2e/`, `playwright.config.ts`, `test:e2e` script) covering auth, event/guest CRUD, RSVP, RLS isolation; see `e2e/COVERAGE.md`
- made `src/lib/supabase.ts` env-configurable (`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` with `window.location.origin` fallback) so one suite runs against both supalite and upgraded Supabase
- made `vite.config.ts` skip the embedded supalite plugin when `VITE_SUPABASE_URL` is set
- baseline e2e vs supalite (Vite plugin): 7/7 green
- outcome: ok

### 2026-06-10T00:30Z — upgrade attempt blocked on 0.3.1-next.3 and 0.4.0
- `bunx lite upgrade --dry-run` and `--target local` both abort: rehearsal `function auth.uid() does not exist`
- logged blocker in friction.md (2026-06-10T00:00Z)
- outcome: blocked

### 2026-06-10T00:50Z — switched to canary @236 (user-provided)
- `bun add https://pkg.pr.new/supabase-community/lite/@supabase/lite@236` → bun DependencyLoop error
- fell back to `npm install "<pkg.pr.new url>"` (installs as v0.0.1); also `npm install postgres` for the local-target apply step
- per AGENTS.md pinned-version rule, switched this project to npm (package-lock.json now present)
- fetched: none (canary URL provided by user)
- outcome: ok

### 2026-06-10T01:00Z — local upgrade succeeds on canary @236
- rehearsal passes; `lite upgrade --target local` needed two fixes: run under bun (`bun --bun .../dist/cli/index.js`, friction 01:10Z) and install `postgres` driver (friction 01:20Z)
- upgrade complete: local Supabase at http://127.0.0.1:57585, 14/14 schema statements applied
- outcome: ok

### 2026-06-10T01:15Z — re-ran SAME e2e vs upgraded Supabase
- `VITE_SUPABASE_URL=<api> VITE_SUPABASE_ANON_KEY=<anon> bun run test:e2e`: 7/7 green
- green-green (supalite 7/7, upgraded Supabase 7/7) — upgrade preserved behavior
- outcome: ok

### 2026-06-10T01:40Z — teardown + restore
- `bunx supabase@2.98.1 stop --workdir . --no-backup`; removed supabase/.branches, supabase/.temp, supabase-credentials.json
- `lite upgrade --target local` had overwritten supabase/config.toml (friction 01:40Z) → restored via `git checkout`
- re-verified supalite dev + baseline e2e 7/7 after restore
- kept: canary @236 pin (user choice), postgres dep, e2e suite, env-configurable client; restored: config.toml
- outcome: ok

### 2026-06-10T02:30Z — make run npm-managed (review fix: frozen bun install failed)
- review found stale `bun.lock` (still `@supabase/lite@0.4.0`, no `postgres`) → `bun install --frozen-lockfile` fails; bun can't resolve the canary URL at all (DependencyLoop, friction 01:30Z)
- removed `bun.lock`; `package-lock.json` is now authoritative. `npm ci` verified (clean frozen install ok)
- README + `playwright.config.ts` webServer switched bun → npm (`npm install` / `npm run dev`); scripts themselves unchanged (runner-agnostic)
- verified under npm: `npm run build` ok, `npm run lint` ok, `npm run test:e2e` 7/7
- outcome: ok
