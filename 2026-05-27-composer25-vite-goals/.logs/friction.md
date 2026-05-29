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

### 2026-05-27T16:00Z — correction: `default auth.uid()` documented in @supabase/lite@0.3.1-next.3 [resolved]
- refers to: 2026-05-27T14:47Z
- checked: `npm pack @supabase/lite@0.3.1-next.3` → `LIMITATIONS.md` § SQL / DDL (SQLite path), `PATTERNS.md` § Per-user multi-tenant, bundled `skills/supalite/SKILL.md` cold-start step 2
- finding: intentional SQLite limitation, not a bug. `LIMITATIONS.md` states `DEFAULT auth.uid()` → not supported; pass `user_id` from client + RLS `WITH CHECK`. `PATTERNS.md` shows the canonical insert with `session.user.id`.
- action for future runs: read `LIMITATIONS.md` before authoring schema; do not file as missing docs

### 2026-05-27T16:00Z — correction: subquery `WITH CHECK` / `EXISTS` documented in next.3 [resolved]
- refers to: 2026-05-27T14:48Z
- checked: `LIMITATIONS.md` bullet "Subquery `WITH CHECK` on `INSERT`"; `STATUS.md` RLS known limitations (same error text)
- finding: expected on SQLite path. Workaround in package docs matches what we shipped: denormalize `user_id` + `auth.uid() = user_id` policies
- action for future runs: use `PATTERNS.md` per-user template for child tables instead of `EXISTS` subqueries

### 2026-05-27T16:00Z — correction: RLS `TO` clause boot warnings still present in next.3 (docs clarified, runtime unchanged)
- refers to: 2026-05-27T14:47Z
- checked: `@supabase/lite@0.3.1-next.3` `dist/index.js` still contains `console.warn('[supalite] policy "…" has no TO clause …')`; `STATUS.md` still notes "omitting `TO` = PUBLIC (warns)"
- finding: **not removed** in next.3. **Documented** in `PATTERNS.md` (policies include `to authenticated`) and `skills/supalite/SKILL.md` (points agents to PATTERNS/LIMITATIONS). Our final schema already uses `TO authenticated`, so boot is clean
- not tagged [resolved]: warning is by design; issue is discoverability, addressed in package docs

### 2026-05-27T16:00Z — correction: goal insert without `user_id` documented in next.3 [resolved]
- refers to: 2026-05-27T14:48Z
- checked: `PATTERNS.md` — "The client supplies `user_id` on insert (SQLite RLS evaluates `WITH CHECK` against supplied values; there is no `DEFAULT auth.uid()` on SQLite)"
- finding: same root cause as column-default friction; documented anti-pattern in `LIMITATIONS.md`
- action for future runs: always pass `user_id` on insert per PATTERNS template
