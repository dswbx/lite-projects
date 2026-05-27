### 2026-05-27T16:24Z — Vite plugin runs API + schema in one `bun dev`

- **what worked:** `supalite()` from `@supabase/lite/vite` mounted `/auth/v1` and `/rest/v1` on the same port as the React app; schema from `supabase/schemas/schema.sql` applied on boot with a clear diff in the terminal.
- **why it mattered:** No separate `lite dev` terminal, no proxy config, single command for the harness run.
- **versions:** `@supabase/lite@0.3.1-next.1`, `vite@8.0.14`
- **snippet:**

```ts
import { supalite } from '@supabase/lite/vite'

export default defineConfig({
  plugins: [react(), tailwindcss(), supalite()],
})
```

- **counterfactual:** Without the plugin I would have wired port 54321, CORS, and env URLs manually.

### 2026-05-27T16:24Z — supabase-js auth + CRUD unchanged

- **what worked:** `signUp`, `signInWithPassword`, `onAuthStateChange`, `.from('workouts').insert().select().single()`, nested embed `workout_exercises(*, exercise_sets(*))` all used standard `@supabase/supabase-js` APIs.
- **parity win:** Muscle memory from hosted Supabase transferred; no lite-specific client.
- **versions:** `@supabase/supabase-js@2.106.2`, `@supabase/lite@0.3.1-next.1`

```ts
const { data: workout } = await supabase
  .from('workouts')
  .insert({ user_id: user.id, title, workout_date })
  .select('id')
  .single()
```

### 2026-05-27T16:26Z — RLS per-user isolation verified

- **what worked:** `auth.uid()` policies on `workouts` (and denormalized `user_id` on children) hid other users' rows in list queries.
- **test:** User A had workouts; User B's `GET /rest/v1/workouts` returned `[]` with a valid JWT.
- **lite-specific clarity:** README + STATUS explained SQLite RLS is app-layer AST rewrite; subquery `WITH CHECK` limitation was discoverable in STATUS before guessing.

### 2026-05-27T16:01Z — `lite init` scaffolded Supabase layout

- **what worked:** `bunx lite init` created `supabase/config.toml`, `schemas/schema.sql`, `seed.sql` with auth enabled and `sqlite-postgres` driver defaults.
- **versions:** `@supabase/lite@0.3.1-next.1`
