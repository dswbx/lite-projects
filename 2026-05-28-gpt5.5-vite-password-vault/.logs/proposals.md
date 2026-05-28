# Proposals

## README / package docs

### 2026-05-28T07:05Z - include common DDL validation function compatibility in shipped docs
- observed: a simple non-blank text check using `trim()` blocked migration in this run and produced `Function call "btrim" not supported`; see `friction.md` entry `2026-05-28T07:02Z`.
- propose: add a small "Common schema validation expressions" section to the package README or STATUS translation docs that says whether functions like `trim`, `lower`, `upper`, and `length` work in CHECK constraints on the SQLite translator path.
- why it helps LLMs: a cold-start agent writing Postgres DDL for forms commonly reaches for `CHECK (length(trim(name)) > 0)`. A public compatibility note would either steer the agent to a supported expression or make the unsupported function obvious before running the dev server.
- source for this proposal: `friction.md` entry `2026-05-28T07:02Z`.

## Skill seeds (future `supalite` skill)

### 2026-05-28T07:06Z - must-fetch package README and STATUS before choosing APIs
- observed: the installed package README answered the Vite integration path and `@supabase/supabase-js` client shape, while STATUS answered whether RLS and `ilike` were supported for the user's per-user search requirement.
- propose: a future `supalite` skill should tell agents to inspect `node_modules/@supabase/lite/README.md`, `node_modules/@supabase/lite/STATUS.md`, and relevant type definitions immediately after installing the pinned package.
- why it helps LLMs: this keeps version-specific API choices tied to the npm tarball the user requested, while avoiding stale memory or hosted Supabase assumptions.
- counterfactual: without reading those package files, I might have built a separate server or skipped RLS instead of using the documented Vite plugin and Supabase-compatible client.
