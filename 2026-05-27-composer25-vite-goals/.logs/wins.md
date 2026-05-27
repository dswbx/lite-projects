### 2026-05-27T14:49Z — Vite plugin runs API + schema in one `bun dev` command

- single process serves React at `/` and PostgREST/GoTrue at `/rest/v1`, `/auth/v1`
- schema diff printed on boot with table/policy counts — immediate confidence migrations applied
- versions: `@supabase/lite@0.3.1-next.1`, vite@8.0.14
- parity win: matches Supabase mental model (config.toml + schemas/*.sql + supabase-js)
- counterfactual: separate `lite dev` on 54321 + Vite proxy would mean two terminals and CORS wiring

```ts
import { supalite } from '@supabase/lite/vite'

export default defineConfig({
  plugins: [react(), tailwindcss(), supalite()],
})
```

### 2026-05-27T14:49Z — supabase-js auth + CRUD unchanged

- `signUp`, `signInWithPassword`, `from('goals').select()`, insert/update/delete all worked against the embedded lite server
- versions: `@supabase/supabase-js@2.106.2`, `@supabase/lite@0.3.1-next.1`

```ts
const supabase = createClient<Database>(url, anonKey)
await supabase.auth.signInWithPassword({ email, password })
await supabase.from('goals').insert({ title, description, target_date, user_id: user.id })
```

### 2026-05-27T14:49Z — `lite init` scaffolds Supabase-compatible layout

- `supabase/config.toml`, `schemas/schema.sql`, `seed.sql` created with sensible auth defaults (`enable_confirmations = false` for local email signup)
- counterfactual: inventing folder layout from scratch would risk mismatch with hosted Supabase upgrade path documented in README

### 2026-05-27T14:49Z — RLS with `auth.uid()` on goals isolates tenants

- two signups in API test: second user saw 0 goals while first user saw 1
- policies `to authenticated using (auth.uid() = user_id)` applied after boot without extra app-layer filtering
