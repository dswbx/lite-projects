# Supalite friction

### 2026-09-03T11:25Z — membership-subquery insert policies cannot enforce multi-workspace authorization on SQLite [major]
- expected: each tenant table could use a portable `WITH CHECK (EXISTS (... workspace_members ...))` policy so an authenticated member inserts rows for any workspace they belong to
- actual: `@supabase/lite@0.10.0` documents that subqueries in insert `WITH CHECK` throw on the SQLite translation path because proposed values are evaluated in memory
- impact: the CRM must denormalize `created_by` or `owner_id` and compare it directly with `auth.uid()` for insert policies; role-aware manager writes cannot rely on the natural membership subquery during insertion
- source: `node_modules/@supabase/lite/LIMITATIONS.md` and `node_modules/@supabase/lite/docs/database/rls.mdx`
- planned test: authenticated inserts with direct ownership must pass; cross-user inserts must fail; role-based read/update/delete behavior will be tested independently

### 2026-09-03T11:25Z — Vite Storage requires configuration beyond adding the API prefix [minor]
- expected: enabling `[storage]` and adding `/storage/v1` to the Vite plugin prefixes would provide the documented filesystem-backed local Storage API
- actual: the packaged Storage guide says Storage also requires `EXPERIMENTAL_STORAGE=1` and an explicitly wired adapter, while only the standalone CLI is explicitly documented as auto-wiring the filesystem adapter
- impact: Vite plugin behavior must be validated before application file work; a missing adapter is a package integration gap, not an application error
- source: `node_modules/@supabase/lite/docs/storage/overview.mdx` and `node_modules/@supabase/lite/docs/integrations/vite.mdx`

### 2026-09-03T11:47Z — trigger functions are not resolved across imperative migration files [major]
- expected: a reusable `public.set_updated_at()` trigger function created by an earlier applied PostgreSQL migration remains available to `CREATE TRIGGER` statements in later migrations, as it does in PostgreSQL and Supabase CLI migrations
- actual: @supabase/lite@0.10.0 stops during Vite boot migration translation with `Trigger "set_profiles_updated_at" references unknown function "set_updated_at"`
- boundary: the first migration creates `public.set_updated_at()` and a same-file trigger successfully; the second migration is the first file that creates a trigger which calls the previously recorded function
- hypothesis: the SQLite-Postgres translator scopes its PL/pgSQL trigger-function registry to one migration file instead of rebuilding it from ordered migration history before translating the next file
- workaround attempted next: create the reusable function and all dependent triggers in the same final migration; this preserves portable PostgreSQL SQL but prevents incremental trigger creation
- versions: @supabase/lite@0.10.0, Bun 1.3.13, Vite 8.2.2
- source consulted: `node_modules/@supabase/lite/docs/database/functions-triggers.mdx` and migration history behavior in `docs/database/migrations.mdx`

repro:

```sql
-- supabase/migrations/20260903120000_workspaces.sql
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;

-- same-file trigger translates successfully
create trigger set_workspaces_updated_at before update on public.workspaces
for each row execute function public.set_updated_at();

-- supabase/migrations/20260903120100_profiles.sql
create trigger set_profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
```

error:

```text
Trigger "set_profiles_updated_at" references unknown function "set_updated_at"
```

### 2026-09-03T11:50Z — ALTER TABLE rebuild emits an invalid UUID default expression [major]
- expected: adding the deferred `lead_conversions.opportunity_id` foreign key after the `opportunities` table exists should rebuild the earlier table and preserve its translated `gen_random_uuid()` default
- actual: @supabase/lite@0.10.0 translated the table rebuild with a compound SQLite UUID expression after `DEFAULT` but without the parentheses SQLite requires, then aborted every Vite and Vitest startup with `near "(": syntax error`
- boundary: the same UUID default succeeds during an initial `CREATE TABLE`; the failure occurs only when Supalite re-emits that column while translating `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY`
- impact: portable forward migrations cannot add this cyclic/deferred foreign key without restructuring table creation; the run will avoid this rebuild while retaining an application-level retry-safe conversion link
- versions: @supabase/lite@0.10.0, Bun 1.3.13, Vite 8.2.2

