### 2026-05-29T12:52:00Z — PATTERNS.md per-user RLS recipe matched requirements
- copied policy quartet from installed PATTERNS.md; added guests with denormalized user_id as doc suggests for SQLite insert RLS
- why it mattered: "each user only sees their own events" was one schema pass, no trial-and-error
- versions: @supabase/lite@0.3.1-next.3
- parity win: same auth.uid() + authenticated role shape as hosted Supabase docs

### 2026-05-29T12:52:00Z — Vite plugin one-process dev
- `supalite()` in vite.config.ts auto-applied schema on boot with diff output in terminal
- client: `createClient(window.location.origin, "any-string-works-for-now")` from README
- why it mattered: no separate `lite dev`, no proxy, no .env for URL
- versions: @supabase/lite@0.3.1-next.3, vite@6.4.2

### 2026-05-29T12:55:00Z — embedded guests in one select
- `from("events").select("*, guests(*)")` returned nested guests in first API test
- snippet:
```ts
await supabase.from("events").select("*, guests(*)").gte("event_date", start).order("event_date", { ascending: true });
```
- counterfactual: without embedding would need two round-trips and manual join in UI

### 2026-05-29T12:55:00Z — email/password auth first try
- `signUp` / `signInWithPassword` via supabase-js against Vite-mounted `/auth/v1`
- curl signup returned JWT; REST insert with Bearer succeeded under RLS
