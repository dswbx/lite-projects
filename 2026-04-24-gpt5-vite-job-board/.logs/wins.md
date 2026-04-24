### 2026-04-24T07:36Z - clear product prompt
- user supplied the main roles, listing flow, application gate, and overview needs
- why it mattered: enough structure to make conservative product decisions without follow-up questions
- keep: yes

### 2026-04-24T07:52Z - Supabase Lite Vite plugin
- one Vite process mounted both the React app and Supabase-compatible API
- why it mattered: browser testing could cover auth, RLS, seed data, and UI together
- keep: yes

### 2026-04-24T07:55Z - simple RLS policies
- denormalizing `employer_id` onto applications avoided correlated subquery policy problems
- why it mattered: employer and seeker dashboards could use clear policy checks
- keep: yes

### 2026-04-24T08:05Z - expanded win: prompt had enough product shape to avoid scope thrash
- expands: `2026-04-24T07:36Z - clear product prompt`
- what worked: the prompt named the two actors, the permission boundary, and the two dashboards in one compact request
- why it mattered: the app could be designed around a small set of durable entities without follow-up questions: `profiles`, `job_listings`, and `applications`
- prompt detail that helped:

```text
employers can sign up as employers and create job listings with comprehensive detail
job seekers can see listings but only apply once they signed up
both should have an overview
```

- concrete result: the first schema stayed close to the final schema; only `applications.employer_id` was added later to avoid a Supabase Lite SQLite RLS rewrite issue
- counterfactual: if the prompt only said "create a job board", I would have had to invent whether anonymous applications, employer review queues, or seeker dashboards were in scope, and those guesses would be much harder to compare across runs
- keep: yes, prompts for this harness should keep naming roles, permission gates, and required overview screens

### 2026-04-24T08:05Z - expanded win: Vite plugin made Supabase Lite feel like one local app
- expands: `2026-04-24T07:52Z - Supabase Lite Vite plugin`
- parity win: the frontend used `@supabase/supabase-js` unchanged; the local runtime exposed Supabase-compatible `/auth/v1` and `/rest/v1` routes through the Vite server
- lite-specific win: no separate Supabase CLI, Docker service, proxy config, or hosted dashboard was needed for the prototype loop
- doc link: https://github.com/supabase/lite/blob/main/README.md#vite-plugin
- versions: `lite-supa@0.3.2`, `@supabase/supabase-js@2.104.1`, `vite@7.3.2`, `@vitejs/plugin-react@4.7.0`, `@tailwindcss/vite@4.2.4`, `bun@1.3.13`
- config that worked:

```ts
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { supalite } from "lite-supa/vite";

export default defineConfig({
  plugins: [react(), tailwindcss(), supalite()],
  server: {
    port: 5173,
  },
});
```

- client code that worked:

```ts
// src/supabase.ts
import { createClient } from "@supabase/supabase-js";

const fallbackUrl = typeof window === "undefined" ? "http://localhost:5173" : window.location.origin;

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL ?? fallbackUrl,
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? "local-dev-key",
);
```

- runtime signal that made it clear:

```text
Using config file: ./supabase/config.toml
 ➜ Database located at file:./supabase/.temp/worklane-ready.db

[ DATA ] tables: 8 / columns: 92 / indexes: 11
[ AUTH ] enabled: ✓ / tables: 3 / policies: 11

  VITE v7.3.2  ready in 240 ms
```

- counterfactual: without the Vite plugin, I would likely have generated a separate backend process or proxy and spent time wiring ports, env vars, and CORS instead of testing product behavior
- keep: yes, default Vite runs should use `lite-supa/vite` because it preserves one-command local development while still exercising auth, RLS, schema, seed data, and REST queries together

### 2026-04-24T08:05Z - expanded win: Supabase-compatible client API transferred cleanly
- what worked: auth and table access used familiar Supabase client calls, so no custom data SDK or hand-rolled fetch wrapper was needed
- parity win: `auth.signUp`, `auth.signInWithPassword`, `auth.getSession`, `from().select()`, `from().insert()`, and `from().update().eq()` all fit existing Supabase muscle memory
- versions: `lite-supa@0.3.2`, `@supabase/supabase-js@2.104.1`
- snippets that worked:

