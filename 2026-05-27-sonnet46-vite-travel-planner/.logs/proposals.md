## README / package docs

### 2026-05-27T17:54Z — document embedded table filtering support explicitly in STATUS.md

- observed: uncertain whether `.eq('relatedTable.column', value)` dotted-path filtering on embedded resources works on the SQLite backend for nested join queries. Rewrote query to avoid it (see friction.md). STATUS.md lists "Partial: `contains`, `containedBy`, `overlaps`" but does not call out dotted-path filter syntax on embedded tables.
- propose: add a row or note to STATUS.md under the Data API section clarifying whether `eq('table.column', value)` cross-table dot-path filter is supported on SQLite. If not, add a migration note: "use `.in('fk_column', ids)` instead of filtering on embedded table columns."
- why it helps LLMs: a cold-start agent generating any multi-table query will reach for the dotted-path syntax immediately (it's in official supabase-js docs). Without knowing it may not work on SQLite, they'll write it, get a confusing result or error, and burn time debugging.
- source: friction.md paragraph on cross-table embedding query avoidance.

### 2026-05-27T17:55Z — mention `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` injection in the Vite plugin section of README

- observed: the README Vite plugin section shows `import.meta.env.VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the client snippet but does not explicitly state that the plugin injects these variables automatically (no `.env` file needed).
- propose: add one sentence: "The plugin automatically injects `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` into `import.meta.env` -- no `.env` file is required."
- why it helps LLMs: without this note, an agent following the snippet will add a `.env` file or hardcode the values, and then be confused when things work without it or conflict when both sources exist.
- source: wins.md "Vite plugin: single-process setup" entry.

## Skill seeds (future `supalite` skill)

### 2026-05-27T17:56Z — trigger phrase: "use supabase locally" / "local-only" / "lite"

- observed: user prompt said "use https://www.npmjs.com/package/@supabase/lite/v/0.3.1-next.1" (explicit), but many prompts won't be this explicit. A skill should trigger on "supabase locally", "supabase lite", "local supabase", "offline supabase", "browser sqlite supabase".
- propose: skill trigger list includes those phrases. On trigger: immediately read `node_modules/@supabase/lite/README.md` and `STATUS.md` before writing any code, then prefer the Vite plugin path for Vite projects.

### 2026-05-27T17:57Z — must-fetch resource: README.md + STATUS.md from node_modules after install

- observed: README.md answered the Vite plugin setup, init command, and `@supabase/supabase-js` client shape. STATUS.md contains the feature matrix and partial-support notes (e.g. `.contains`, embedding support). Both are in the npm tarball.
- propose: skill should instruct agents to read `node_modules/@supabase/lite/{README.md,STATUS.md}` immediately after `bun add @supabase/lite`, before writing any code. This gives the agent the current version's surface area instead of guessing from training data.
- counterfactual: without reading these files first, an agent might try to use `rpc()` on SQLite (not supported), or use an OAuth sign-in method (not yet implemented), wasting tokens on dead ends.

### 2026-05-27T17:58Z — default path for Vite projects: use the Vite plugin, not `lite dev`

- observed: README shows both a standalone `lite dev` CLI path and a Vite plugin path. For Vite apps, the plugin is strictly better: single process, auto env injection, schema hot-reload built-in, no port proxy.
- propose: skill should short-circuit to the plugin path when the project uses Vite. Decision tree: "Vite project? → use `@supabase/lite/vite`. Non-Vite? → use `lite init` + `lite dev`."