repro:

```sql
create table public.lead_conversions (
  id text primary key default gen_random_uuid(),
  opportunity_id text
);

create table public.opportunities (
  id text primary key default gen_random_uuid()
);

alter table public.lead_conversions
  add constraint lead_conversions_opportunity_id_fkey
  foreign key (opportunity_id) references public.opportunities(id) on delete set null;
```

translated statement and error:

```text
CREATE TABLE "_lead_conversions_migrate_new" ("id" text PRIMARY KEY NOT NULL DEFAULT lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))), "workspace_id" text NOT NULL, "lead_id" text NOT NULL, "account_id" text, "contact_id" text, "opportunity_id" text, "state" text NOT NULL DEFAULT 'started', "error_message" text, "created_by" text NOT NULL, "created_at" text NOT NULL DEFAULT datetime('now'), "updated_at" text NOT NULL DEFAULT datetime('now'), FOREIGN KEY ("created_by") REFERENCES "auth.users"("id") ON UPDATE NO ACTION ON DELETE NO ACTION, FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON UPDATE NO ACTION ON DELETE SET NULL, FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON UPDATE NO ACTION ON DELETE SET NULL, FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON UPDATE NO ACTION ON DELETE CASCADE, FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON UPDATE NO ACTION ON DELETE CASCADE) STRICT

Error: near "(": syntax error
code: ERR_SQLITE_ERROR
errstr: SQL logic error
```

### 2026-09-03T11:59Z — raw SQLite seed runner rejects portable schema-qualified PostgreSQL seed syntax [major]
- expected: `supabase/seed.sql` would pass through the same PostgreSQL-to-SQLite compatibility translation as ordered imperative migrations, allowing portable `public.*`, `auth.*`, and `::jsonb` seed statements that remain ready for full Supabase
- actual: the seed runner executes the file as raw SQLite after migration translation; `::jsonb` fails with `unrecognized token: ":"`, `public.workspaces` fails with `no such table: public.workspaces`, and schema-qualified Auth seed rows cannot target the translated SQLite table names
- impact: public relational inserts had to use dialect-neutral, unqualified table names; three pre-confirmed demo users and identities had to be moved into the final PostgreSQL-dialect migration so they remain valid for `lite upgrade`
- workaround boundary: seed scripts still contain data only and no schema changes, but the demo Auth records now live in migration history rather than `seed.sql`
- versions: @supabase/lite@0.10.0, Bun 1.3.13

observed failures:

```text
unrecognized token: ":" while executing a JSON value cast with ::jsonb
no such table: public.workspaces while executing the first public seed insert
```

### 2026-09-03T11:59Z — hard reset applies migrations but cannot rebuild metadata unless Storage flag is present [minor]
- expected: with `[storage] enabled = true`, `lite db reset --hard` would either initialize the configured Storage metadata or fail before mutating the database with a direct configuration message
- actual: without `EXPERIMENTAL_STORAGE=1`, all migrations applied and the reset failed only afterward with `Applied migration metadata could not be rebuilt`
- impact: the database was left in a partially reported state even though schema work had completed; rerunning the same command with the documented experimental flag succeeded
- successful command: `EXPERIMENTAL_STORAGE=1 bunx --bun lite db reset --hard`
- versions: @supabase/lite@0.10.0, Bun 1.3.13

### 2026-09-03T11:59Z — RLS subquery schema qualifiers remain literal SQLite table names [blocker]
- expected: policy expressions such as `exists (select 1 from public.workspace_members ...)` would translate `public.workspace_members` to the same SQLite table name used by translated DDL
- actual: migrations applied, but the first authenticated workspace lookup generated SQL referencing a literal table named `public.workspaces` and failed with `no such table: public.workspaces`
- impact: all authenticated CRM reads were blocked even though direct seed and migration verification passed
- workaround: use PostgreSQL-compatible unqualified names inside RLS policy subqueries; the default `public` search path resolves them after upgrade and SQLite resolves its actual unqualified tables
- versions: @supabase/lite@0.10.0, @supabase/supabase-js@2.114.0

