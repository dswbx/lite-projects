### 2026-04-23T20:06Z — supalite inline vite plugin is a single-process win
- one `bun dev` spins up the frontend + `/auth/v1` + `/rest/v1` + SQLite
- cold start ~400ms (vite ready) with auto-migration from `schemas/schema.sql`
- why it mattered: no second terminal, no docker, no supabase start; matches the "quick cheap prototype" pitch
- keep: yes, default for all supabase/lite runs unless the prompt asks for an out-of-process api

### 2026-04-23T20:06Z — RLS-first schema nails the public/private requirement
- the `todos` feature is almost entirely expressed as 5 policies on one table
- policies enforce guest-reads-public + user-reads-own + user-writes-own without app-layer checks
- keep: yes, lean on RLS instead of app-layer auth gating for future runs

### 2026-04-23T20:06Z — upstream `examples/todo` was near-drop-in
- exact feature match (public/private todos, auth, RLS), so it served as a reference
- only real edits: drop workspace ref, strip tsconfig paths, consolidate guest/auth view in App.tsx
- keep: check upstream examples first on future runs before writing from scratch
