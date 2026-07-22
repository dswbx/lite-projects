# Friction

### 2026-07-22T00:00Z — `timestamptz` columns serialize without `T` separator or timezone offset [minor]
- expected: a `timestamptz` column returned via the REST API renders as ISO 8601 with a `T` and an offset (Postgres/PostgREST convention), e.g. `2026-07-22T13:37:14+00:00` or `...Z`, so `new Date(value)` parses unambiguously as UTC (matching hosted Supabase behavior).
- actual: values come back as `"2026-07-22 13:37:14"` — a space instead of `T`, and **no** timezone offset.
- why it matters for an LLM: generated client code almost always does `new Date(row.created_at)`. A string with no offset is parsed as **local time** by `new Date()` in most JS engines (whereas the same instant from hosted Supabase, which carries `+00:00`/`Z`, parses as UTC). So the same code silently shifts timestamps by the user's UTC offset when moving between lite and hosted Supabase — a subtle correctness bug that won't surface until someone in a non-UTC zone looks at a "last edited" label.
- observed values (from REST, driver `sqlite-postgres`):
  ```
  "created_at":"2026-07-22 13:37:14","updated_at":"2026-07-22 13:37:14"
  ```
  Insert body sent no timestamps; these came from the column `default now()`.
- repro:
  ```bash
  # after signup, with $ATOK / $AUID from /auth/v1/signup:
  curl -s -X POST "$BASE/rest/v1/notes" \
    -H "apikey: dev-anon" -H "Authorization: Bearer $ATOK" \
    -H "Content-Type: application/json" -H "Prefer: return=representation" \
    -d "{\"user_id\":\"$AUID\",\"title\":\"t\",\"content\":\"c\"}"
  # -> created_at/updated_at are "YYYY-MM-DD HH:MM:SS", no T, no offset
  ```
- schema that produced it:
  ```sql
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
  ```
- workaround used in this app: none needed for correctness in-app because the app only ever reads its own lite-produced values and displays them; the drift would only appear on an upgrade to hosted Supabase or if a client mixed sources. Left as-is; flagging for the package.
- versions: @supabase/lite@0.7.1-next.5, driver `sqlite-postgres`, @supabase/supabase-js@2.110.8, bun@1.3.13
- note: STATUS.md#translated-field-types documents that Postgres sessions render `timestamptz` in UTC; the observed gap here is specifically the **SQLite/`sqlite-postgres` path** emitting a non-ISO string with no offset. Would a maintainer call this "by design"? It reads like a serialization gap, not an intentional limitation → filing as friction rather than a proposal.

### 2026-07-22T00:00Z — shipped docs contradict each other on whether `vite preview` mounts the API [minor]
- `node_modules/@supabase/lite/LIMITATIONS.md` (Runtime / dev section) states:
  > `vite preview` does **not** mount the API. Plugin runs in `vite` / `vite dev` only.
- `node_modules/@supabase/lite/README.md` (Vite plugin section), same installed version, states:
  > Active in both `vite` / `vite dev` and `vite preview` (preview mounts the API and runs boot migrations, but does not watch schemas — it simulates production).
- these are directly contradictory. A cold-start agent reading `LIMITATIONS.md` first (as the package's own "read this first" guidance instructs) will conclude preview is unusable, while README says it now works.
- impact: I did not need preview for this run (used `vite dev`), so no time lost here, but an agent deciding how to serve a prod-like build would get opposite answers depending on which shipped file it trusts. The supalite skill's `known-limits.md` also still carries the old "preview does not mount" claim, compounding it.
- not tested: I did not run `vite preview` to determine which doc is correct for this version — flagging the contradiction itself, which is verifiable from the two shipped files alone.
- versions: @supabase/lite@0.7.1-next.5
- fix belongs in the package: reconcile the two files in the same release (whichever behavior is true for 0.7.x). → filing as friction (a shipped-doc defect), not a proposal.

### 2026-07-22T14:56Z — RLS policy with an aliased subquery emits broken SQL (drops table alias) [major]
- context: implementing note-sharing. A `notes` SELECT policy needs to check a row exists in `note_shares` for the current user. I wrote the subquery with a table alias (`from note_shares s ... s.note_id`).
- expected: the EXISTS subquery in a `USING` clause is merged into the query `WHERE` and executes as SQL (per STATUS.md: "USING conditions are merged into the query's WHERE clause"). Aliased subqueries are standard SQL.
- actual: every query against `notes` failed to prepare. The generated SQL keeps the `s.` column qualifier but omits the alias in `FROM` (`from "note_shares"` instead of `from "note_shares" "s"`), so `"s"."note_id"` references a non-existent alias.
- offending policy (Postgres DDL in `supabase/schemas/schema.sql`):
  ```sql
  create policy "read notes shared with me" on notes
    for select using (
      exists (
        select 1 from note_shares s
        where s.note_id = notes.id
          and s.owner_id = notes.user_id
          and s.shared_with_email = (auth.jwt() ->> 'email')
      )
    );
  ```
- error returned by the REST API for any `select` on `notes` (verbatim):
  ```json
  {"code":"SUP","details":null,"hint":null,
   "message":"Error: Failed to prepare statement: select \"id\", \"title\", \"user_id\" from \"notes\" where (\"user_id\" = ? or exists (select 1 as \"_lit\" from \"note_shares\" where (\"s\".\"note_id\" = \"notes\".\"id\" and \"s\".\"owner_id\" = \"notes\".\"user_id\" and \"s\".\"shared_with_email\" = ?))) limit ?"}
  ```
  Note `from "note_shares"` with no alias, yet `"s"."note_id"` is referenced → SQLite `no such column: s.note_id`.
- workaround (works): drop the alias, qualify with the full table name.
  ```sql
  exists (
    select 1 from note_shares
    where note_shares.note_id = notes.id
      and note_shares.owner_id = notes.user_id
      and note_shares.shared_with_email = (auth.jwt() ->> 'email')
  )
  ```
  After this change the identical two-user test passed (recipient reads shared note; owner/others unaffected).
- impact: silent footgun. Aliasing a table in a subquery is idiomatic SQL and an LLM will reach for it by default; the failure only appears at query time (not at schema-apply time), and it breaks *every* read of the table, not just shared rows. The error is a generic "Failed to prepare statement", so the alias-dropping cause is non-obvious.
- versions: @supabase/lite@0.7.1-next.5, driver sqlite-postgres, @supabase/supabase-js@2.110.8, bun@1.3.13
- scope check: this is a SQL-translation defect in the AST→SQLite deparser for policy subqueries → a fix would live in the supabase-community/lite repo. Friction, not a proposal.
