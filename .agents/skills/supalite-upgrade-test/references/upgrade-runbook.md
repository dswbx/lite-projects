# Upgrade runbook (`lite upgrade`)

`UPGRADE.md` shipped in the installed package is authoritative — `cat node_modules/@supabase/lite/UPGRADE.md` and `bunx lite upgrade --help` before relying on anything here. The flags and gotchas below were validated on a canary build and may change.

## Targets

- `--target local` (recommended for verification): spins up a real local Supabase stack via the Supabase CLI + Docker. No cloud account, no PAT. Leaves the stack running after success.
- `--target hosted` (default; opt-in here): creates a real hosted project via the Management API. Needs `SUPABASE_ACCESS_TOKEN` (or `--supabase-token`) plus `--org-id/--region/--project-name`.

## Local verification (the loop)

```bash
# 0. baseline e2e must be green on supalite first (no env vars)
bun run test:e2e

# 1. seed the local sqlite db if needed (the Vite plugin applies schema on dev start)
#    (only needed if supabase/.temp was removed)
bun run dev   # wait until ready, then stop

# 2. readiness + in-memory rehearsal, no changes
bunx lite upgrade --dry-run

# 3. real upgrade into a local Supabase stack
bunx lite upgrade --target local --force --no-migrate-sessions

# 4. grab the API URL + anon key from the command output, or:
bunx supabase@<pinned> status -o json

# 5. re-run the SAME suite against the upgraded backend
VITE_SUPABASE_URL="http://127.0.0.1:NNNNN" \
VITE_SUPABASE_ANON_KEY="<anon key>" \
bun run test:e2e
# → assert the same pass set as step 0
```

## Gotchas (observed; re-verify against your version)

### The CLI must run under the bun runtime for `--target local`
The local-target path may `import 'bun'`, which only resolves under bun. If `bunx lite upgrade --target local` crashes with `Error: Cannot find package 'bun' imported from .../dist/cli/index.js`, the bin ran under node. Force bun:

```bash
bun --bun node_modules/@supabase/lite/dist/cli/index.js upgrade --target local --force --no-migrate-sessions
```

### The schema-apply step needs the `postgres` npm driver
If you see `Driver 'postgres' selected but 'postgres' is not installed. Run: bun add postgres` (this happens *after* Docker is up), install it and re-run:

```bash
bun add postgres        # or: npm install postgres  (match your project's package manager)
```

### `--target local` rewrites your project's `config.toml`
The default workdir is the project dir, so the upgrade overwrites `supabase/config.toml` — it drops the supalite `[db].driver = "sqlite-postgres"` / `[db].url` and adds Supabase-CLI sections/ports. After that, `bun run dev` (supalite) no longer works until restored. To stay non-destructive:

- run with `--local-dir <tmp-dir>` so the Supabase CLI workdir/config lives elsewhere, **or**
- back up `config.toml` before and restore after (`git checkout supabase/config.toml` if it's tracked).

### Installing a `pkg.pr.new` canary of `@supabase/lite`
Bun may reject a `pkg.pr.new` URL with a `DependencyLoop` error. Fall back to npm:

```bash
npm install "https://pkg.pr.new/supabase-community/lite/@supabase/lite@<n>"
```
and use npm for the rest of that project's installs (note the switch; a `package-lock.json` will appear).

## Teardown

```bash
bunx supabase@<pinned> stop --workdir . --no-backup
rm -rf supabase/.branches supabase/.temp supabase-credentials.json
# restore config.toml if you ran the in-place local upgrade
git checkout supabase/config.toml
# confirm supalite dev + baseline e2e are green again
bun run test:e2e
```

To rerun a local upgrade cleanly in the same workdir, stop the stack and remove `supabase/.branches` + `supabase/.temp` first (see UPGRADE.md "Local Supabase").

## Known gaps (from UPGRADE.md, not bugs)

- Storage and Realtime config migration are not implemented (warned, upgrade continues).
- Local target does not preserve sessions / JWT secret — use `--no-migrate-sessions`; users re-authenticate after upgrade. (That's fine for e2e, which signs up fresh users per test.)

## Hosted lane (opt-in)

```bash
SUPABASE_ACCESS_TOKEN="<pat>" \
bunx lite upgrade --target hosted --dry-run     # check first
SUPABASE_ACCESS_TOKEN="<pat>" \
bunx lite upgrade --target hosted --org-id <org> --region <region> --project-name <name> --force
# then re-run the suite against the returned URL/anon key; tear the project down after
```
Keep the PAT out of the repo (e.g. a gitignored `.env`, `set -a; source .env; set +a`). Don't hardcode it.
