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

### 2026-04-23T21:10Z — update to lite-supa@0.3.0-canary-20260423190458-11f0141: original dep issue FIXED
- retested 2026-04-23T20:04Z friction
- removed `postgres` + `@electric-sql/pglite` via `bun remove`
- vite plugin no longer eagerly imports either driver (confirmed via `grep` on `dist/vite/`)
- resolution: upstream fix shipped in canary; sqlite-only apps no longer need unused peer deps

### 2026-04-23T21:12Z — canary: `lite-supa/sqlite` node build self-imports, breaks vite config load [blocker]
- version: lite-supa@0.3.0-canary-20260423190458-11f0141
- error: `TypeError: Class extends value undefined is not a constructor or null` at `node_modules/lite-supa/dist/db/node/index.js:249` (`class NodeSqliteConnection extends SqliteConnection`)
- root cause: `dist/db/node/index.js` line 4 does `import { SqliteConnection } from 'lite-supa/sqlite'`. Under the `node` export condition, `./sqlite` resolves back to `./dist/db/node/index.js` — a circular self-import, so `SqliteConnection` is `undefined` at class-extends time
- impact: `bun dev` fails immediately; cannot load `vite.config.ts` which imports `lite-supa/vite` → pulls the sqlite connection
- hypothesis: build should import the base `SqliteConnection` from an inner path (e.g. `../sqlite/SqliteConnection.js`) or ship the base class in a separate subpath not aliased per-condition
- workaround: none found; blocks the run on this canary
- suggested improvement: rewrite internal imports in `dist/db/{node,bun,workerd,browser}/index.js` to reference the base `SqliteConnection` via a non-conditional subpath

### 2026-04-23T21:26Z — FIXED in lite-supa@0.3.0-canary-20260423192442-46c4f17
- retested both prior frictions on this canary
- vite config loads; `bun dev` boots; sqlite db provisioned (6 tables / 5 policies)
- verified: `GET /` → 200, `GET /rest/v1/todos` → 200
- resolution: both the eager-driver-import issue and the node-build self-import are gone on this canary
