### 2026-06-18T00:30Z — `lite upgrade --target local` rewrites config.toml + starts Docker stack BEFORE checking the `postgres` driver, then fails half-way [major]

Surfaced while validating the `supalite-upgrade-test` skill on this project (upgrade lane, `@supabase/lite@0.5.0`).

- expected: `lite upgrade --target local` either bundles/declares the driver it needs, or fails its readiness/rehearsal phase (which both passed) before mutating the project or starting Docker.
- actual: the in-memory pglite rehearsal passed, then the command rewrote `supabase/config.toml` in place (stripping the supalite `[db].driver`/`[db].url`), started the local Supabase Docker stack, and only THEN tried to apply the schema with the `postgres` npm driver — which is not installed — and aborted on the first DDL statement. This leaves the project in a half-migrated state: `config.toml` already rewritten (so `bun run dev`/supalite is broken until restored) and a Supabase stack left running, even though no schema was applied.

```
◇  Local Supabase is running at http://127.0.0.1:49402

Your project's supabase/config.toml was rewritten in place for the local Supabase CLI. The original was backed up to supabase/config.toml.bak. ...
■  Error: Failed SQL (schema 1/6): Error: Driver 'postgres' selected but 'postgres' is not installed. Run: bun add postgres
│  CREATE TABLE items (
│     id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
│     ...
■  Canceled
```

- workaround (matches UPGRADE.md "rerun cleanly"): `bun add postgres`, then `bunx supabase@2.98.1 stop --workdir . --no-backup`, `rm -rf supabase/.branches supabase/.temp`, and rerun `bunx lite upgrade --target local --force --no-migrate-sessions`. Second run completed and the same e2e suite passed 7/7 against the upgraded stack.
- suggestion: treat `postgres` as a real dependency of the local-upgrade path (declare it / install on demand), OR add a readiness check for the selected driver that runs BEFORE rewriting `config.toml` and starting Docker. The driver requirement is knowable up front; discovering it after the destructive/side-effecting steps is the painful part.
- versions: @supabase/lite@0.5.0, bun 1.3.13, supabase CLI 2.98.1 (via `bunx supabase@2.98.1`), Docker running. `postgres@3.4.9` after the fix.
- note: `postgres@3.4.9` was added to `package.json` dependencies to complete the upgrade. It is only needed for the local-upgrade path, not for supalite dev — flagged here so the human can decide whether to keep it in this run's manifest.
