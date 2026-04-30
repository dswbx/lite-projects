# wins

### 2026-04-30T07:22Z — supalite Vite plugin single-process dev
- what worked: `plugins: [react(), tailwindcss(), supalite()]` plus `createClient(window.location.origin, 'any-string-works-for-now')` matched the upstream todo example; first `bun dev` applied DDL and showed habits tables without extra CLI
- why it mattered: no separate terminal for PostgREST/auth during iteration
- versions: lite-supa@0.3.3, vite@8.0.10, @supabase/supabase-js@2.105.1
- doc link: https://github.com/supabase/lite README "Vite plugin" section (via `gh api`)
- counterfactual: a two-process setup would add friction for a non-technical README path

### 2026-04-30T07:22Z — RLS pattern from todo example transferred directly
- what worked: `auth.uid()` policies on `habits` plus `exists (select 1 from habits h where …)` policies on `habit_completions` kept inserts scoped to the owning user without denormalizing `user_id` on completions
- parity win: same SQL shape as hosted Supabase docs mentally map to lite
- versions: lite-supa@0.3.3
