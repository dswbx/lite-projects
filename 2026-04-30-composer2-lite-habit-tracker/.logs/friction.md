# friction

(no issues blocking this run)

### 2026-04-30T05:26Z — RLS subquery alias dropped by rewriter [major]

- observed: UI error loading completions: `Failed to prepare statement` with SQL showing `from "habits" where ("h"."id" = ...)` (alias `h` referenced but not defined on rewritten FROM clause)
- repro: sign in, create a habit; second query `habit_completions.select(...).in('habit_id', ids)` fails at prepare time
- schema had: `from habits h where h.id = ...`
- fix applied: qualify columns as `habits.id` / `habits.user_id` with `from habits` (no alias) in all `habit_completions` policies
- versions: lite-supa@0.3.3 (from earlier install)
- suggested upstream: preserve table aliases when injecting EXISTS subqueries for RLS, or document alias limitation

### 2026-04-30T05:35Z — INSERT WITH CHECK EXISTS unsupported client-side [major]

- observed: `Cannot evaluate operator "type" client-side for WITH CHECK` when inserting into `habit_completions`
- cause: lite validates INSERT `WITH CHECK` in `RlsEnforcer.validateWithCheck` using only simple column operators (`$eq`, …); policies containing `EXISTS` compile to shapes that hit `default:` in `evaluateOp`
- fix applied: add denormalized `user_id` on `habit_completions`, `UNIQUE (id, user_id)` on `habits`, composite `FOREIGN KEY (habit_id, user_id) REFERENCES habits (id, user_id)`, RLS reduced to `user_id = auth.uid()` for select/insert/delete
- note: existing local DBs need schema reapply (`bun dev` watcher) or `lite-supa dev --recreate` if migration conflicts

### 2026-04-30T05:38Z — PGRST204 user_id not in schema cache [major]

- observed: `Could not find the 'user_id' column of 'habit_completions' in the schema cache` on insert
- cause: PostgREST layer in lite compares JSON body keys to `introspection.columns` for the table (`app/src/server/data.ts`); an older `supabase/.temp/data.db` created before `user_id` existed means either the live table lacks the column (migration never ran) or the user only refreshed the app while the API still held a mismatched picture. Clean apply on empty `.temp` shows `user_id` present and migration succeeds.
- fix for users: `bun run db:reset` then `bun dev`; documented in README; added explicit `[db]` block in `config.toml`
- attempted: BEFORE INSERT trigger assigning `NEW.user_id := auth.uid()` + `WITH CHECK (true)` so the client omits `user_id`; lite PL/pgSQL translator rejects `IF` blocks and produced `near "(": syntax error` for the minimal trigger path tested, so abandoned
