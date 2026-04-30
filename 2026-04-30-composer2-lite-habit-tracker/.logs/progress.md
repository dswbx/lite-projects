# progress

- model: composer2
- stack: vite-react-ts-tailwind4-lite-supa
- started: 2026-04-30T07:20:00Z
- ended: 2026-04-30T07:25:00Z

### 2026-04-30T07:20Z — read AGENTS and remote supabase/lite
- fetched: `gh api repos/supabase/lite/contents/README.md` (why: required integration, anon key and CLI behavior)
- fetched: `gh api` for `examples/todo` schema, vite.config, supabase.ts, App.tsx, AuthForm (why: RLS and Vite plugin pattern)
- assumed: user wants TS + React + Vite + Tailwind v4 + Bun per repo stack defaults
- outcome: ok

### 2026-04-30T07:22Z — scaffold and verify dev
- ran: `bun create vite@latest 2026-04-30-composer2-lite-habit-tracker --template react-ts`
- ran: `bun add lite-supa @supabase/supabase-js` and tailwind v4 packages
- ran: `bun run build` (outcome: ok)
- ran: `bun dev` (outcome: schema applied, habits + habit_completions + auth tables present)

### 2026-04-30T07:24Z — README and logs
- wrote user-facing README with Bun install/dev steps
- outcome: ok

### 2026-04-30T05:26Z — fix habit_completions RLS for lite rewriter
- changed: `supabase/schemas/schema.sql` policies use `from habits` + `habits.column` instead of alias `h`
- outcome: pending user dev reload / schema reapply

### 2026-04-30T05:35Z — habit_completions INSERT policy compatible with client-side WITH CHECK
- changed: composite FK + column `user_id` on completions; app sends `user_id` on insert
- outcome: build verified locally

### 2026-04-30T05:38Z — schema cache PGRST204 + db:reset
- added: `bun run db:reset`, README troubleshooting, `[db]` in config.toml
- outcome: `migration diff --execute --force` ok on fresh `.temp`

### 2026-04-30T07:15Z — README UI screenshot
- added: `readme-ui-screenshot.png` + “What the screen looks like” section in README

### 2026-04-30T07:45Z — commit co-author trailer (Composer / Cursor)
- model not in AGENTS.md table; trailer from Cursor community docs / forum: `Co-authored-by: Cursor <cursoragent@cursor.com>` (see https://forum.cursor.com/t/co-author-added-without-consent-and-cant-be-turned-off/150096 )
- note: human approved commit + PR
