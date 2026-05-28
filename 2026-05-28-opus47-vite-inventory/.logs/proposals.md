## README / package docs

### 2026-05-28T08:00Z — show the "supabase-js + lite/vite" minimal app in README
- observed: the README's "Vite plugin" section gives the `vite.config.ts` snippet and a client snippet, but they're separated by config docs. As a cold-start LLM I had to assemble the picture: (1) install `@supabase/lite` + `@supabase/supabase-js`, (2) plugin in `vite.config.ts`, (3) `lite init` for `supabase/`, (4) put DDL in `schemas/schema.sql`, (5) point supabase-js at the dev origin.
- propose: add a "Quick start (Vite)" subsection in `node_modules/@supabase/lite/README.md` that lists those 5 steps as a single contiguous block, with the full minimal files (`vite.config.ts`, `supabase/schemas/schema.sql` with one RLS'd table, and a 5-line `client.ts`). Reuse the existing snippets — just put them next to each other.
- why it helps LLMs: a single self-contained recipe is one fetch; the current layout was two fetches plus inference. Faster cold start, no risk of mismatched versions/snippets.
- source: this run — I built it correctly but had to mentally stitch the README sections together

### 2026-05-28T08:00Z — call out that supabase-js URL can be the Vite origin
- observed: README's vite-plugin client snippet uses `import.meta.env.VITE_SUPABASE_URL`, implying you set an env var. But with the plugin the API is served on the same origin as the app, so `window.location.origin` (or just a relative client) is the simplest dev setup. I chose `window.location.origin` myself; an explicit note would have saved the decision.
- propose: in the README vite-plugin section, add one sentence: "Because the plugin mounts the API on the Vite dev server itself, you can pass `window.location.origin` (or any base — the path is what matters) as the URL; an env var is only useful when targeting a separate API host."
- why it helps LLMs: removes a small-but-real decision point ("do I need a .env file?") and prevents the cargo-culted `.env` that's pointless in dev

## Skill seeds (future `supalite` skill)

### 2026-05-28T08:00Z — must-fetch resource: package README + STATUS.md, in that order
- observed: README explained the *how* (vite plugin, supabase-js as-is, project layout); STATUS.md explained the *what's supported* (the 47/74 supabase-js methods on SQLite, RLS support matrix, auth method support). Both were essential. Reading them in that order let me plan the run before writing a line of code.
- propose: skill should instruct the agent to `cat node_modules/@supabase/lite/README.md` and `STATUS.md` immediately after `bun add @supabase/lite`, before authoring schema or client code. Skip hosted Supabase docs unless something is missing.
- why it helps LLMs: avoids the failure mode of guessing at hosted Supabase features that lite doesn't ship (e.g. `rpc()` on SQLite is ❌; Realtime/Edge Functions are 🔄). One pre-flight read of STATUS.md prunes the search space.
- counterfactual: without this, an LLM might write an `rpc('foo')` call and burn a debugging loop discovering it's not implemented for SQLite

### 2026-05-28T08:00Z — anti-pattern: don't run `lite dev` in a separate terminal when using Vite
- observed: the CLI section of README documents `lite dev` as the dev server, but the Vite plugin replaces it entirely. An LLM skimming "Quick start" first will reach for `lite dev` and write a two-process setup (or a proxy) when a Vite project doesn't need it.
- propose: skill should encode the routing rule — "if the project uses Vite, use `@supabase/lite/vite` plugin; do not also run `lite dev`. If headless / non-Vite, use `lite dev`."
- why it helps LLMs: one decision tree avoids a whole class of misconfigurations (CORS, double DB instances, port conflicts)
- source: README "Vite plugin" section, second sentence: "skip the separate CLI + proxy setup"

### 2026-05-28T08:00Z — pattern: per-row owner via `auth.uid()` is the canonical multi-tenant shape
- observed: building a "each user sees only their own X" feature reduced to: (1) `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE` on the table, (2) `ENABLE ROW LEVEL SECURITY`, (3) four policies (SELECT/INSERT/UPDATE/DELETE) all keyed on `user_id = auth.uid()`, (4) client passes `user_id: session.user.id` in the insert payload. Worked first try.
- propose: skill should recognize prompts like "each user only sees their own X" / "private to the user" / "personal tracker" and emit this exact pattern as a starting point, citing README + STATUS.md for the RLS specifics.
- why it helps LLMs: the pattern is small and Postgres-standard, but the gotcha (client must include `user_id` in the insert because lite's SQLite RLS evaluates `WITH CHECK` in-memory against the supplied values; per STATUS.md "Subquery `WITH CHECK` on `INSERT`" is a limitation) is easy to miss. Encoding the pattern saves one debug round per run.
- public source: `node_modules/@supabase/lite/STATUS.md` "Row Level Security (RLS)" + "Known limitations (SQLite)" table
