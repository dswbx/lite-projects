# wins

### 2026-05-14T08:55Z — local tarball `lite-supa` installs like any npm package

- `package.json` dependency: `"lite-supa": "file:/Users/dennis/supabase/lite/lite/app/lite-supa-0.4.0.tgz"` — `npm install` unpacks and resolves `lite-supa/vite` and the runtime the same as a registry version
- why it mattered: no registry publish required to dogfood a specific pack
- versions: `lite-supa@0.4.0` (tarball), `@supabase/supabase-js@^2.105`

### 2026-05-14T08:56Z — same-origin Supabase client + `supalite()` Vite plugin

- pattern used:

```ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  window.location.origin,
  'any-string-works-for-now',
)
```

- `vite.config.ts`: `import { supalite } from 'lite-supa/vite'` then `plugins: [react(), tailwindcss(), supalite()]`
- parity win: PostgREST + GoTrue shaped flows work with familiar `@supabase/supabase-js` calls (`auth`, `.from().select/insert/update/delete`)
- why it mattered: no extra env for API URL in dev; RLS + `authenticated` role behave like hosted Supabase for app code

### 2026-05-14T09:02Z — RLS template for per-user tables

- `journal_entries` policies mirror the usual `user_id = auth.uid()` pattern with `to authenticated` on all CRUD
- why it mattered: isolation requirement is enforced in the database, not only in the UI
