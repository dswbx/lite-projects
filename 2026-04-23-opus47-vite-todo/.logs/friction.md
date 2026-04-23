### 2026-04-23T20:04Z — lite-supa/vite statically imports all db drivers [major]
- expected: `lite-supa/vite` plugin resolves the db driver based on config (sqlite by default) and only imports what's needed
- actual: vite config load fails because `lite-supa/dist/vite/index.js` eagerly imports `postgres` and `@electric-sql/pglite` at module-load time, even when `config.toml` uses `sqlite`
- workaround: `bun add postgres @electric-sql/pglite` — adds ~MB of unused deps to a sqlite-only app
- hypothesis: the vite plugin bundle should lazy-import drivers behind the config-resolved driver choice, or mark them as optional peers with try/catch
- suggested improvement: upstream fix in `lite-supa/vite` to dynamic-import drivers; or document the required peer deps in README until then
- severity: major — blocks first-run unless user knows to install two non-obvious packages

### 2026-04-23T20:05Z — no types for `lite-supa/vite` subpath [minor]
- ts diagnostic: `Could not find a declaration file for module 'lite-supa/vite'`
- impact: `any`-typed import; doesn't block build
- workaround: leave as-is; upstream could add `types` export condition
