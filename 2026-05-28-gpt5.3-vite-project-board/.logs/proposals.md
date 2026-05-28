## README / package docs

### 2026-05-28T00:10:00Z — document `tslib` dependency expectation for Vite plugin consumers
- observed: first `npm run build` failed on missing `tslib` transitively required via `@supabase/functions-js` while using `@supabase/lite/vite` plugin.
- propose: add a short troubleshooting note in package README under Vite integration, or ensure dependency metadata always brings `tslib` automatically.
- why it helps LLMs: cold-start agents often validate with `npm run build`; this specific failure looks unrelated to user code and can waste cycles.
- source for this proposal: friction.md entry `2026-05-28T00:09:00Z`.

## Skill seeds (future `supalite` skill)

### 2026-05-28T00:07:00Z — must-fetch package docs before coding
- observed: reading `node_modules/@supabase/lite/README.md`, `STATUS.md`, and `LIMITATIONS.md` clarified that `@supabase/supabase-js` client shape should be used and that Vite plugin exists.
- propose: skill should instruct agents to read those three files immediately after install, before generating schema/client code.
- counterfactual: without this fetch-first step, it would be easy to guess a non-existent lite-specific client API.
