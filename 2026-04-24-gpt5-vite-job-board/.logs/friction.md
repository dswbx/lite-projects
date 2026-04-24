### 2026-04-24T07:36Z - approval gate skipped by direct instruction [minor]
- expected: brainstorming skill asks clarifying questions and waits for design approval
- actual: user explicitly said not to ask questions and to use best guess
- hypothesis: run should prioritize AGENTS.md cold-start build over extended design workflow
- suggested improvement: repo instruction could clarify whether one-shot generation should bypass external agent design gates

### 2026-04-24T07:37Z - gh network blocked in sandbox [minor]
- expected: `gh repo view supabase/lite` can fetch the required private repo metadata
- actual: sandbox could not connect to `api.github.com`
- hypothesis: command needs network approval outside the sandbox
- suggested improvement: pre-approve read-only `gh repo view` / `gh api` access for this harness

### 2026-04-24T07:43Z - lite-supa version guessed incorrectly [minor]
- expected: `lite-supa@^0.0.0-alpha.7` would install
- actual: Bun reported no matching version even though the package exists
- hypothesis: README deliberately uses `npm install lite-supa` because the published alpha version changes
- suggested improvement: fetch package version from registry or pin current version in harness docs

### 2026-04-24T07:45Z - Vite env types missing [minor]
- expected: TypeScript recognizes `import.meta.env`
- actual: `tsc -b` reported `Property 'env' does not exist on type 'ImportMeta'`
- hypothesis: manual scaffold omitted `vite-env.d.ts`
- suggested improvement: include the Vite client type file in manual scaffolds

### 2026-04-24T07:46Z - seed SQL multiline strings fail [minor]
- expected: Supabase Lite applies seed listings
- actual: dev server failed during seeding with `Error: incomplete input`
- hypothesis: SQLite execution path does not accept the multiline quoted strings used in `seed.sql`
- suggested improvement: keep seed SQL values on simple single-line literals for this runtime

### 2026-04-24T07:47Z - Vite listen blocked in sandbox [minor]
- expected: `bun run dev` starts Vite on localhost
- actual: Vite failed with `listen EPERM: operation not permitted ::1:5173`
- hypothesis: local server binding requires escalation outside the sandbox
- suggested improvement: pre-approve `bun run dev` for local app verification in this harness

### 2026-04-24T07:49Z - failed seed left partial local database [minor]
- expected: browser smoke test shows seeded public listings
- actual: app loaded with zero listings because the first failed seed left the local DB without seed rows
- hypothesis: Supabase Lite did not re-run seed after schema-only retry on the same DB file
- suggested improvement: document a clean reset command or use a run-specific DB file while iterating

### 2026-04-24T07:50Z - seed runner splits semicolons inside strings [minor]
- expected: semicolon-separated text inside SQL strings is safe
- actual: clean DB still failed with `Error: incomplete input`
- hypothesis: seed runner splits statements on semicolons before respecting SQL string boundaries
- suggested improvement: avoid semicolons in seed string values or improve seed parser

### 2026-04-24T07:51Z - seed runner executes each line independently [major]
- expected: `seed.sql` can contain normal multi-line SQL statements
- actual: `lite-supa` reads seed files, filters comments, and executes each remaining line independently
- hypothesis: seed support is currently intended for one complete statement per line
- suggested improvement: update Supabase Lite seed reader to parse SQL statements instead of lines

### 2026-04-24T07:51Z - seed debugging path for 2026-04-24T07:46Z entry [major]
- tried: multi-line `insert into job_listings (...) values (...)` with multi-line quoted text fields; failed with `Error: incomplete input`
- tried: converting quoted text fields to single-line values while leaving the `insert` statement spread across many lines; still failed with `Error: incomplete input`
- tried: replacing semicolons inside string values with pipe separators; still failed, proving string punctuation was not the main issue
- found: local `node_modules/lite-supa/dist/cli/lib.js` seed loader filters non-empty, non-comment lines and calls `app.connection.exec(seed)` once per line
- worked: rewrote `supabase/seed.sql` as three complete one-line `insert` statements, one statement per seeded job

### 2026-04-24T07:52Z - auth requires jwt_secret in config [major]
- expected: minimal README config was enough for signup
- actual: signup failed with `Server lacks JWT secret`
- hypothesis: current package requires `[auth].jwt_secret` even though README minimal config did not include it
- suggested improvement: document `jwt_secret` in the minimal Vite/auth example

