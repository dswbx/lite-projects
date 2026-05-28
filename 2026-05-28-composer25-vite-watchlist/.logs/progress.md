- model: composer25
- stack: vite
- started: 2026-05-28T12:00:00Z
- ended: 2026-05-28T12:05:00Z

### 2026-05-28T12:10:00Z — commit attribution
- model not in AGENTS.md table; prior `composer25` runs in repo use `Co-authored-by: Cursor <cursoragent@cursor.com>`
- using that trailer per git log on feat/2026-05-27-composer25-vite-workout-log

### 2026-05-28T12:00:00Z — run start
- slug: 2026-05-28-composer25-vite-watchlist
- assumed: React + TS + Vite + Bun + Tailwind v4 per AGENTS.md stack defaults
- assumed: email/password auth for per-user isolation (supalite per-user RLS pattern)
- outcome: scaffolded with `bun create vite@latest`

### 2026-05-28T12:01:00Z — install @supabase/lite canary
- ran `bun add https://pkg.pr.new/supabase-community/lite/@supabase/lite@222` per prompt
- also: `@supabase/supabase-js`, tailwind v4 + `@tailwindcss/vite`
- read: `node_modules/@supabase/lite/LIMITATIONS.md`, `README.md`, `PATTERNS.md` (cold start)
- outcome: ok

### 2026-05-28T12:02:00Z — supabase scaffold + schema
- ran `bunx lite init`
- wrote `supabase/schemas/schema.sql` (movies table + RLS per PATTERNS.md)
- vite plugin: `supalite()` from `@supabase/lite/vite` (no `lite dev` alongside)

### 2026-05-28T12:03:00Z — dev server warnings (not lite friction)
- supalite logged policies missing explicit `TO authenticated` clause (4 policies on movies)
- logged here only; schema follows bundled PATTERNS.md verbatim

### 2026-05-28T12:03:30Z — verify API
- `bun dev` → http://localhost:5173/
- curl: signup, insert movie with `user_id`, select own row — ok
- second user select returns `[]` (RLS isolation) — ok
- `bun run build` — ok

### 2026-05-28T12:04:00Z — fetched Tailwind v4 vite install doc
- fetched: https://tailwindcss.com/docs/installation/using-vite (why: stack default)
- outcome: applied via `@tailwindcss/vite` plugin
