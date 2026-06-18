---
name: supalite-upgrade-test
description: Use when adding end-to-end tests to an app built on `@supabase/lite` (supalite) and/or verifying that upgrading it to full Supabase (`lite upgrade`) does not change behavior. Triggers on phrases like "add e2e tests for this supabase/supalite app", "verify the upgrade to Supabase", "upgrade supalite to full supabase", "make sure the upgrade didn't break anything", "test the upgrade path", or a project that depends on `@supabase/lite` and needs upgrade verification. Pairs with the `supalite` skill (base patterns/limitations).
---

# supalite-upgrade-test

Build one e2e suite that runs unchanged against **both** local supalite and the **upgraded** full Supabase, then use it as a regression gate around `lite upgrade`. The whole point: if the upgrade changes any user-visible behavior, a test fails.

This is the maintainer-intended verification loop (see `node_modules/@supabase/lite/UPGRADE.md` → "Testing the Upgrade Path"). Read that file first — it is the source of truth and rides the installed version. This skill routes you through it and warns about gotchas; **specifics below may go stale, so always re-read the installed `UPGRADE.md` and `lite upgrade --help`.**

## Prerequisites

- Docker running (the `--target local` upgrade starts a real Supabase stack).
- Bun (the `lite` CLI's local-target path requires the **bun** runtime — see runbook).
- The app already works on supalite (`bun run dev` serves it).

## Workflow

1. **Bump `@supabase/lite` to latest, then cold-start the docs.** These projects pin old canary/pre-release versions that usually predate or lag the `lite upgrade` command — **bump without asking**: `bun add @supabase/lite@latest` (or `npm install @supabase/lite@latest` for an npm-locked project). The baseline must end up green on the bumped version anyway, so an old pin only hides upgrade-path bugs. Then read the installed docs: `cat node_modules/@supabase/lite/{LIMITATIONS,README,UPGRADE}.md` and confirm the CLI: `bunx lite upgrade --help`. (Use the `supalite` skill for base API/limitations.) If the bump breaks the supalite baseline, fix minimally and log it as a `@supabase/lite` friction.

2. **Make the client URL/key env-configurable** so one build targets either backend. See `references/playwright-setup.md`. The pattern:
   ```ts
   const url = import.meta.env.VITE_SUPABASE_URL ?? window.location.origin;
   const key = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "any-string-works-for-now";
   export const supabase = createClient(url, key);
   ```
   In a Vite app, also skip the embedded supalite plugin when `VITE_SUPABASE_URL` is set (so it doesn't bind the port / read a rewritten config). See the runbook.

3. **Scaffold Playwright** with an env-driven `baseURL` and a `webServer` that inherits `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`. Template in `references/playwright-setup.md`.

4. **Author e2e covering all cases.** Enumerate from the app itself, not guesswork: every data-layer function (each `from().select/insert/update/delete`, each `auth.*` call) and **every RLS policy**, including cross-user isolation. Each test creates a **unique random user** so the suite is idempotent and safe to re-run against a migrated database. Build a coverage checklist and confirm no gaps — see `references/coverage-checklist.md`.

5. **Baseline: run e2e against supalite** (no env vars → Vite plugin path). Must be all-green before upgrading. A red baseline means fix tests/app first; do not upgrade on red.

6. **Upgrade to local Supabase** (default verification target — no cloud, no PAT): `lite upgrade --dry-run` (readiness + rehearsal) then `lite upgrade --target local --force --no-migrate-sessions`. Read the new API URL + anon key from the command output (or `supabase status -o json`). The runbook covers the bun-runtime and `postgres`-driver gotchas and how to keep it non-destructive.

7. **Re-run the SAME suite against upgraded Supabase**: set `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` and run `test:e2e` again. **Assert the same pass set as the baseline.** Identical green = upgrade preserved behavior; any new failure is an upgrade regression to report.

8. **Teardown** the local stack and restore the project (the local upgrade rewrites `config.toml`). See runbook.

9. **(Opt-in) hosted lane.** Only if asked: `SUPABASE_ACCESS_TOKEN=... lite upgrade --target hosted ...` (creates a real cloud project). Same re-run-and-compare step.

10. **Log upgrade frictions.** Anything broken/unclear in `lite upgrade` itself goes in the project's `friction.md` (per the repo's logging protocol), not encoded as a permanent workaround here.

11. **Record state in `UPGRADES.md`** (repo root). This is the at-a-glance index of which projects have been through this skill. Mark the project **done** and fill its row: number of e2e tests, what's tested (auth / CRUD / filters / RLS isolation / etc.), the `@supabase/lite` version it was upgraded with, baseline vs upgraded result (e.g. `7/7 ↔ 7/7`), and the date performed. If `UPGRADES.md` doesn't exist yet, create it with a row for **every** project directory (the `YYYY-MM-DD-<model>-<stack>-<name>/` slugs) marked **pending**, then flip the one you just finished to done.

## Anti-patterns

- Don't hardcode the Supabase URL/key — the suite can't switch backends.
- Don't reuse a fixed test email — re-running against a migrated DB collides. Generate a unique user per test.
- Don't upgrade on a red baseline — you can't tell upgrade regressions from pre-existing failures.
- Don't run the real upgrade in the project dir if you want to keep developing on supalite afterward — it rewrites `config.toml`. Use `--local-dir` or back up/restore (runbook).
- Don't encode version-specific CLI flags as gospel — re-read `lite upgrade --help`; the command is pre-1.0 and changes.

## References

- `references/playwright-setup.md` — env-configurable client, `playwright.config.ts`, conditional Vite plugin, scripts.
- `references/coverage-checklist.md` — how to enumerate all cases and prove completeness.
- `references/upgrade-runbook.md` — exact upgrade commands, local-target gotchas (bun runtime, `postgres` driver, in-place `config.toml` rewrite), teardown, hosted lane.
