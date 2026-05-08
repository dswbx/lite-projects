### 2026-05-08T12:17Z — production preview vs embedded supalite [minor]
- issue: https://github.com/dswbx/lite-projects/issues/4

- expected: users might run `vite preview` after `vite build` and expect full CRUD
- actual: Supabase Lite README states the Vite plugin is only active during `vite` / `vite dev`, so the REST API is not mounted in preview/production static serving by default
- workaround: documented in project `README.md` — use `bun dev` for normal use
- versions: lite-supa@0.4.0-canary-20260508120545-9a420b5, vite@8.0.11
