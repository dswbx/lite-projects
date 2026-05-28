## README / package docs

### 2026-05-28T12:04Z — seed RLS policies with `TO authenticated` in `lite init` template
- observed: on first `bun dev`, supalite warned four times that policies copied from `PATTERNS.md` have no `TO` clause and apply to PUBLIC
- propose: change default `supabase/schemas/schema.sql` stub (or PATTERNS.md example) to `create policy ... to authenticated using (...)` so new projects start without warnings
- why it helps LLMs: agents copy PATTERNS verbatim; warnings look like mistakes and trigger unnecessary schema edits
- source: progress.md dev server log entry 2026-05-28T12:03:00Z

## Skill seeds (future `supalite` skill)

### 2026-05-28T12:04Z — must-fetch: PATTERNS before multi-tenant schema
- observed: per-user watchlist was implemented by following `node_modules/@supabase/lite/PATTERNS.md` before writing SQL
- propose: skill step "if prompt mentions per-user / own data, read PATTERNS.md multi-tenant section before schema.sql"
- counterfactual: without it I might have added `DEFAULT auth.uid()` and hit LIMITATIONS.md dead end
