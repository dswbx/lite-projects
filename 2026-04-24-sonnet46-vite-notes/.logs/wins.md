# Wins Log

### 2026-04-24T20:20Z — supalite vite plugin: zero config, immediate schema apply
- ran `bun dev`, plugin auto-found `supabase/config.toml`, applied schema, printed diff of all tables/indexes/policies
- no separate server process, no proxy config needed — one command starts everything
- why it mattered: no friction at all on the backend wiring; could focus entirely on UI
- parity win: `@supabase/supabase-js` pointed at `window.location.origin` worked first try
- versions: lite-supa@0.3.3, vite@7.3.2, bun@1.3.13

### 2026-04-24T20:20Z — RLS enforcement confirmed immediately
- unauthenticated GET /rest/v1/notes returned `[]` without extra config
- SQLite application-layer RLS translated the 4 per-operation policies correctly
- why it mattered: "each user sees only their own notes" was the core requirement; it worked out of the box with standard Supabase DDL patterns
- counterfactual: if RLS needed separate config or a different syntax, it would have been a blocker

### 2026-04-24T20:20Z — supabase-js auth API identical to hosted Supabase
- `signUp`, `signInWithPassword`, `onAuthStateChange`, `signOut` — all worked first try with no changes
- why it mattered: zero new API surface; prior Supabase knowledge transferred directly
- versions: @supabase/supabase-js@2.104.1
