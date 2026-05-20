# wins

### 2026-05-19T07:26Z — schema file watcher fired without dev restart
- edited `supabase/schemas/schema.sql`; terminal logged `Schema changed: supabase/schemas/schema.sql` while Vite kept running
- `lite migration diff` surfaced the right additive change (`+ contacts.company`) without restart
- why it mattered: confirms the watch path is wired; column count in dev banner updated 76 → 77 after column landed

### 2026-05-19T07:10Z — vite plugin runs lite inline, one command
- single `bun dev` starts Vite + Supalite, applies schema, prints policy count
- why it mattered: no separate terminal for `lite dev` on :54321 or proxy config
- parity win: matches supabase/lite README vite plugin story
- versions: @supabase/lite@0.0.1, vite@8.0.13, bun@1.3.13
- snippet:

```ts
import { supalite } from "@supabase/lite/vite";

export default defineConfig({
   plugins: [react(), tailwindcss(), supalite()],
});
```

### 2026-05-19T07:10Z — RLS policies from todo example transferred directly
- copied policy shape from `examples/todo` (authenticated + `auth.uid()`), adapted table/columns
- why it mattered: per-user isolation requirement satisfied without custom server code
- versions: supabase/lite docs via `gh api` (private repo)
- snippet:

```sql
create policy contacts_select_own on contacts
   for select to authenticated using (user_id = auth.uid());
```

### 2026-05-19T07:10Z — supabase-js auth + CRUD unchanged
- `signUp` / `signInWithPassword` / `onAuthStateChange` + `from('contacts').insert/select/ilike/update/delete` worked first run
- counterfactual: bespoke REST or localStorage would have skipped auth/RLS testing entirely
- versions: @supabase/supabase-js@2.106.0

```ts
let query = supabase.from("contacts").select("*").order("name", { ascending: true });
if (term) query = query.ilike("name", `%${term}%`);
```
