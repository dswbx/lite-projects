## README / package docs

### 2026-07-22T00:00Z — make the "preview mounts the API" story single-sourced
- observed: LIMITATIONS.md and README.md ship contradictory statements about `vite preview` (see friction.md — "shipped docs contradict each other"). This is currently a defect (friction), but the forward-looking docs proposal is structural: the preview/dev/start behavior matrix is stated in three places (README "When to use what", README "Vite plugin", LIMITATIONS "Runtime / dev") and drifted.
- propose: keep the authoritative runtime matrix in exactly one shipped file (e.g. a `RUNTIME.md` or the README "When to use what" table) and have LIMITATIONS.md link to it instead of restating the behavior. One source can't contradict itself.
- why it helps LLMs: a cold-start agent is told to read LIMITATIONS.md first; if the behavioral truth lives there verbatim it will rot independently of README. A pointer can't drift.
- source: friction.md L (vite preview contradiction entry).

### 2026-07-22T00:00Z — add a one-liner "timestamps from lite vs hosted" note to STATUS/LIMITATIONS
- observed: `timestamptz` on the `sqlite-postgres` path returns `"YYYY-MM-DD HH:MM:SS"` (no `T`, no offset). Even once the serialization is fixed (that's the friction), a cold-start agent benefits from an explicit "how do timestamps serialize, and how should client code parse them" line, because `new Date(row.created_at)` is the single most common thing generated code does with a returned row.
- propose: one bullet in LIMITATIONS.md under a "Data serialization" heading stating the exact string format lite emits for `timestamptz`/`timestamp` on each driver, and whether it carries an offset — so agents know whether to treat it as UTC.
- why it helps LLMs: removes a guess about timezone handling that otherwise only surfaces as a bug in production. Pointer-style (format spec, not a workaround), so it survives the eventual serialization fix — the fix would just change the documented format string.
- source: friction.md L (timestamptz serialization entry).

## Skill seeds (future `supalite` skill)

### 2026-07-22T00:00Z — update the skill's stale "use window.location.origin" guidance
- observed: the supalite skill's `known-limits.md` and its anti-patterns still say the Vite plugin does NOT inject `VITE_SUPABASE_URL` and to fall back to `window.location.origin` (referencing lite issue #27). In @supabase/lite@0.7.1-next.5 the plugin injects **both** `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, and the documented `import.meta.env.*` snippet works with no `.env` and no origin hack.
- propose: the skill should NOT hard-code either behavior. Instead it should route the agent to re-read `node_modules/@supabase/lite/README.md` ("Vite plugin" section) each run and use whatever env-var contract that version documents.
- why it helps LLMs: this exact detail flipped between releases. A skill that encodes the specific answer will be wrong half the time; a skill that says "read the installed README's Vite plugin section for the current env-var contract" stays correct across releases. Concrete general principle: **never encode version-specific env/plugin contracts in the skill — point at the installed README.**
- source: wins.md L (Vite plugin injects both env vars).

### 2026-07-22T00:00Z — cold-start checklist item: verify the requested dist-tag before installing
- observed: prompt said "latest `next` release". `npm view @supabase/lite dist-tags` returned `next = 0.7.1-next.5` (distinct from `latest = 0.7.0`). Installing `@next` by tag would also have worked, but resolving the exact version first made the pin explicit and reproducible in logs.
- propose: skill should instruct agents, when a prompt names a channel/tag ("next", "canary", "beta") rather than a semver, to run `npm view @supabase/lite dist-tags` first, log the resolved version, and pin that exact version.
- why it helps LLMs: makes the run reproducible (the tag moves; the pinned version doesn't) and satisfies the harness's "use exactly the pinned version" rule without ambiguity.
- source: progress.md L (cold start / dist-tag resolution).

### 2026-07-22T15:20Z — safer DB iteration story: don't wipe to apply schema; make reset non-footgun
- observed (this run): I repeatedly reached for `rm -rf supabase/.temp` to get a clean state while iterating, and once did it during commit cleanup and destroyed the user's notes. Two things made `rm` feel like the default:
  1. It wasn't obvious that schema changes are already **additive** — I verified by experiment that the declarative diff does ALTER/CREATE (existing rows survive a restart), so a wipe is almost never needed just to apply new schema. That fact isn't front-and-center where an agent iterating would see it.
  2. After any reset, live browser sessions become ghosts and the very next insert fails with an opaque `500 {"code":"SUP","message":"Error: FOREIGN KEY constraint failed"}` (see friction.md) — so a reset silently breaks a running app in a way that's hard to diagnose.
- propose (docs): a short "Iterating locally" note in README/STATUS stating (a) schema edits are additive and do not require deleting `supabase/.temp` / the data file; (b) to intentionally reset, use `lite db reset` (replays migrations + seed) rather than `rm`; (c) resetting invalidates existing auth sessions, so clients should validate with `getUser()` and re-auth.
- propose (skill seed, general + non-staling): supalite skill should tell agents "prefer non-destructive iteration; do NOT `rm -rf supabase/.temp` to apply schema changes (they're additive); if you must reset, it wipes data — only on throwaway data. After a reset, expect stale sessions." This is a workflow/decision rule (skill-appropriate), not an API specific.
- why it helps LLMs: directly prevents the exact data-loss + wedged-app sequence this session hit; routes agents to the additive-diff guarantee and `lite db reset` instead of a destructive `rm`.
- source: friction.md (FK 500 error shape) + progress.md 2026-07-22T15:15Z (self-inflicted wipe + fix).