runtime error:

```text
no such table: public.workspaces
policy: workspace_members_select
operation: select workspace_id, role from workspace_members for an authenticated demo user
```

### 2026-09-03T12:06Z — RLS subquery aliases are dropped while qualified column references remain [blocker]
- correction to the 2026-09-03T11:59Z RLS entry: removing the `public.` schema qualifier exposed a second translator failure in the same policy path
- expected: `from workspaces w where w.id = ...` would preserve both the alias declaration and its qualified references
- actual: Supalite emitted `from "workspaces" where "w"."id" ...`, dropping the alias declaration but retaining `w.id` and `w.owner_id`; authenticated workspace discovery failed with `no such column: w.id`
- workaround: remove aliases from policy subqueries and qualify columns with the full unaliased relation name, which remains valid PostgreSQL
- versions: @supabase/lite@0.10.0

runtime error:

```text
no such column: w.id
generated fragment: from "workspaces" where "w"."id" = ...
```

### 2026-09-03T11:59Z — documented email template path is resolved from process cwd, not config directory [major]
- expected: the packaged email guide's `content_path = "./emails/confirmation.html"` example, placed in `supabase/config.toml`, would resolve beside that config as `supabase/emails/confirmation.html`
- actual: a real confirmation signup tried to read `<project>/emails/confirmation.html` and failed with `ENOENT`; no confirmation response reached the application
- impact: the required real signup/confirmation flow was blocked until the path was rewritten relative to the process working directory
- workaround: set `content_path = "./supabase/emails/confirmation.html"`
- source: `node_modules/@supabase/lite/docs/auth/email.mdx` lines 187-214
- versions: @supabase/lite@0.10.0

### 2026-09-03T12:03Z — upgrade dry run ignores authoritative imperative migration history [blocker]
- expected: a project using the documented imperative-only workflow would generate its upgrade schema from the 26 applied statements stored in `supabase_migrations.schema_migrations`
- actual: `lite upgrade --dry-run` reported `schema statements: 0`, then failed readiness with `No schema statements found in supabase/schemas/*.sql` even though `lite migration list` showed all 26 files applied and the live database had all 38 tables
- contradiction: the installed README says both declarative schemas and imperative migrations are supported and describes migration history as the sole startup authority, but the upgrade path requires a second declarative copy
- impact: the required successful readiness result cannot be produced from an imperative-only project without adding a non-applied upgrade mirror of the migrations
- planned workaround: expose the exact migration files to the upgrade scanner under `supabase/schemas/` while leaving `schema_paths = []`; runtime remains migration-only and the schema files contain no independent source of truth
- warnings that were expected and permitted by the run: Storage and Realtime config migration are not implemented
- versions: @supabase/lite@0.10.0, Bun 1.3.13

command and result:

```text
$ EXPERIMENTAL_STORAGE=1 bunx lite upgrade --dry-run
Running readiness checks...
Readiness Report
  db reachable: yes  schema statements: 0  schema bytes: 0
  auth — users: 3  sessions: 0  identities: 3  refresh_tokens: 0  jwt_secret: set
Errors:
  ✗ No schema statements found in supabase/schemas/*.sql
Warnings:
  ! Storage is enabled but migration is not yet supported
  ! Realtime config migration is not yet supported

Not ready.
```

### 2026-09-03T12:08Z — browser File upload multipart field is incompatible with Supabase Storage client [blocker]
- expected: `supabase.storage.from("crm-files").upload(path, file, options)` with a browser `File` would work like hosted Supabase and the Node Blob path
- actual: @supabase/storage-js@2.100.0 appends Blob/File payloads to `FormData` with an empty field name, while @supabase/lite@0.10.0 accepts multipart uploads only by calling `formData.get("file")`; the real API returned HTTP 400 before writing an object
- response: `{"statusCode":"400","error":"InvalidRequest","message":"Missing file in multipart upload"}`
- impact: the required browser upload flow is blocked when using the canonical File/Blob call shape; bucket creation and authenticated object listing both worked
- workaround tested next: pass `await file.arrayBuffer()` to the same public `supabase.storage.upload` method with an explicit content type, which selects its raw-body branch and remains supported by hosted Supabase
- versions: @supabase/lite@0.10.0, @supabase/supabase-js@2.114.0, @supabase/storage-js@2.100.0

