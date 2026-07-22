# Wins

### 2026-07-22T00:00Z — Vite plugin now injects both env vars; zero-config client
- `@supabase/lite/vite` (v0.7.1-next.5) injects **both** `VITE_SUPABASE_URL` (origin) and `VITE_SUPABASE_ANON_KEY` (dev key). The canonical supabase-js snippet worked with no `.env` file and no manual origin handling:
  ```ts
  const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
  )
  ```
- why it mattered: earlier skill notes (and lite issue #27) warned the plugin did NOT inject `VITE_SUPABASE_URL` and to use `window.location.origin`. In this release that workaround is unnecessary — the documented snippet just works.
- lite-specific win: one Vite process serves both the app and the API; no separate `lite dev` process, no proxy, no CORS.
- versions: @supabase/lite@0.7.1-next.5, vite@8.1.5

### 2026-07-22T00:00Z — supabase-js auth + RLS worked unchanged, first try
- `signUp`, `signInWithPassword`, `signOut`, `getSession`, `onAuthStateChange` all behaved exactly like hosted Supabase. Standard `useAuth` hook pattern (getSession + onAuthStateChange subscription) transferred with zero changes.
- With `enable_confirmations = false`, `signUp` returns a live session immediately — ideal for a local prototype (no mailbox round-trip).
- parity win: existing Supabase muscle memory transferred 100%. No new API surface to learn.
- counterfactual: if the auth client shape differed I'd have burned tokens diffing GoTrue behavior.

### 2026-07-22T00:00Z — per-user RLS enforced correctly across all 4 verbs
- The documented per-user pattern (`auth.uid() = user_id` policies + client supplies `user_id` on insert) worked end-to-end. Verified via direct REST calls with two users' JWTs:
  - alice `select` returns only alice's rows; bob `select` only bob's.
  - bob's `DELETE` targeting alice's note affected **0 rows** (silently filtered by RLS, no error) — correct.
  - `INSERT` with matching `user_id` passed `WITH CHECK`; `UPDATE`/`DELETE` scoped to owner.
- why it mattered: "each user sees only their own notes" is the core requirement and it was satisfied purely declaratively in `schema.sql` — no per-query filtering needed in app code.
- lite-specific: RLS on the SQLite path is enforced at the app layer by AST rewriting; behavior matched Postgres RLS semantics as far as this app exercised it.
- versions: @supabase/lite@0.7.1-next.5

### 2026-07-22T00:00Z — schema boot diagnostics are excellent
- On dev-server start the plugin printed a full schema diff: tables added (incl. `auth.*` + `notes`), indexes, FKs, and a summary line `[ AUTH ] enabled: ✓ / tables: 1 / policies: 4`.
- why it mattered: instant confirmation that my 4 RLS policies were parsed and applied, before writing any client code. Caught nothing wrong here, but would have surfaced a bad policy immediately.

### 2026-07-22T00:00Z — LIMITATIONS.md is a genuine cold-start accelerator
- `cat node_modules/@supabase/lite/LIMITATIONS.md` gave everything needed to avoid the SQLite footguns (no `DEFAULT auth.uid()`, no `rpc`, pass `user_id` from client) in one read. I designed the schema right the first time.

### 2026-07-22T14:05Z — `text[]` array column + `contains` filter worked on the SQLite path
- added `tags text[] not null default '{}'` to a table and it round-tripped as a real JS array through supabase-js — no JSON.parse, no serialization dance:
  ```ts
  await supabase.from('notes').insert({ user_id, title, tags: ['work', 'urgent'] }).select().single()
  // -> row.tags === ['work','urgent']
  ```
- server-side tag filtering worked with the standard supabase-js operator:
  ```ts
  await supabase.from('notes').select('*').contains('tags', ['work'])
  // REST: notes?tags=cs.{work} -> only rows containing 'work'
  ```
- why it mattered: let me model "multiple tags per note + filter by tag" with a single column and zero extra tables/joins. Crucially this sidesteps the SQLite gotchas I'd otherwise hit with a `note_tags` join table (embedded dotted-path filters + subquery WITH CHECK are both unsupported). The array column kept RLS trivial too — tags are on the note row, so the existing `auth.uid() = user_id` policies already protect them.
- parity: `contains` / `text[]` behaved like hosted Supabase for arrays of scalars, matching the LIMITATIONS.md note that scalar-array `contains` is supported. Prior Supabase knowledge transferred directly.
- counterfactual: if `text[]` hadn't translated, I'd have fallen back to a join table and then fought the two unsupported SQLite paths above — significantly more code and more friction.
- versions: @supabase/lite@0.7.1-next.5, @supabase/supabase-js@2.110.8, driver sqlite-postgres
