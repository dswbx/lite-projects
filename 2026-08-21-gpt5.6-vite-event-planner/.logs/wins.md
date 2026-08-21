### 2026-08-21T14:25Z — documented Vite + Supabase client path is direct [major]
- versions: `@supabase/lite@0.9.0`, `@supabase/supabase-js@2.112.3`.
- the installed package README and PATTERNS.md gave an immediately usable Vite integration: `supalite()` mounts auth and REST on the Vite origin, while the normal `createClient()` from `@supabase/supabase-js` is retained.
- snippet used:
```ts
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL ?? window.location.origin,
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'local-development-key',
)
```
- parity win: standard Supabase auth and `from(...).select/insert/update/delete` muscle memory applied unchanged.
- why it mattered: no separate backend or proxy was needed for a React app; one Vite command can serve the UI, auth, REST API, and schema hot reload.

### 2026-08-21T14:25Z — per-user RLS recipe was concrete [major]
- PATTERNS.md explicitly says to supply `user_id` on inserts and gives the matching `auth.uid() = user_id` policies. That made it straightforward to enforce isolation in the database rather than only hiding data in the UI.
- counterfactual: without the note about explicit `user_id`, a SQLite-backed app could easily have shipped a policy that rejects every client-side insert.