relevant client/server behavior:

```ts
// @supabase/storage-js
body = new FormData()
body.append('', fileBody)

// @supabase/lite
const file = (await request.formData()).get('file')
if (!file) throw new InvalidRequest('Missing file in multipart upload')
```

### 2026-09-03T12:10Z — direct-owner insert fallback does not enforce workspace membership [major]
- validation of the 2026-09-03T11:25Z membership-subquery entry proved the security impact through the real Data API
- actor: Jamie, an authenticated user with no Atlas North membership
- request: insert an Atlas North account with both `owner_id` and `created_by` set to Jamie's own user ID
- expected: tenant RLS rejects the cross-workspace insert because Jamie is not an Atlas member
- actual: the insert succeeds because Supalite cannot evaluate the membership subquery for an INSERT `WITH CHECK`, and the compatible direct-owner fallback can only prove that the actor did not impersonate a different user
- cleanup: the serialized Playwright expected-failure test deletes its inserted row with the local secret-key client
- impact: application UI scoping is not a security boundary; an authenticated caller can use the local Data API directly to create owned records in a known foreign workspace ID
- test: `e2e/rls.spec.ts`, “documents the Supalite cross-workspace INSERT check gap”
- versions: @supabase/lite@0.10.0, @supabase/supabase-js@2.114.0

### 2026-09-03T12:12Z — raw-body Storage upload works through the public client API
- correction to the 2026-09-03T12:08Z browser multipart entry: passing `await file.arrayBuffer()` with an explicit content type selects Supabase Storage JS's raw-body upload branch
- result: browser upload, private object listing, byte-verified download, CRM metadata/link creation, unlinking, object removal, and metadata removal all passed through the real Supalite API
- boundary: canonical browser `File`/`Blob` multipart upload remains incompatible; the application uses a hosted-Supabase-compatible public API overload rather than simulating Storage

### 2026-09-03T12:23Z — upgrade shim audit replays Auth foreign keys before creating Auth schema [blocker]
- correction to the 2026-09-03T12:03Z upgrade entry: 26 schema-path symlinks to the authoritative migrations satisfy the readiness scanner without changing runtime migration behavior
- readiness result: 289 schema statements, 38 public tables, three views, 2,872 public rows, three Auth users, and 18 Storage objects were discovered; the CLI printed `Ready to upgrade`
- expected: the documented in-memory rehearsal creates Supabase-compatible roles and the packaged Auth base schema before it applies user schema, Auth rows, and application rows
- actual: before printing the rehearsal report, the SQLite shim audit replays the runtime schema in a bare PGlite instance and aborts on the first ordinary `references auth.users(id)` foreign key
- impact: the requested `lite upgrade --dry-run` command exits 1 for a normal Auth-linked imperative schema even after readiness succeeds; removing the Auth foreign keys would reduce the production schema's referential integrity and conceal the package defect
- source inspected: packaged `UPGRADE.md` “Rehearsal and Readiness” and `node_modules/@supabase/lite/dist/cli/index.js` audit/rehearsal ordering
- versions: @supabase/lite@0.10.0, Bun 1.3.13

command and final output:

```text
$ bun run upgrade:check
Running readiness checks...
Readiness Report
  db reachable: yes  schema statements: 289  schema bytes: 83380
  auth — users: 3  sessions: 18  identities: 3  refresh_tokens: 18  jwt_secret: set
  ...
Warnings:
  ! Storage is enabled but migration is not yet supported
  ! Realtime config migration is not yet supported

Ready to upgrade.
error: relation "auth.users" does not exist
error: script "upgrade:check" exited with code 1
```

