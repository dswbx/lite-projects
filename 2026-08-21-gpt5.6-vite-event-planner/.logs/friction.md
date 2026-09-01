### 2026-08-21T14:27Z — `char_length()` is rejected in a Postgres-style declarative schema [minor]
- expected: the documented PostgreSQL-oriented declarative schema flow would accept the standard `char_length(text)` function in `CHECK` constraints, or the compatibility error would point to the supported replacement before it prevented auth/database initialization.
- actual: Vite plugin startup failed schema application with `Migration error: Error: Function call "char_length" not supported`. Because schema initialization then stopped early, later auth requests also failed with `no such table: auth.users`.
- versions: `@supabase/lite@0.9.0`, Node `v26.7.0`, Vite `8.2.2`.
- offending schema: `supabase/schemas/schema.sql` initially used `check (char_length(name) between 1 and 120)` and `check (char_length(location) between 1 and 180)`.
- reproduction: create a Vite project with `supalite()` plugin, add a table with `check (char_length(name) between 1 and 120)` to `supabase/schemas/schema.sql`, then run `npm run dev`.
- full relevant output:
```text
[WebServer] Migration error: Error: Function call "char_length" not supported
[WebServer] Error: no such table: auth.users
```
- workaround used: replaced each `char_length()` call with SQLite's `length()`, then reset the disposable local database.

### 2026-08-21T14:30Z — SQLite RLS evaluator cannot apply an `EXISTS` ownership join in `WITH CHECK` [major]
- expected: the natural parent-table RLS policy for guests would allow a guest insert only when its referenced event belongs to the signed-in user.
- actual: inserting a guest with this policy shape failed before the query ran:
```sql
create policy "Users can add guests to their own events" on public.guests
for insert to authenticated
with check (exists (select 1 from public.events where events.id = guests.event_id and events.user_id = auth.uid()));
```
- full error from `npm run test:e2e`:
```text
Error: Cannot evaluate operator "type" client-side for WITH CHECK
    at Gs.validateWithCheck (.../@supabase/lite/dist/index.js:631:15234)
    at Gs.enforce (.../@supabase/lite/dist/index.js:631:13981)
```
- versions: `@supabase/lite@0.9.0`, Node `v26.7.0`, Vite `8.2.2`.
- reproduction: use Vite `supalite()` with the policy above, sign in via `@supabase/supabase-js`, then call `supabase.from('guests').insert({ event_id, name })`.
- workaround used: denormalized `user_id` onto `guests`, supplied it from the session, and used the direct `auth.uid() = user_id` RLS pattern for select/insert/update/delete. A composite foreign key from `guests(event_id, user_id)` to `events(id, user_id)` preserves the parent/child ownership invariant at the database level.
