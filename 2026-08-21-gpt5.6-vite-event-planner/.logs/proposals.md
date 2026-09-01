## README / package docs

### 2026-08-21T14:27Z — publish a short SQL function compatibility lookup
- observed: `char_length()` in a declarative schema was rejected by the SQLite translation path (see `friction.md`, 2026-08-21T14:27Z), despite being a familiar Postgres function for a text-length constraint.
- propose: add a compact table to `LIMITATIONS.md` or `PATTERNS.md` listing common constraint functions with their supported SQLite-path spelling, including `length()` for text length, and link it from the declarative-schema section of README.
- why it helps LLMs: it prevents an otherwise reasonable Postgres schema from aborting all boot migrations, which produced the misleading downstream `auth.users` failure in this run.

### 2026-08-21T14:30Z — document RLS subquery support or fix `WITH CHECK` evaluation
- observed: a relational `EXISTS` `WITH CHECK` policy for a child table crashed with `Cannot evaluate operator "type" client-side` (see `friction.md`, 2026-08-21T14:30Z).
- propose: if unsupported by design, add it to `LIMITATIONS.md` with a clear safe relational ownership alternative; otherwise fix the evaluator so the normal Postgres policy works.
- why it helps LLMs: direct owner-column policies are easy, but a child resource normally needs its parent ownership verified. An undocumented workaround can weaken a schema's data-integrity guarantee.

## Skill seeds (future `supalite` skill)

### 2026-08-21T14:25Z — must-read package resources for Vite per-user apps
- observed: installed `README.md` established the Vite plugin/client setup and `PATTERNS.md` provided both the per-user RLS policy shape and the SQLite requirement to send `user_id` in inserts.
- propose: trigger on phrases such as "each user sees only their own" and direct the agent to read the currently installed `README.md`, `LIMITATIONS.md`, and `PATTERNS.md` before writing schema or client code.
- counterfactual: coding from generic hosted-Supabase assumptions risks omitting `user_id` from inserts or using SQL unsupported by the selected local driver.