debug query captured from the packaged PGlite error:

```sql
create table public.workspaces (
  -- preceding columns omitted
  owner_id uuid not null references auth.users(id),
  created_by uuid not null references auth.users(id)
);
```

### 2026-09-03T12:31Z — relational membership keys close the cross-workspace write gap [resolved]
- correction to the 2026-09-03T12:10Z direct-owner insert entry: each tenant table now has `(workspace_id, created_by)` as a composite foreign key to `workspace_members(workspace_id, user_id)`
- result: Jamie's authenticated attempt to create an Atlas account is rejected with `FOREIGN KEY constraint failed`; the Playwright test now requires rejection instead of marking the insecure behavior as an expected failure
- migration result: all 26 files apply cleanly, and all 2,872 deterministic public rows satisfy the new tenant membership constraints
- security boundary: direct-owner RLS proves actor ownership while the relational key proves workspace membership; this preserves a PostgreSQL-compatible upgrade path without an application-only check
- remaining limitation: the foreign key proves membership presence, not the `active` status value, so suspending a member must also revoke or remove the membership row to prevent new writes
- versions: @supabase/lite@0.10.0, @supabase/supabase-js@2.114.0

### 2026-09-03T12:32Z — PostgreSQL view security controls are not accepted by the SQLite translator [major]
- expected: reporting views could remain in `public` with either `security_invoker = true`, an `auth.uid()` membership predicate, or explicit `REVOKE` statements so callers never bypass base-table RLS
- actual, in order:
  1. `create view ... with (security_invoker = true)` failed with `DefElem security_invoker not supported`
  2. a view predicate calling `auth.uid()` failed with `Function call "uid" not supported`
  3. `revoke all on ... from anon, authenticated` failed with `Unsupported node type: GrantStmt`
- resolution in this run: moved the three reporting views to a `private` schema, outside the public Data API; the dashboard queries RLS-protected base tables through Supabase JS
- impact: public reporting views cannot safely rely on ordinary PostgreSQL view-security mechanisms in this release; the compatible private-schema design remains safe and upgrades to hosted Supabase
- versions: @supabase/lite@0.10.0, Bun 1.3.13

### 2026-09-03T12:38Z — final upgrade rehearsal still fails after successful readiness [blocker]
- correction to the 2026-09-03T12:23Z upgrade entry: the final hardened schema contains 290 statements and three private reporting views; readiness still discovers every table, 2,872 public rows, three Auth users, and 18 Storage objects
- unchanged result: the command prints `Ready to upgrade` and then exits 1 with `relation "auth.users" does not exist`
- acceptance impact: the requested successful `lite upgrade --dry-run` result cannot be claimed on @supabase/lite@0.10.0; all other clean-database and application checks pass

### 2026-09-03T12:38Z — correct resolved Storage client version
- correction to version metadata in the 2026-09-03T12:08Z browser File upload entry: the final locked dependency is @supabase/storage-js@2.114.0, not 2.100.0
- verified: the same empty multipart field behavior is present in `node_modules/@supabase/storage-js/src/packages/StorageFileApi.ts` at the handed-off lockfile state

### 2026-09-03T13:37Z — private Storage download crashes the dev server when its FileHandle reaches garbage collection [major]
- expected: after a real authenticated `storage.upload`, `storage.download` should return a Blob that can be consumed for a private profile-photo preview without destabilizing the local API
- actual: the upload, profile update, Blob response, and rendered image all completed, but shortly afterward Node terminated the Vite/Supalite process because a Storage FileHandle was closed by garbage collection instead of explicitly by the runtime
- impact: a serialized Playwright run lost its web server after the profile-photo scenario; the following private-file scenario timed out at navigation. This makes repeated browser preview/download operations unreliable even though their requests can initially succeed.
- observed with: @supabase/lite@0.10.0, @supabase/supabase-js@2.114.0, @supabase/storage-js@2.114.0, Node v26.7.0, Bun 1.3.13, macOS
- triggering application code (`src/hooks/use-profile.ts` before the correction):