### 2026-04-24T07:54Z - published job RLS needed explicit roles [minor]
- expected: public job policy without `to` applies to both anonymous and authenticated sessions
- actual: browser session after auth config restart showed no jobs while direct SQL showed seeded rows
- hypothesis: Supabase Lite policy handling is stricter or session state exposed an authenticated policy gap
- suggested improvement: write public read policies with explicit `to anon, authenticated`

### 2026-04-24T07:55Z - RLS subquery failed in SQLite policy rewrite [major]
- expected: employer application policy with `exists (select 1 from job_listings...)` works
- actual: application query failed to prepare a rewritten SQLite statement
- hypothesis: Supabase Lite SQLite RLS rewrite currently struggles with correlated subquery policies
- suggested improvement: prefer simple column comparisons in RLS policies or improve subquery rewrite support

### 2026-04-24T08:05Z - task-ready detail: seed runner executes partial SQL lines [major]
- source entries: `2026-04-24T07:46Z`, `2026-04-24T07:50Z`, `2026-04-24T07:51Z`
- reproduction: create a normal multi-line seed file and run `bun run dev` with `lite-supa/vite`
- failing seed shape:

```sql
insert into job_listings (
   employer_id,
   title,
   company_name
) values (
   null,
   'Product Designer',
   'Northstar Labs'
);
```

- failed attempt 1: moved multiline text values onto one line, but kept the SQL statement itself spread over multiple lines; result stayed `Error: incomplete input`
- failed attempt 2: replaced semicolons inside string values with pipes because semicolon splitting looked plausible; result stayed `Error: incomplete input`
- root cause found in installed package: seed files are split into non-empty lines and each line is executed as a standalone SQL statement

```js
// node_modules/lite-supa/dist/cli/lib.js
const seeds = await Promise.all(seed_paths.map(async (seed_path) => {
  return await fs4.readFile(seed_path, "utf-8");
})).then((s) => s.flatMap((s2) => s2.split("\n").filter((s3) => {
  const t = s3.trim();
  return t.length > 0 && !t.startsWith("--");
})));

for (const seed of seeds) {
  await app.connection.exec(seed);
}
```

- workaround that worked: one complete SQL statement per physical line

```sql
insert into job_listings (employer_id, title, company_name) values (null, 'Product Designer', 'Northstar Labs');
insert into job_listings (employer_id, title, company_name) values (null, 'Backend Engineer', 'Harbor Grid');
```

- task suggestion: change Supabase Lite seed loading to parse complete SQL statements instead of executing each line; include regression coverage for multi-line inserts, comments, blank lines, and semicolons inside quoted strings
- acceptance criteria: the failing seed shape above applies successfully, the current one-line seed shape still works, and syntax errors report the complete statement that failed

### 2026-04-24T08:05Z - task-ready detail: failed seed leaves database in confusing partial state [minor]
- source entry: `2026-04-24T07:49Z`
- reproduction: run `bun run dev` with a bad seed; fix only `seed.sql`; rerun against the same `supabase/.temp/*.db`
- observed: schema migration had already created tables, but seed rows were absent; after retry the app showed zero listings even though the code and schema were now valid
- workaround used in this run: changed the local DB filename between retries to force a clean database without deleting files

```toml
[db]
driver = "sqlite-postgres"
url = "file:./supabase/.temp/worklane-ready.db"
```

- task suggestion: when seed execution fails, print a clear recovery hint such as `rerun with --recreate`, delete the temp DB, or mark seed state so the next startup retries seed safely
- acceptance criteria: after a seed failure, the next successful run either reseeds automatically or the CLI prints an explicit reset command before serving stale empty data

### 2026-04-24T08:05Z - task-ready detail: auth config requires jwt_secret [major]
- source entry: `2026-04-24T07:52Z`
- reproduction: use a minimal auth config with signup enabled and no `jwt_secret`; attempt `supabase.auth.signUp(...)` through `@supabase/supabase-js`
- failing config:

```toml
[auth]
enabled = true
jwt_expiry = 3600
enable_signup = true

[auth.email]
enable_confirmations = false
```

- browser-visible failure: `Server lacks JWT secret`
- config that worked:

