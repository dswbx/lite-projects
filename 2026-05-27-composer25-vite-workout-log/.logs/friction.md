### 2026-05-27T16:25Z — RLS INSERT on child tables fails with subquery WITH CHECK [major] [resolved]

- **expected:** `INSERT` into `workout_exercises` succeeds when the parent `workouts` row belongs to `auth.uid()`, using a policy like `workout_id IN (SELECT id FROM workouts WHERE user_id = auth.uid())` in `WITH CHECK` (standard Supabase parent/child RLS pattern).
- **actual:** PostgREST returns RLS violation on insert:

```json
{"code":"SUP","details":null,"hint":null,"message":"Error: RLS policy violation"}
```

- **versions:** `@supabase/lite@0.3.1-next.1`, `bun@1.3.13`, `@supabase/supabase-js@2.106.2`
- **doc link:** `node_modules/@supabase/lite/STATUS.md` — "Subquery `WITH CHECK` on `INSERT`" under Row Level Security known limitations (SQLite).
- **repro:**

```bash
# after signup + workout insert for same user
curl -s -X POST "http://localhost:5173/rest/v1/workout_exercises" \
  -H "apikey: dev-anon-key" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{"workout_id":"<workout-uuid>","name":"Squat","sort_order":0}'
```

Original policy (from `supabase/schemas/schema.sql`):

```sql
CREATE POLICY exercises_insert ON workout_exercises
  FOR INSERT TO authenticated
  WITH CHECK (
    workout_id IN (SELECT id FROM workouts WHERE user_id = auth.uid())
  );
```

- **what we tried:** Confirmed workout row insert works with `user_id = auth.uid()`; child insert fails only when policy uses subquery in `WITH CHECK`.
- **resolution:** Denormalized `user_id` onto `workout_exercises` and `exercise_sets` and switched to `user_id = auth.uid()` for `USING`/`WITH CHECK` on all three tables. Client sets `user_id` from `session.user.id` on every insert. Fresh DB + retest: exercise and set inserts succeed; nested `select=*,workout_exercises(*,exercise_sets(*))` returns full tree.

### 2026-05-27T16:26Z — forceSchema migration on existing DB failed mid-diff [minor]

- **expected:** `supalite({ forceSchema: true })` can add `user_id` columns to existing child tables during dev iteration.
- **actual:** Vite boot logged:

```
Failed to execute statement: CREATE INDEX "workout_exercises_user_id_idx" ON "workout_exercises" ("user_id");
Migration error: Error: no such column: "user_id"
```

- **workaround:** Deleted `supabase/.temp/data.db` and restarted `bun dev` for a clean schema apply.
- **versions:** `@supabase/lite@0.3.1-next.1`
- **note:** Dev-only pain; not a runtime bug once schema matches. Documented in `progress.md`.

### 2026-05-29T14:39Z — forceSchema migration on existing DB failed mid-diff [minor] [resolved]

- **canary:** `@supabase/lite@0.3.1-next.3` (up from `0.3.1-next.1`)
- **repro:** Existing `data.db` with `workout_exercises` / `exercise_sets` without `user_id`; updated `supabase/schemas/schema.sql` to add `user_id` + indexes; `supalite({ forceSchema: true })` on `bun dev`.
- **result:** Schema diff showed `+ workout_exercises.user_id`, `+ exercise_sets.user_id`, indexes applied; no `Migration error` or `no such column: "user_id"`. `PRAGMA table_info(workout_exercises)` lists `user_id` column.
- **conclusion:** Fixed in `0.3.1-next.3` for this column-add + index case.
