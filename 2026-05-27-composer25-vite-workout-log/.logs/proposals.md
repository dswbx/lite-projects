## README / package docs

### 2026-05-27T16:27Z — RECIPES.md: child-table RLS without subquery WITH CHECK (SQLite)

- **observed:** Parent/child RLS using `workout_id IN (SELECT id FROM parent WHERE user_id = auth.uid())` in `WITH CHECK` failed on insert (see `friction.md` first entry). STATUS.md mentions the limitation but it is easy to miss when copying hosted Supabase examples.
- **propose:** Add a short `RECIPES.md` (or README section) with two patterns: (1) denormalize `user_id` on child tables + `user_id = auth.uid()` policies; (2) when subqueries are required, note Postgres vs SQLite behavior.
- **why it helps LLMs:** Cold-start agents modeling todos/workouts/comments will default to hosted RLS snippets and hit opaque `RLS policy violation` errors.
- **source:** `friction.md` subquery WITH CHECK entry; `STATUS.md` RLS limitations table.

### 2026-05-27T16:27Z — Vite plugin: document default client URL

- **observed:** README shows `VITE_SUPABASE_URL` but the plugin does not inject it; same-origin (`window.location.origin`) is the practical default when API mounts on the Vite server.
- **propose:** In README Vite section, state explicitly: "During `vite dev`, set `VITE_SUPABASE_URL` to your dev server origin (e.g. `http://localhost:5173`) or use `window.location.origin` in client code."
- **why it helps LLMs:** Avoids hard-coding port 54321 from the CLI quick start when using the plugin path.
- **source:** `progress.md` setup notes; `node_modules/@supabase/lite/README.md` Vite plugin section.

## Skill seeds (future `supalite` skill)

### 2026-05-27T16:28Z — must-read: STATUS.md RLS limitations before writing policies

- **observed:** Wasted one iteration on subquery `WITH CHECK` child policies before re-reading STATUS.
- **propose:** Skill step: after `lite init`, read `node_modules/@supabase/lite/STATUS.md` "Row Level Security" → "Known limitations (SQLite)" before authoring `CREATE POLICY`.
- **counterfactual:** Would have chosen denormalized `user_id` on first schema draft.

### 2026-05-27T16:28Z — trigger: "workout log" / per-user data

- **observed:** Prompt required per-user isolation; correct path was auth + RLS, not client-side filtering alone.
- **propose:** Skill checklist: enable `[auth]` in config, use `authenticated` role in policies, set `user_id` from `session.user.id` on insert, verify with a second test user.