```toml
[auth]
enabled = true
jwt_secret = "dev-secret-change-me"
jwt_expiry = 3600
enable_signup = true
```

- task suggestion: either make `jwt_secret` required during config validation with a startup-time error, or generate a dev secret during `lite-supa init`
- acceptance criteria: missing `jwt_secret` fails before the app serves, includes the exact config key to add, and the README minimal auth example includes the key

### 2026-04-24T08:05Z - task-ready detail: public RLS policy needed explicit roles [minor]
- source entry: `2026-04-24T07:54Z`
- reproduction: create a public read policy without `to`, sign in, then select published rows through `@supabase/supabase-js`
- ambiguous policy:

```sql
create policy job_listings_select_published on job_listings
   for select
   using (status = 'published');
```

- symptom: anonymous browsing showed seeded listings, but an authenticated browser session showed zero listings while direct SQL showed the rows existed
- workaround that worked:

```sql
create policy job_listings_select_published on job_listings
   for select
   to anon, authenticated
   using (status = 'published');
```

- task suggestion: verify Supabase Lite policy handling matches Postgres/Supabase semantics when `to` is omitted, or document that policies should always include explicit roles
- acceptance criteria: authenticated and anonymous clients both see published rows with the ambiguous policy, or the schema parser emits a warning recommending `to anon, authenticated`

### 2026-04-24T08:05Z - task-ready detail: correlated RLS subquery rewrites to invalid SQLite [major]
- source entry: `2026-04-24T07:55Z`
- reproduction: create an RLS policy using `exists (select 1 ...)` and query the guarded table through the REST API
- failing policy:

```sql
create policy applications_select_employer on applications
   for select
   to authenticated
   using (
      exists (
         select 1 from job_listings
         where job_listings.id = applications.job_id
         and job_listings.employer_id = auth.uid()
      )
   );
```

- generated failure:

```text
Error: no such column: "1" - should this be a string literal in single-quotes?
Failed to prepare statement: select * from "applications"
where ("seeker_id" = ? or exists (select "1" from "job_listings" ...))
```

- workaround that worked: denormalized `employer_id` onto `applications` and used a direct comparison

```sql
create table applications (
   id serial primary key,
   job_id integer not null references job_listings(id) on delete cascade,
   employer_id uuid references auth.users(id) on delete cascade,
   seeker_id uuid not null references auth.users(id) on delete cascade
);

create policy applications_select_employer on applications
   for select
   to authenticated
   using (employer_id = auth.uid());
```

- task suggestion: update the SQLite RLS rewrite so numeric constants inside subqueries stay numeric (`select 1`) rather than quoted as identifiers (`select "1"`), then add coverage for correlated `exists` policies
- acceptance criteria: the failing policy above allows employers to read applications for their own jobs without denormalizing `employer_id`, and seekers can still read only their own applications

### 2026-04-24T08:05Z - task-ready detail: version discovery was required before install [minor]
- source entry: `2026-04-24T07:43Z`
- reproduction: pin a guessed README-era alpha version and run `bun install`
- failing dependency:

```json
{
  "dependencies": {
    "lite-supa": "^0.0.0-alpha.7"
  }
}
```

- observed install error:

```text
error: No version matching "^0.0.0-alpha.7" found for specifier "lite-supa" (but package exists)
```

- workaround that worked:

```bash
bun pm view lite-supa version
# 0.3.2
```

```json
{
  "dependencies": {
    "lite-supa": "^0.3.2"
  }
}
```

- task suggestion: include the current package version or `latest` install command in harness guidance so cold-start runs do not guess from stale examples
- acceptance criteria: a fresh generated app can install `lite-supa` without registry lookup retries

### 2026-04-24T08:05Z - correction: lite-supa version failure was agent-caused [minor]
- correction to: `2026-04-24T07:43Z` and `2026-04-24T08:05Z - task-ready detail: version discovery was required before install`
- actual root cause: the agent manually wrote `package.json` and guessed `lite-supa` version `^0.0.0-alpha.7`
- what should have happened: follow the README command literally, `npm install lite-supa`, or use Bun's equivalent to add the package without guessing a version
- why it matters: this was not caused by unclear package publishing; it was caused by adding an unverified version pin during manual scaffold
- suggested improvement: harness instructions should explicitly say "when docs say `npm install <package>`, do not invent a version; run the install/add command or query the registry first"
