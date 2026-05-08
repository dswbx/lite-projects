### 2026-05-08T12:14Z — same-origin supabase-js client

- used `createClient(window.location.origin, "any-string-works-for-now")` exactly as in supabase/lite `examples/todo/src/supabase.ts`; no separate API base URL or env wiring for dev
- why it mattered: one dev command (`bun dev`), no CORS or proxy configuration
- parity win: matches documented Supabase JS usage against local lite
- versions: @supabase/supabase-js@2.105.3, lite-supa@0.4.0-canary-20260508120545-9a420b5

### 2026-05-08T12:14Z — vite plugin boot + schema

- `supalite()` in `vite.config.ts` applied Postgres-style DDL on boot; dev server log showed `decks`, `cards`, and `cards_deck_id_idx` without manual migration CLI
- why it mattered: fast iteration from empty `lite init` schema file to working tables
- versions: same as above

### 2026-05-08T12:11Z — gh API for lite repo

- read README and examples via `gh api repos/supabase/lite/contents/...` because the repo is private and cold-start rules forbid copying sibling harness runs
- why it mattered: accurate integration without guessing ports or client setup
