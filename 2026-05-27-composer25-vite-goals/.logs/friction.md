### 2026-05-27T14:47Z — `default auth.uid()` on column not supported in schema migration [major]

- expected: Postgres-style `user_id uuid default auth.uid()` when applying declarative schema via Vite plugin
- actual: migration fails with `Function call "uid" not supported`; goals/milestones tables not created
- versions: `@supabase/lite@0.3.1-next.1`, bun@1.3.13, vite@8.0.14
- doc: `node_modules/@supabase/lite/README.md` (Writing schemas — RLS mentions `auth.uid()` in policies, not defaults)

```
Migration error: Error: Function call "uid" not supported

[ DATA ] tables: 0 / columns: 0 / indexes: 0
```

workaround: omit column default; set `user_id` from the client on insert (and from `useAuth().user.id` in React).

```sql
-- fails
user_id uuid not null default auth.uid() references auth.users (id)

-- works
user_id uuid not null references auth.users (id)
```

### 2026-05-27T14:48Z — milestone RLS with `EXISTS` subquery fails on insert [major]

- expected: policy `with check (exists (select 1 from goals where ...))` allows authenticated user to add milestones to their goals
- actual: HTTP 500 with `Cannot evaluate operator "type" client-side for WITH CHECK`; alternate `goal_id in (select ...)` returned RLS violation (403)
- versions: `@supabase/lite@0.3.1-next.1`

```
{"code":"SUP","message":"Error: Cannot evaluate operator \"type\" client-side for WITH CHECK"}
```

workaround: denormalize `user_id` onto `milestones` and use direct `auth.uid() = user_id` policies (same pattern as `goals`). Client passes `user_id` on milestone insert.

### 2026-05-27T14:47Z — RLS policies without `TO` clause log warnings [minor]

- actual: Vite boot logs eight warnings that policies apply to PUBLIC without explicit `TO authenticated`
- workaround: add `to authenticated` on each policy (done in final schema)

### 2026-05-27T14:48Z — goal insert without `user_id` rejected by RLS [minor]

- expected: insert with only `title`/`description`/`target_date` when JWT present
- actual: `PGRST301` new row violates row-level security policy for table "goals"
- workaround: include `user_id: user.id` in insert payload from supabase-js