```ts
const downloaded = await supabase.storage.from("crm-files").download(data.avatar_url)
if (!downloaded.error && downloaded.data) {
  avatarSrc = await blobToDataUrl(downloaded.data)
}
```

- exact server failure:

```text
[Error: A FileHandle object was closed during garbage collection. This used to be allowed with a deprecation warning but is now considered an error. Please close FileHandle objects explicitly. File descriptor: 61 (.../supabase/.temp/storage/crm-files/ws-atlas/10000000-0000-4000-8000-000000000001/profile/avatar)] {
  code: 'ERR_INVALID_STATE'
}

Node.js v26.7.0
error: script "dev" exited with code 1
```

- command: `bun run db:reset && bunx playwright test e2e/crm.spec.ts e2e/pipeline-files.spec.ts e2e/settings.spec.ts e2e/zz-storage.spec.ts --max-failures=8`
- correction used for avatar rendering: keep the real private upload but use the public `createSignedUrl(path, 3600)` API for image display. This avoids materializing the object as a JavaScript Blob; the separate byte-verified text-file download test remains in the suite so the affected API is not hidden.

### 2026-09-03T13:43Z — createSignedUrl response casing produces `/storage/v1undefined` [major]
- expected: the packaged Storage overview says the `@supabase/supabase-js` Storage client works unchanged, and `createSignedUrl(path, 3600)` should return a usable private-object URL
- actual: the Supalite endpoint returns JSON with a lowercase `signedUrl` key. `@supabase/storage-js@2.114.0` expects upstream Storage's `signedURL` response key, then constructs its public result from that value. The resulting client URL is `http://127.0.0.1:5173/storage/v1undefined`; fetching it returns the Vite HTML shell instead of the image.
- versions: @supabase/lite@0.10.0, @supabase/supabase-js@2.114.0, @supabase/storage-js@2.114.0
- package documentation: `node_modules/@supabase/lite/docs/storage/overview.mdx`, “For the shipped surface, `@supabase/supabase-js`'s `storage` client works unchanged.”
- public-client repro:

```ts
const result = await client.storage.from("crm-files").createSignedUrl(profile.avatar_url, 3600)
console.log(new URL(result.data!.signedUrl).pathname)
// /storage/v1undefined
```

- intercepted response shape (token value intentionally omitted):

```text
request: /storage/v1/object/sign/crm-files/ws-atlas/<user-id>/profile/avatar
server JSON keys: ["signedUrl"]
server signed path: /storage/v1/object/sign/crm-files/ws-atlas/<user-id>/profile/avatar
storage-js result path: /storage/v1undefined
```

- workaround in this run: the app client has a focused local-runtime fetch compatibility adapter that duplicates `signedUrl` as `signedURL` only on successful `/storage/v1/object/sign/*` responses. It remains a real `supabase.storage.createSignedUrl` call, is covered by a unit test, and is disabled whenever `VITE_SUPABASE_URL` selects hosted Supabase.

### 2026-09-03T13:45Z — signed URL compatibility also requires removing the duplicated Storage base path
- correction to the 2026-09-03T13:43Z entry: copying the response value to `signedURL` exposed a second response-shape mismatch
- Supalite returns `/storage/v1/object/sign/...`; upstream Storage returns `/object/sign/...` because storage-js already prefixes its configured `.../storage/v1` base URL
- without normalizing both differences, storage-js produced `/storage/v1/storage/v1/object/sign/...` and the private image request returned HTTP 404
- final local-only adapter maps Supalite's `{ signedUrl: "/storage/v1/object/sign/..." }` to the additional upstream-compatible `{ signedURL: "/object/sign/..." }`; the original lowercase field remains intact and hosted responses pass through unchanged

