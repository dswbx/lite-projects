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
