# wins

### 2026-05-13T15:46Z — `@supabase/supabase-js` worked unchanged against the lite vite plugin
- pointed `createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)` at the local Vite dev URL (one process serving the React app + `/auth/v1` + `/rest/v1`) and the entire flow worked first try: `auth.signUp`, `auth.signInWithPassword`, `from("bookmarks").insert(...).select().single()`, `eq`, `order`, `auth.onAuthStateChange`.
- why it mattered: zero new SDK to learn. The "Supabase-compatible, not Supabase" framing in the README was accurate in the best way — code I'd write against hosted Supabase pasted in without diffing APIs.
- parity win: the supabase-js surface I used (~8 methods) all behaved identically. RLS-filtered selects returned `[]` for unauthorized users, exactly like Postgres + Supabase.
- snippet that just worked (after RLS was wired correctly — see friction):
  ```ts
  const { data } = await supabase
    .from("bookmarks")
    .insert({ title, url, description, folder_id, user_id: session.user.id })
    .select()
    .single();
  ```
- counterfactual: if the client shape differed I'd have spent the run reading lite's REST docs instead of building the UI.
- versions: lite-supa@0.4.0, @supabase/supabase-js@2.105.4

### 2026-05-13T15:46Z — `lite-supa/vite` plugin is the right shape
- one plugin entry in `vite.config.ts`, no separate `lite dev` process, no proxy, no CORS dance. `bun dev` is a single process and a single URL.
- why it mattered: shaved off the entire "wire two dev servers together" subtask. I never had to think about ports, env vars between FE/BE, or `vite proxy` config.
- ergonomics: `supalite()` accepts `{ migrateOnBoot, watchSchema, forceSchema }` — exactly the knobs I needed when reverse-engineering the imperative-migration flow.
- snippet:
  ```ts
  import { supalite } from "lite-supa/vite";
  export default defineConfig({ plugins: [react(), tailwindcss(), supalite({ watchSchema: false })] });
  ```
- counterfactual: a Next.js-style API-routes split or a hand-rolled Hono server would have added at least one config file and one cross-origin gotcha. The plugin removed both.
- versions: lite-supa@0.4.0, vite@7.3.3

### 2026-05-13T15:46Z — `auth.uid() = user_id` in RLS policies "just worked" once policies were loaded
- once the RLS extraction was sorted (see friction), the policy below behaved identically to hosted Supabase: signed-in user sees their rows, no one else does, no manual `eq("user_id", session.user.id)` needed in the client.
  ```sql
  create policy "bookmarks are visible to owner" on bookmarks
    for select to authenticated using (auth.uid() = user_id);
  ```
- why it mattered: I was able to write the React queries as plain `from("bookmarks").select("*")` and trust the server to filter. That's the whole point of RLS and lite delivered it on SQLite.
- parity win: same SQL, same `auth.uid()`, same role names (`authenticated`). My Supabase mental model transferred over with zero edits.
- counterfactual: if RLS hadn't worked I'd have had to either filter in the client (insecure-by-default) or write a server route per query.
- versions: lite-supa@0.4.0
