# friction

### 2026-05-19T07:06Z — pkg.pr.new @supabase/lite@191 returns 404 [major]

- expected: `bun add https://pkg.pr.new/@supabase/lite@191` installs PR 191 per user request (also posted on [supabase-community/lite#191](https://github.com/supabase-community/lite/pull/191#issuecomment-4477357064))
- actual: registry and HTTP HEAD both 404

```bash
$ bun add @supabase/supabase-js https://pkg.pr.new/@supabase/lite@191
error: GET https://pkg.pr.new/@supabase/lite@191 - 404
```

```bash
$ npm view https://pkg.pr.new/@supabase/lite@191 version
npm error code E404
```

- tried: commit ref `a8f4493`, `pr191`, `sha-a8f4493` URLs on pkg.pr.new — all 404
- tried: `github:supabase-community/lite#a8f4493` via bun — 404 on tarball API
- workaround: installed published `@supabase/lite@0.0.1` from npm (commit `a8f44935820b5405cb4f6c234b2d7dff7b9d1b8b` verified via `gh api` on private repo)
- versions: bun@1.3.13, @supabase/lite@0.0.1, @supabase/supabase-js@2.106.0
- suggested improvement: republish pkg.pr.new artifact for open PRs or document TTL/expiry

### 2026-05-19T07:07Z — building lite@a8f4493 from source failed [minor]

- context: attempted local build from PR tarball when pkg.pr.new unavailable
- error:

```
src/server/studio.tsx:17:43: ERROR: Could not resolve "../../dist/static/.vite/manifest.json"
```

- outcome: used npm prebuilt `@supabase/lite@0.0.1` instead (later replaced; see correction below)

### 2026-05-19T07:06Z — correction: local tarball from user [resolved]
- user provided: `/Users/dennis/Documents/conductor/workspaces/lite/cli-memory-usage-investigation/app/supabase-lite-0.0.1.tgz`
- `bun install` with `"@supabase/lite": "file:…/supabase-lite-0.0.1.tgz"` succeeded
- tarball ships `dist/vite/index.js` but **not** `dist/vite/index.d.ts` despite `package.json` `"types": "./dist/vite/index.d.ts"` — `tsc -b` failed until project shim added
- workaround: root `supabase-lite-vite.d.ts` included from `tsconfig.node.json`
- `bun run build` and `bun dev` ok after shim

### 2026-05-19 — correction: rebuilt tarball includes vite types [resolved]
- user rebuilt `supabase-lite-0.0.1.tgz` with `dist/vite/index.d.ts` included
- reinstalled (`rm -rf node_modules/@supabase/lite && bun install`); removed project shim `supabase-lite-vite.d.ts`
- `bun run build` passes without local declaration file
- note: first reinstall after rebuild hit `Integrity check failed for tarball` — fixed by dropping stale `sha512` on `@supabase/lite` in `bun.lock` and re-running `bun install`

### 2026-05-19T07:26Z — schema hot-reload replays indexes [major]
- test: added `company text` to `contacts` in `supabase/schemas/schema.sql` while `bun dev` running (no restart)
- watcher fired: `Schema changed: supabase/schemas/schema.sql`
- migration failed: `CREATE INDEX "contacts_name_idx"` — `index contacts_name_idx already exists`
- `lite migration diff` correctly shows only `+ contacts.company` but `--execute` hits same index error
- workaround during test: `ALTER TABLE contacts ADD COLUMN company TEXT` via sqlite3; column count in dev log went 76 → 77
- after reload, REST `select=id,name,company` and UI insert with company worked without restarting dev server
- versions: local `@supabase/lite` tarball (cli-memory-usage-investigation)

### 2026-05-19T07:52Z — index lines in schema.sql break additive hot-reload [resolved]
- verification: removed `create index` lines from schema; added `nickname text` while `bun dev` running → watcher applied only `+ contacts.nickname`, columns 77→78, no errors
- control: with `create index contacts_*_idx` lines present, `lite migration diff` bundles `+ contacts.<col>` **and** `+ contacts_name_idx` / `+ contacts_user_id_idx` even when indexes already exist in DB
- original `company` failure: watcher errored on `CREATE INDEX contacts_name_idx` (`already exists`), not on adding the column
- drop column: removing `nickname` from schema triggered `DataLossError` (safety), separate from index issue
- note: concurrent `lite migration diff --execute` while dev is running can cause `database is locked`
