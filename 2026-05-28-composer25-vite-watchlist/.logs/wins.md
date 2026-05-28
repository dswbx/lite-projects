# wins

### 2026-05-28T12:03Z — Vite plugin one-process dev
- `@supabase/lite/vite` `supalite()` mounted auth + rest on same origin as the app
- client: `createClient(window.location.origin, "local-anon-key")` — no `.env` dance
- why it mattered: zero proxy/port mismatch; supabase-js worked immediately
- versions: `@supabase/lite@pkg.pr.new/@supabase/lite@222`, `@supabase/supabase-js@2.106.2`, vite@8.0.14
- parity win: identical mental model to hosted Supabase (origin + anon string)
- snippet:
```ts
import { supalite } from "@supabase/lite/vite";
export default defineConfig({ plugins: [react(), tailwindcss(), supalite()] });
```

### 2026-05-28T12:03Z — PATTERNS.md per-user RLS worked first try
- schema + insert `{ user_id: session.user.id }` from npm `PATTERNS.md`
- curl isolation: user B sees `[]` while user A has rows
- why it mattered: satisfied "each user only sees their own list" without debugging RLS
- lite-specific win: LIMITATIONS.md warned about no `DEFAULT auth.uid()` so I did not waste time on that dead end

### 2026-05-28T12:03Z — PostgREST filters for status + rating sort
- `.eq('watched', false)`, `.order('rating', { ascending: false, nullsFirst: false })` worked on first query build
- why it mattered: filter/sort requirements needed no client-side reimplementation
