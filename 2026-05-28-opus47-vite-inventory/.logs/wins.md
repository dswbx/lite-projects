### 2026-05-28T07:56Z — `@supabase/lite/vite` plugin is the perfect dev story
- one process serves both the React app and the API; no separate `lite dev` terminal, no CORS, no proxy config
- vite.config:
  ```ts
  import { supalite } from '@supabase/lite/vite'
  export default defineConfig({ plugins: [react(), tailwindcss(), supalite()] })
  ```
- the plugin auto-discovers `./supabase/config.toml`, applies the schema on boot, and mounts `/auth/v1` and `/rest/v1` on the Vite server
- why it mattered: from "I want auth + DB" to "working API on the same port as my React app" in a single line of plugin config. Zero boilerplate.
- counterfactual: with hosted Supabase I'd be juggling project URLs, anon keys, .env files, and a separate emulator process. With `lite dev` standalone I'd need a proxy or CORS config.
- versions: @supabase/lite 0.3.1-next.1, vite 8.0.14
- source: `node_modules/@supabase/lite/README.md` "Vite plugin" section — the entire setup was one snippet

### 2026-05-28T07:56Z — supabase-js works unchanged against lite
- the README headline ("`@supabase/supabase-js` works as-is") is real
- used exactly the same client shape I'd use against hosted Supabase:
  ```ts
  import { createClient } from '@supabase/supabase-js'
  const supabase = createClient(window.location.origin, 'anon-key')
  await supabase.auth.signUp({ email, password })
  await supabase.from('items').select('*').order('created_at', { ascending: false })
  await supabase.from('items').insert({ ...payload, user_id: session.user.id })
  ```
- `onAuthStateChange`, `getSession`, `signInWithPassword`, `signOut`, `from().eq().update()`, `from().eq().delete()` — all worked first try
- versions: @supabase/supabase-js 2.106.2, @supabase/lite 0.3.1-next.1
- parity win: this is *the* feature. I wrote zero lite-specific code in the React app. Existing Supabase muscle memory + tutorials apply directly.
- counterfactual: if the auth/rest client shape diverged at all, I'd have spent the run reading lite-specific docs instead of building the app.

### 2026-05-28T07:57Z — Postgres DDL with RLS translated cleanly to SQLite
- wrote the schema as Postgres DDL with `UUID DEFAULT gen_random_uuid()`, `REFERENCES auth.users(id) ON DELETE CASCADE`, `TIMESTAMP DEFAULT NOW()`, and `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` plus four `CREATE POLICY` statements
- applied on dev boot with no errors; RLS enforced correctly in the smoke test (insert with wrong/missing `user_id` got `PGRST301`; correct one succeeded; select scoped to the user)
- why it mattered: I didn't have to think about the SQLite dialect *at all* despite SQLite being the backing store. The Supabase tutorial I'd write for hosted Supabase works verbatim.
- versions: @supabase/lite 0.3.1-next.1 (sqlite-postgres driver per scaffold default)
- source: `node_modules/@supabase/lite/STATUS.md` — "Postgres-to-SQLite Translation" + "Row Level Security (RLS)" sections set expectations correctly
- snippet that "just worked":
  ```sql
  CREATE POLICY items_insert ON items FOR INSERT TO authenticated
     WITH CHECK (user_id = auth.uid());
  ```

### 2026-05-28T07:58Z — `lite init` scaffolded a sensible default config
- `bunx lite init` produced `supabase/config.toml`, `supabase/schemas/schema.sql`, `supabase/seed.sql` in one shot
- defaults were correct out of the box: `sqlite-postgres` driver, auth enabled, signup enabled, `enable_confirmations = false` (so dev signup doesn't require an inbox)
- why it mattered: I didn't have to research config keys or copy a template; immediately moved on to writing the schema
- versions: @supabase/lite 0.3.1-next.1
- counterfactual: without `lite init` I'd have hunted through README for the minimal config shape, probably missed `enable_confirmations = false`, and gotten a confusing email-confirmation error on first signup
