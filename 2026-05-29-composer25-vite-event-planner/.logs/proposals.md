## README / package docs

### 2026-05-29T12:56:00Z — PATTERNS.md link from LIMITATIONS for child tables
- observed: guests table needed denormalized user_id; found answer in PATTERNS + LIMITATIONS anti-pattern, not README quick start
- propose: in LIMITATIONS or README "multi-table apps" bullet, link PATTERNS#per-user and note child rows should carry owner user_id on SQLite inserts
- why it helps LLMs: event+guest apps are common; avoids failed INSERT with EXISTS subquery
- source: progress.md schema step, PATTERNS.md read during run

## Skill seeds (future `supalite` skill)

### 2026-05-29T12:56:00Z — event planner stack recipe
- observed: event list + guest RSVPs + per-user isolation fit standard RLS + embedded select pattern
- propose: skill trigger "event planner", "guest list", "RSVP" → read PATTERNS per-user + plan events/guests tables with guests.user_id
- why it helps LLMs: routes to canonical pattern without inventing alternate auth

### 2026-06-10T01:50Z — UPGRADE.md should list local-target prerequisites up front
- observed: `lite upgrade --target local` required two things UPGRADE.md doesn't call out as prereqs: the CLI must run under the **bun** runtime (a bare `import 'bun'` crashes under node, friction 01:10Z), and the `postgres` npm driver must be installed for the schema-apply step (friction 01:20Z). Both surfaced only *after* Docker/Supabase had started.
- propose: add a "Local target prerequisites" block to UPGRADE.md (bun runtime, Docker running, `postgres` driver installed, Supabase CLI reachable) and fold those into the pre-flight readiness check so they fail fast, before the stack spins up.
- why it helps LLMs: a cold-start agent following UPGRADE.md verbatim hits two mid-flight crashes; listing prereqs (and checking them in readiness) converts two failed runs into zero.
- source: friction.md 2026-06-10T01:10Z, 01:20Z

### 2026-06-10T02:00Z — document the non-destructive local-verify pattern (--local-dir)
- observed: default `lite upgrade --target local` rewrites the project's own `supabase/config.toml`, dropping the `sqlite-postgres` driver and breaking subsequent supalite dev (friction 01:40Z). For an upgrade-*verification* loop (run e2e on supalite → upgrade → run same e2e on Supabase → keep developing on supalite) this is destructive.
- propose: in UPGRADE.md, document a "verify without mutating your project" recipe: use `--local-dir <tmp>` (or back up/restore `config.toml`) so the project stays runnable on supalite after the verification. A stronger warning before the in-place config rewrite would also help.
- why it helps LLMs: the e2e-before/after-upgrade workflow is the maintainer-intended test (UPGRADE.md "Testing the Upgrade Path"); making it non-destructive by default lets agents loop it safely.
- source: friction.md 2026-06-10T01:40Z

## Skill seeds (future `supalite` skill)

### 2026-06-10T02:10Z — e2e + upgrade-verification is a portable workflow worth its own skill
- observed: the whole loop (make client URL/key env-configurable → Playwright suite covering every data-layer call + auth + each RLS policy + cross-user isolation → run green on supalite → `lite upgrade` → re-run the SAME suite against Supabase → assert identical pass set) is generic across supalite apps, not specific to this event planner.
- propose: a `supalite-upgrade-test` skill that triggers on "add e2e tests", "verify the upgrade", "upgrade supalite to supabase", "make sure the upgrade didn't break anything", encoding: (1) env-configurable client snippet, (2) Playwright config with env-driven baseURL + webServer env passthrough, (3) coverage checklist derived from the app's data layer/auth/RLS, (4) the green→upgrade→green verification gate, (5) the local-target gotchas above (bun runtime, postgres driver, --local-dir, restore config).
- general-principle bias: keep version-specific bits (canary URLs, CLI flags) as "read the installed package's UPGRADE.md / `lite upgrade --help` first" pointers; the gotchas above may be fixed in later releases.
- why it helps LLMs: turns a multi-step, easy-to-get-wrong verification into a repeatable routine; the unique-user-per-test rule makes the suite idempotent so it's safe to re-run against a migrated database.
- source: this run's validation on canary @236
