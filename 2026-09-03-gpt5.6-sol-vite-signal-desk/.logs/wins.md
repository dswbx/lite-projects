# Supalite wins

### 2026-09-03T11:25Z — installed package gave a complete cold-start map
- `LIMITATIONS.md` identified the SQLite RLS constraint before schema authoring, and the packaged docs provided the exact migration, OAuth, email, Storage, Vite, and upgrade paths
- why it mattered: the run could use public package contents as its only source of truth without inspecting a repository or guessing APIs
- versions: @supabase/lite@0.10.0, @supabase/supabase-js@2.114.0
- parity win: imperative migration filenames and history match the Supabase CLI, and the same Supabase JS Auth and Storage methods are documented

### 2026-09-03T12:19Z — a large imperative schema resets quickly and deterministically
- exactly 26 ordered migration files created 38 relational tables, three reporting views, 154 runtime policies, triggers, constraints, and indexes in one clean command
- two earlier resets and the final reset produced the same 2,872 public rows plus three confirmed Auth users and identities
- why it mattered: even at CRM scale, the local migration-and-seed feedback loop stayed under two seconds on this machine
- parity win: the timestamped forward migration workflow and PostgreSQL-oriented SQL remain recognizable to Supabase users
- versions: @supabase/lite@0.10.0, Bun 1.3.13

### 2026-09-03T12:20Z — Auth, Data API, and private Storage work together in one Vite process
- the same `@supabase/supabase-js` client handled email-confirmation signup, resend, password sessions, RLS-scoped CRUD, private object upload/download/removal, and metadata links
- browser verification: 13 serialized Playwright tests passed; downloaded file bytes matched exactly before removal
- why it mattered: there is no mock transport or alternate local data path to discard during a future Supabase upgrade
- parity win: public client method shapes transferred directly, with only the documented raw-body Storage overload needed for the multipart incompatibility
- versions: @supabase/lite@0.10.0, @supabase/supabase-js@2.114.0

### 2026-09-03T12:38Z — database constraints complement the compatible RLS subset
- a PostgreSQL-compatible composite foreign key closed the cross-workspace INSERT gap without adding a mock authorization path or app-only security check
- exact browser proof: a signed-in non-member's tenant insert failed, while owner and manager CRUD continued to pass through the real Data API
- why it mattered: the migration remains feasible for full Supabase and the local database, not the interface, remains the security boundary
- versions: @supabase/lite@0.10.0, @supabase/supabase-js@2.114.0
- final browser result: all 14 serialized Playwright tests passed

### 2026-09-03T13:48Z — ordinary foreign-key updates support useful CRM connection editors
- the existing account, contact, opportunity, price-book, profile, activity, task, and quote foreign keys could be exposed through one named relationship contract without changing the 26-migration chain
- exact API shape: each selector loads a workspace-scoped `from(table).select(labelFields).eq("workspace_id", workspaceId)` query, while saving continues through the audited repository update
- why it mattered: the follow-up moved from opaque UUID fields to visible, editable relationships without embedded joins, dotted-path filters, RPC, mock lookup lists, or an upgrade-hostile schema change
- browser proof: a contact linked to a newly created account displayed that account's name in the table, and an opportunity opened from the board retained its account selector
- versions: @supabase/lite@0.10.0, @supabase/supabase-js@2.114.0

### 2026-09-03T13:54Z — one real-client suite covers the denser interaction surface
- 17 serialized Chromium scenarios passed against the same Supalite Vite process after a clean migration and seed
- new proof includes full-row and keyboard detail opening, named relationship writes, pipeline detail updates, read-only audit details, private profile-photo upload, owner organization updates with audit, and private text preview/download/removal
- why it mattered: the requested UX improvements reuse the same Data, Auth, Storage, RLS, and audit boundaries as the original CRM instead of branching into presentation-only fixture behavior
- versions: @supabase/lite@0.10.0, @supabase/supabase-js@2.114.0, Playwright 1.58.2

### 2026-09-03T14:19Z — Bun runtime keeps repeated real Storage delivery stable
- forcing Vite through `bun --bun vite` let the same real Supabase JS upload, preview, browser download, and removal flow finish reliably after Node 26 had terminated on the package's unclosed filesystem handle
- why it mattered: the acceptance test retains byte-level private Storage coverage instead of substituting a mock or skipping delivery
- final proof: all 19 serialized Chromium scenarios passed in 23.1 seconds, including two object reads in the last Storage scenario
- versions: Bun 1.3.13, @supabase/lite@0.10.0, @supabase/storage-js@2.114.0

### 2026-09-03T14:41Z — relational constraints make membership suspension immediate
- an active-status creator attestation backed by a composite `workspace_members` foreign key lets an ordinary membership status update revoke creator-based writes across the CRM without an application-only deny list
- why it mattered: the local RLS subset cannot use membership subqueries in INSERT checks, but familiar SQL constraints still provide a portable database boundary for cross-workspace and suspended-user writes
- browser proof: all 21 serialized Chromium scenarios passed, including suspended-member insert/update/delete denial and a different active admin updating a record created by the owner
- versions: @supabase/lite@0.10.0, @supabase/supabase-js@2.114.0, Playwright 1.58.2