```ts
const { data } = await supabase.auth.getSession();

const { error } = await supabase.auth.signUp({ email, password });

const { data: publicJobs } = await supabase
  .from("job_listings")
  .select("*")
  .order("created_at", { ascending: false });

await supabase.from("applications").insert({
  job_id: job.id,
  employer_id: job.employer_id,
  seeker_id: user.id,
  applicant_name: profile.full_name,
  applicant_email: user.email,
  cover_letter: coverLetter,
});
```

- why it mattered: once the Supabase Lite config and RLS policies were corrected, most app code read like ordinary Supabase app code; the LLM did not need to invent a repository layer
- not-confusing: the README made the local-only semantics clear enough that I did not try to use hosted Supabase dashboard features
- counterfactual: if the client API had differed, the app would need generated adapter code, more local types, and more chances for model hallucination around auth/session behavior
- keep: yes, this compatibility is the strongest ergonomic win for one-shot app generation

### 2026-04-24T08:05Z - expanded win: TypeScript and Vite surfaced scaffold mistakes early
- what worked: `bun run build` caught the missing Vite type declaration before browser testing
- versions: `typescript@5.9.3`, `vite@7.3.2`, `bun@1.3.13`
- command:

```bash
bun run build
```

- useful error:

```text
src/supabase.ts(6,15): error TS2339: Property 'env' does not exist on type 'ImportMeta'.
src/supabase.ts(7,15): error TS2339: Property 'env' does not exist on type 'ImportMeta'.
```

- fix was obvious and small:

```ts
/// <reference types="vite/client" />
```

- why it mattered: the feedback loop separated a scaffold/type issue from Supabase Lite runtime issues, keeping debugging clean
- counterfactual: without the build check, the first browser run would have mixed frontend type/config problems with schema/auth problems, making the run log harder to interpret
- keep: yes, run `bun run build` before browser verification on generated Vite apps

### 2026-04-24T08:05Z - expanded win: direct SQL check helped separate data from RLS/UI
- what worked: `lite-supa exec` could inspect the local database directly after the browser showed zero jobs
- lite-specific win: the local runtime shipped a CLI command for checking the same DB file used by the Vite plugin
- versions: `lite-supa@0.3.2`, `bun@1.3.13`
- command:

```bash
bunx lite-supa exec "select id, title, status from job_listings"
```

- useful output:

```text
Executing: select id, title, status from job_listings
{
  rows: [
    { id: 1, title: 'Product Designer', status: 'published' },
    { id: 2, title: 'Backend Engineer', status: 'published' },
    { id: 3, title: 'Customer Success Lead', status: 'published' }
  ]
}
```

- why it mattered: this proved the seed data existed and narrowed the problem to session/RLS behavior rather than bad seed data or missing UI rendering
- counterfactual: without a direct DB inspection command, I would have spent more time guessing whether the empty browser state was caused by seed, REST, auth, or React state
- keep: yes, use `lite-supa exec` as a first diagnostic when UI data looks wrong

### 2026-04-24T08:05Z - expanded win: simple RLS policy shape kept the app understandable
- expands: `2026-04-24T07:55Z - simple RLS policies`
- what worked: after the correlated subquery policy failed, adding `employer_id` directly to `applications` made the RLS policy obvious and stable
- final schema shape:

```sql
create table applications (
   id serial primary key,
   job_id integer not null references job_listings(id) on delete cascade,
   employer_id uuid references auth.users(id) on delete cascade,
   seeker_id uuid not null references auth.users(id) on delete cascade,
   applicant_name text not null,
   applicant_email text not null,
   cover_letter text not null,
   status text not null default 'submitted'
);
```

- final policies:

```sql
create policy applications_select_seeker on applications
   for select
   to authenticated
   using (seeker_id = auth.uid());

create policy applications_select_employer on applications
   for select
   to authenticated
   using (employer_id = auth.uid());

create policy applications_update_employer on applications
   for update
   to authenticated
   using (employer_id = auth.uid());
```

- why it mattered: the policy now reads directly as product intent: seekers see their applications; employers see applications to their jobs
- counterfactual: keeping the normalized-only model required a correlated `exists` policy that failed under the SQLite rewrite path and was harder to explain in the generated code
- keep: yes, for Supabase Lite prototypes, prefer direct ownership columns in RLS-protected tables when it keeps policies simple
