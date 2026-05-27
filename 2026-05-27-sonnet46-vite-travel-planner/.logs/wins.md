### 2026-05-27T17:49Z — Vite plugin: single-process setup, schema hot-reload

- `@supabase/lite/vite` is the standout feature. Adding `supalite()` to `vite.config.ts` is the entire backend setup. One `bun run dev` starts both the Vite dev server and the supalite API, schema applies automatically, and the hot-reload schema watcher fires on every `schemas/*.sql` save.
- correction (2026-05-27T17:54Z): the plugin does NOT inject env vars -- see friction.md. Workaround: use `window.location.origin` as the URL. The single-process win still stands; the env injection claim was wrong.
- versions: @supabase/lite@0.3.1-next.1, vite@6.4.2, bun@1.3.13
- counterfactual: without the plugin I'd have run a separate `lite dev` process on port 54321, proxied requests, and managed two terminal windows. The plugin removes all of that.
- snippet:

```ts
// vite.config.ts
import { supalite } from '@supabase/lite/vite'
export default defineConfig({ plugins: [supalite(), react(), tailwindcss()] })
```

```ts
// frontend -- API is on the same origin, workaround for missing env injection
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL ?? window.location.origin,
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'dev-anon-key',
)
```

### 2026-05-27T17:50Z — @supabase/supabase-js used as-is, zero adaptation

- `auth.signUp`, `auth.signInWithPassword`, `auth.signOut`, `auth.getUser`, `auth.onAuthStateChange` all worked first-try with zero changes to standard supabase-js patterns.
- `from('trips').select('*').order(...)`, `.insert(...)`, `.update(...)`, `.delete()`, `.eq()`, `.in()`, `.single()` all behaved exactly as documented in supabase-js.
- no shims, no adapter, no special imports -- just `createClient` from `@supabase/supabase-js` pointed at the injected URL.
- parity win: prior Supabase knowledge transferred completely. Did not open supabase-js docs once.
- versions: @supabase/supabase-js@2.106.2, @supabase/lite@0.3.1-next.1

### 2026-05-27T17:51Z — `lite init` created correct Supabase-compatible layout in one command

- `./node_modules/.bin/lite init` scaffolded `supabase/config.toml`, `supabase/schemas/schema.sql`, `supabase/seed.sql`, `supabase/.temp/` in under 3 seconds.
- config.toml matched the documented format exactly -- no manual editing needed.
- the declarative schema approach (Postgres DDL auto-translated to SQLite) let me write standard Postgres `CREATE TABLE`, `REFERENCES`, `CREATE POLICY`, RLS `ENABLE ROW LEVEL SECURITY` without ever touching SQLite syntax.
- versions: @supabase/lite@0.3.1-next.1, bun@1.3.13

### 2026-05-27T17:52Z — schema hot-reload during development

- editing `supabase/schemas/schema.sql` while vite dev was running triggered an automatic schema diff and re-apply within a second. The log line `Schema changed: supabase/schemas/schema.sql` confirmed it.
- no restart needed. Adding `TO authenticated` to the RLS policies took effect immediately.
- why it mattered: tightened RLS policy mid-session with zero friction. In a real Supabase setup this would require a migration + push cycle.

### 2026-05-27T17:53Z — actionable policy warning surfaced at startup

- supalite printed a clear advisory when policies lacked a `TO` clause:
  `[supalite] policy "..." has no TO clause — applies to all roles (PUBLIC). For clarity, prefer an explicit TO <role> clause (e.g. TO authenticated).`
- this is a security footgun that Postgres/supabase-js lets through silently; supalite catches it at boot.
- fix was immediate: add `TO authenticated` to all four policies, schema hot-reloaded, warnings disappeared.
- win type: supalite-specific (distinct + good). Standard hosted Supabase doesn't warn on this at startup.
