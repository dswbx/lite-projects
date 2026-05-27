### 2026-05-27T17:54Z — Vite plugin does not inject VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY [major]

- expected: README Vite plugin section shows `createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)` -- implies the plugin injects these
- actual: plugin does NOT call `config.define` or inject anything into `import.meta.env`; both vars are `undefined` at runtime, causing `Uncaught Error: supabaseUrl is required`
- confirmed by inspecting `node_modules/@supabase/lite/dist/vite/index.js`: the plugin only calls `configureServer` to add middleware on `/auth/v1`, `/rest/v1`, `/_system` -- no `define` hook
- versions: @supabase/lite@0.3.1-next.1, vite@6.4.2
- workaround: fall back to `window.location.origin` for the URL (API is co-located on the Vite server) and a hardcoded placeholder for the anon key (README says "No anon key is required yet. Pass any non-empty string.")

```ts
// src/lib/supabase.ts -- workaround
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? window.location.origin
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'dev-anon-key'
```

- fix in package: the plugin's `config()` hook should call `config.define['import.meta.env.VITE_SUPABASE_URL']` and inject the anon JWT from the config.toml `jwt_secret`. Or the README should state explicitly that users must provide a `.env` file -- but then the "no .env needed" claim in the plugin description is wrong.

---

### 2026-05-27T17:57Z — RLS rejects insert when user_id not supplied; `DEFAULT auth.uid()` not available [minor]

- expected (from hosted Supabase pattern): column default `DEFAULT auth.uid()` lets you omit `user_id` from inserts and have the DB fill it in automatically; RLS `with check (auth.uid() = user_id)` then passes because the default was applied server-side before the policy check.
- actual: supalite does not appear to support `DEFAULT auth.uid()` as a column default (this is a Postgres expression default that requires the session context, which SQLite cannot execute natively). When `user_id` is omitted from the insert payload, the `with check` policy evaluates `auth.uid() = NULL` → `NULL` → false → "new row violates row-level security policy for table 'trips'".
- versions: @supabase/lite@0.3.1-next.1, bun@1.3.13
- workaround: pass `user_id` explicitly in every insert that targets a user-scoped table.

```ts
// src/components/TripForm.tsx -- workaround
.insert({ user_id: userId, title, destination, ... })
```

- `userId` is passed as a prop from the authenticated parent component (`user.id` from `supabase.auth.getUser()`).
- this is a divergence from hosted Supabase where `DEFAULT auth.uid()` is idiomatic and expected. LLMs generating code for supalite will almost certainly omit user_id from inserts because that's the canonical Supabase pattern.
- fix in package: support `DEFAULT auth.uid()` as a column default (evaluate it at insert time using the session context the RLS engine already has access to), OR document the divergence prominently so LLMs don't fall into this trap. The package installed cleanly, `lite init` scaffolded correctly, the Vite plugin initialized the schema on boot, RLS policies enforced auth.uid() scoping, and supabase-js data/auth methods all worked as documented.

One avoidance: during implementation I drafted a cross-table resource embedding query:

```ts
supabase
  .from('activities')
  .select('*, trip_days!inner(trip_id)')
  .eq('trip_days.trip_id', tripId)
  .order('created_at')
```

I was uncertain whether `.eq('trip_days.trip_id', ...)` dotted-path filtering on an embedded table is fully supported on the SQLite backend at this version. Rather than risk a silent incorrect result, I restructured to use `.in('trip_day_id', dayIds)` after first loading the day IDs. This is a precautionary workaround -- it may not be a real limitation.

If this pattern is unsupported, it would be worth noting in STATUS.md (it is listed as partial support for embedded filtering). This is logged as a proposal rather than a confirmed friction.