### 2026-09-03T13:48Z — signed URL redemption also triggers the FileHandle crash
- correction to the 2026-09-03T13:37Z download entry: after normalizing the signed-URL response to the upstream shape, the browser successfully rendered the private PNG, but the signed object GET still left the filesystem adapter's FileHandle open and crashed Node during garbage collection
- result: the defect is in local filesystem object delivery, not specifically in storage-js's Blob conversion; both authenticated `download()` and signed URL redemption can trigger it
- local-runtime containment: the uploaded photo remains a real private Storage object and `profiles.avatar_url` remains its authoritative path, while the browser retains the just-selected image as a local display cache. Hosted Supabase continues to use the real signed URL. This avoids repeatedly fetching the affected local object route and keeps the hosted upgrade path intact.
- verification boundary: the byte-verified text preview/download scenario still exercises real local object delivery at the end of the serialized suite; it is not replaced with a mock or data fixture

### 2026-09-03T14:10Z — Storage folder RLS cannot compare a path segment to a membership row [major]
- expected: a private workspace file policy should allow active members of the workspace named by the first object-path segment to read an object, using the documented `storage.foldername(name)` helper
- actual: Supalite's RLS compiler only permits the right side of a `storage.foldername` comparison to be a literal or auth placeholder; it rejects a column supplied by the membership subquery before creating the database
- impact: the direct and portable Supabase policy shape for workspace-shared private files cannot migrate in this release
- versions: @supabase/lite@0.10.0, Bun 1.3.13
- command and full error:

```text
$ EXPERIMENTAL_STORAGE=1 bunx --bun lite db reset --hard

 ➜ removed supabase/.temp/data.db
EXPERIMENTAL FEATURES ENABLED: storage - not supported, do not use in production. Cloud sync (lite cloud deploy) is disabled.
│
■  Error: Unsupported expression: storage.foldername RHS comparisons require a literal or auth placeholder
error: script "db:reset" exited with code 1
```

- rejected policy excerpt (`supabase/migrations/20260903122400_tenant_rls.sql`):

```sql
create policy crm_files_select on storage.objects for select to authenticated
using (
  bucket_id = 'crm-files'
  and exists (
    select 1 from workspace_members
    where workspace_members.workspace_id = (storage.foldername(name))[1]
      and workspace_members.user_id = auth.uid()
      and workspace_members.status = 'active'
  )
);
```

- next compatible attempt: compare the object name to an active membership's `workspace_id || '/%'` prefix inside the same subquery; this preserves the authorization rule without calling `storage.foldername`

### 2026-09-03T14:11Z — Storage RLS compiler also rejects dynamic path-prefix concatenation
- correction to the 2026-09-03T14:10Z attempted workaround: replacing `storage.foldername` with `name like workspace_members.workspace_id || '/%'` also fails at database creation
- exact result:

```text
■  Error: Unsupported expression: Unsupported operator: ||
error: script "db:reset" exited with code 1
```

- compatible design under test: authorize objects through the existing `file_assets.storage_path = storage.objects.name` relation and the asset's active workspace membership, while retaining direct owner read access for profile-photo objects that intentionally do not have a `file_assets` row

### 2026-09-03T14:12Z — Storage RLS subqueries resolve unqualified public tables into the storage schema
- correction to the 2026-09-03T14:11Z compatible design: the policy migrated, but object delivery rewrote unqualified `file_assets` and `workspace_members` references as `storage.file_assets` and `storage.workspace_members`
- exact runtime failure: `Error: no such table: storage.file_assets`
- generated query excerpt from Supalite's error output:

```sql
exists (
  select 1 from "storage.file_assets"
  where "storage.file_assets"."storage_path" = "name"
    and exists (select 1 from "storage.workspace_members" ...)
)
```

- impact: the owner's preview was also rejected because the full policy query failed during preparation before SQLite could short-circuit the owner branch
- next attempt: explicitly schema-qualify both references as `public.file_assets` and `public.workspace_members`; the policy and teammate download remain covered by the serialized browser suite

### 2026-09-03T14:14Z — explicit public qualification is also rewritten beneath storage [blocker]
- correction to the 2026-09-03T14:12Z attempt: explicit `public.file_assets` became `storage.public.file_assets`, and the nested membership reference became `storage.public.public.workspace_members`
- exact runtime failure: `Error: no such table: storage.public.file_assets`
- generated query excerpt:

