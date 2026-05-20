# Friction: schema hot-reload vs duplicate `create index`

Copy this into another session to fix in `@supabase/lite`.

### Schema hot-reload fails when `create index` lines already exist in DB [major]

**Run:** `2026-05-19-composer25-vite-contact-book`  
**Stack:** Vite + `@supabase/lite` (local tarball from cli-memory-usage-investigation) + `@supabase/supabase-js`  
**Lite integration:** `@supabase/lite/vite` `supalite()` plugin, `supabase/schemas/schema.sql`, DB at `supabase/.temp/data.db`

#### Expected

Editing `supabase/schemas/schema.sql` while `bun dev` is running should apply **additive** changes (e.g. new column) without restarting the dev server, similar to `lite dev` schema watch behavior.

#### Actual

When `schema.sql` includes `create index` statements that were already applied on first boot, saving the file triggers a migration that **also tries to recreate those indexes**. That fails; the new column is not applied via the watcher.

**Dev server log (original `company` test):**

```text
Schema changed: supabase/schemas/schema.sql
Failed to execute statement: CREATE INDEX "contacts_name_idx" ON "contacts" ("name");
Migration error: Error: index contacts_name_idx already exists

[ DATA ] tables: 6 / columns: 76 / indexes: 15
```

After this failure, `PRAGMA table_info(contacts)` showed **no** `company` column until we added it manually with `ALTER TABLE`.

**`lite migration diff` (with indexes still in schema file, DB already has indexes):**

```text
Columns:
+ contacts.department    # (or company, etc. — the real change)

Indexes:
+ contacts_name_idx on contacts
+ contacts_user_id_idx on contacts
```

**`lite migration diff --execute`** (same state) failed the same way on the index step during the `company` test.

#### Control experiment (confirms root cause is indexes, not "add column")

1. **Removed** from `schema.sql`:

   ```sql
   create index contacts_user_id_idx on contacts (user_id);
   create index contacts_name_idx on contacts (name);
   ```

2. Added `nickname text` to the `contacts` table in `schema.sql` while `bun dev` kept running.

**Result — success:**

```text
Schema changed: supabase/schemas/schema.sql
Migration written to supabase/.temp/migrations/20260519094949.sql

 Schema Diff 

Tables:
~ contacts

Columns:
+ contacts.nickname

[ DATA ] tables: 6 / columns: 78 / indexes: 13
```

`nickname` appeared in SQLite with no index error.

3. **Re-added** the two `create index` lines and ran `migration diff` for another new column: diff again bundled **column + duplicate index creates**.

#### Relevant schema shape

```sql
create table contacts (
   id serial primary key,
   user_id uuid references auth.users(id) on delete cascade not null,
   name text not null,
   email text,
   phone text,
   company text,   -- example additive column
   notes text,
   created_at timestamptz default now() not null,
   updated_at timestamptz default now() not null
);

create index contacts_user_id_idx on contacts (user_id);
create index contacts_name_idx on contacts (name);

alter table contacts enable row level security;
-- ... RLS policies ...
```

Indexes **do** exist in DB after first start (`contacts_name_idx`, `contacts_user_id_idx`). They should not be re-`CREATE`d on every schema watch.

#### Related noise (not the same bug)

- **`DataLossError`** when removing a column from `schema.sql` that still exists in DB (e.g. dropping `nickname` after test): intentional safety, separate from index issue.
- **`database is locked`**: seen when running `lite migration diff --execute` while `bun dev` holds the DB, or concurrent `sqlite3` access during watch. Crashed dev with exit code 1.

#### Workarounds used in the run

- Manual: `ALTER TABLE contacts ADD COLUMN company TEXT;` then API worked without dev restart.
- Experimental: remove `create index` lines from `schema.sql` so watcher only applies column diffs (not acceptable long-term if indexes must live in schema).

#### Suggested fix (for lite)

- Schema watcher / migration planner should **not emit `CREATE INDEX` for indexes that already exist** in the live DB when applying a diff.
- Or: diff-only migrations for watch path (apply `+ contacts.foo` only), keep full `schema.sql` for cold `lite init` / `--recreate`.
- `migration diff` output should match what the watcher runs; both currently include spurious `+ contacts_name_idx` / `+ contacts_user_id_idx` when indexes are already present.

#### Repro (minimal)

1. `lite init` + `schema.sql` with table + two `create index` lines (as above).
2. `bun dev` with `@supabase/lite/vite` — first boot creates table + indexes.
3. Add one column to `schema.sql` (e.g. `company text`), save.
4. Observe watcher error: `index contacts_name_idx already exists`; column missing in DB.
5. Remove index lines from `schema.sql`, add another column, save → column applies cleanly.

#### Versions

- `bun@1.3.13`
- `@supabase/lite@0.0.1` (local tarball: `cli-memory-usage-investigation/app/supabase-lite-0.0.1.tgz`)
- `vite@8.0.13`
- `@supabase/supabase-js@2.106.0`
