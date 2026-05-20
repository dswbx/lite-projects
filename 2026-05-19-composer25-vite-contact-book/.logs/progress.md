- model: composer25
- stack: vite
- started: 2026-05-19T07:04Z
- ended: 2026-05-19T07:12Z

### 2026-05-19T07:04Z — run setup
- slug: `2026-05-19-composer25-vite-contact-book`
- assumed: TypeScript + React + Vite + Bun + Tailwind v4 per AGENTS.md stack defaults
- assumed: email/password auth with RLS on `user_id` (pattern from supabase/lite `examples/todo`)
- fetched: `gh api repos/supabase/lite/contents/README.md` (why: vite plugin, init, auth)
- fetched: `gh api repos/supabase/lite/contents/examples/todo/supabase/schemas/schema.sql` (why: RLS policies)
- lite package: `https://pkg.pr.new/@supabase/lite@191` per user request
- ran `bun create vite@latest` with react-ts template
- outcome: ok

### 2026-05-19T07:08Z — schema and UI
- wrote `supabase/schemas/schema.sql` with contacts table + RLS (select/insert/update/delete own rows)
- wired `@supabase/lite/vite` supalite plugin; `lite init` scaffolded config
- outcome: ok

### 2026-05-19T07:10Z — verify dev server
- ran `bun dev` — schema migrated, auth + 4 policies on contacts
- browser test: sign up, add contact, search by name (ilike), empty state on no match
- ran `bun run build` — ok
- outcome: ok

### 2026-05-19T07:15Z — local lite tarball (user)
- installed from `file:/Users/dennis/Documents/conductor/workspaces/lite/cli-memory-usage-investigation/app/supabase-lite-0.0.1.tgz`
- added `supabase-lite-vite.d.ts` (tarball omits `dist/vite/index.d.ts`)
- verified `bun run build` and `bun dev` (dev on :5174, :5173 still held by prior process)
- outcome: ok

### 2026-05-19T07:22Z — rebuilt tarball with vite types
- user rebuilt tarball; `dist/vite/index.d.ts` present
- bun lockfile had stale sha512 — cleared integrity on `@supabase/lite`, reinstalled
- removed `supabase-lite-vite.d.ts` shim; `bun run build` ok without it
- outcome: ok

### 2026-05-19T07:26Z — schema hot-reload test (company column)
- added `company text` to schema + UI while dev server kept running
- watcher detected change; migration partially failed on duplicate index (see friction)
- verified insert/list with company on :5174 without dev restart
- outcome: partial