```sql
from "storage.public.file_assets"
...
from "storage.public.public.workspace_members"
```

- conclusion: @supabase/lite@0.10.0 cannot enforce this cross-schema membership-subquery Storage SELECT policy using any of the three portable shapes tried in order: `storage.foldername`, dynamic prefix matching, or relational metadata lookup
- containment: restored the stricter owner-only object policy that the package accepts. File metadata and entity links remain workspace-visible, but only the uploading user can preview or download object bytes locally. The application does not conceal or bypass the enforcement gap. Full Supabase migration should replace this policy with the rejected `storage.foldername` membership policy, which is retained in this entry for reference.

### 2026-09-03T14:16Z — RLS SELECT translator drops FROM aliases but keeps alias-qualified columns [major]
- expected: a profile policy with two separately aliased `workspace_members` references should distinguish the target profile's memberships from the current user's memberships
- actual: database migration succeeded, but the first authenticated `profiles.select()` failed with `no such column: target_membership.user_id`; the generated SQLite query had removed the alias declarations while retaining their qualified column references
- affected shape:

```sql
exists (
  select 1 from workspace_members as target_membership
  where target_membership.user_id = profiles.id
    and exists (
      select 1 from workspace_members as viewer_membership
      where viewer_membership.workspace_id = target_membership.workspace_id
        and viewer_membership.user_id = auth.uid()
    )
)
```

- compatible equivalent used: alias-free nested membership queries with `workspace_id in (select workspace_id from workspace_members ...)`; this enforces the same self-or-active-shared-workspace rule
- verification: the real Data API test proves Alex sees Alex and Sam but not Jamie, while Jamie sees Jamie and Sam but not Alex

### 2026-09-03T15:43Z — upgrade rehearsal fails after reporting readiness [blocker]
- final-state confirmation of the 2026-09-03T12:23Z and 2026-09-03T12:38Z entries
- expected: after the documented dry run completes every readiness check, discovers the full schema and data inventory, and prints `Ready to upgrade`, the command should exit successfully or continue into a rehearsal whose Auth schema exists before application foreign keys are replayed
- actual: readiness succeeds, but the subsequent PGlite shim audit replays `public.workspaces` before it creates the referenced `auth.users` relation; the command exits 1 with `relation "auth.users" does not exist`
- impact: Signal Desk cannot satisfy a successful `lite upgrade --dry-run` exit without removing normal Auth foreign keys or editing the authoritative schema solely to conceal a package ordering defect; the application keeps its referential integrity and records upgrade readiness as blocked
- reproducibility: confirmed after the final clean reset, deterministic relational seed, and public-client Storage seed; the database contained 38 public tables, 2,872 public rows, three Auth users, one private bucket, and 18 Storage objects
- versions: @supabase/lite@0.10.0, @supabase/supabase-js@2.114.0, Bun 1.3.13
- package sources inspected: `node_modules/@supabase/lite/UPGRADE.md` (“Rehearsal and Readiness”) and the shipped CLI implementation in `node_modules/@supabase/lite/dist/cli/index.js`

command and terminal result:

```text
$ bun run upgrade:check
$ EXPERIMENTAL_STORAGE=1 bunx --bun lite upgrade --dry-run --config supabase/upgrade.toml

Running readiness checks...
Readiness Report
  db reachable: yes  schema statements: 290  schema bytes: 108515
  auth — users: 3  sessions: 18  identities: 3  refresh_tokens: 18  jwt_secret: set
  tables: 38 public tables, 3 private views, 6 Auth tables, 2 Storage tables
  public rows: 2872
  storage.buckets: 1 row
  storage.objects: 18 rows
Warnings:
  ! Storage is enabled but migration is not yet supported
  ! Realtime config migration is not yet supported

Ready to upgrade.
error: relation "auth.users" does not exist
error: script "upgrade:check" exited with code 1
```
