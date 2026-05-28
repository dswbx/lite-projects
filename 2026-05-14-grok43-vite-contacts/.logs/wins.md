### 2026-05-14T10:10Z — lite-supa vite plugin "just worked"
- dropped `supalite()` into vite.config after install, same-origin client from example worked immediately
- why it mattered: zero proxy or port config needed; dev server served both frontend and full backend
- versions: lite-supa@0.4.0 from provided tgz, vite@8

### 2026-05-14T10:15Z — supabase-js + RLS parity win
- used exact same createClient + from().select/insert patterns as real Supabase
- RLS policies in schema.sql enforced private contacts automatically
- parity: existing Supabase knowledge transferred with zero changes; local-only nature obvious from README
- counterfactual: different API would have required rewriting every query

### 2026-05-14T10:25Z — bun cold start speed
- full install + dev ready in seconds on M-series
- kept iteration tight while building UI
