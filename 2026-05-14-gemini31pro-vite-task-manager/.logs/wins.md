### 2026-05-14T09:20Z — vite plugin integration
- used `supalite()` in `vite.config.ts` and it automatically served the API alongside the frontend
- why it mattered: no need to run a separate backend process or configure CORS/proxies manually
- keep: yes, default for future vite runs
- versions: lite-supa@0.4.0, vite@8.0.12
