## README / package docs

### 2026-05-28T12:36Z — publish a short section for restricted-network setups
- observed: `npm create vite` failed in this environment due to npm registry policy, while package URL install succeeded
- propose: add a brief docs note describing a no-scaffold/manual setup path that still uses @supabase/lite
- why it helps LLMs: allows a cold-start agent to proceed when normal stack scaffolding is blocked
- source for this proposal: friction.md entry at 2026-05-28T12:34Z

## Skill seeds (future `supalite` skill)

### 2026-05-28T12:36Z — include fallback decision step for scaffold failures
- observed: app scaffolding failed before package integration work could begin
- propose: skill should include a fallback branch: if stack scaffold fails, continue with a minimal static app and still integrate requested @supabase/lite package version
- why it helps LLMs: preserves run validity under constrained environments
