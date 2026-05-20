# wins log (append-only)

### 2026-05-20T09:30:00Z — pkg.pr.new @supabase/lite@203 installed and vite plugin booted first try
- command: `npm i https://pkg.pr.new/@supabase/lite@203`
- why it mattered: user mandated this exact package; failure would abort the run
- outcome: `@supabase/lite@0.0.1` in `node_modules`, `supalite()` in `vite.config.ts` applied schema on `bun dev` with no extra CLI
- parity win: same `@supabase/supabase-js` client as hosted Supabase
- snippet:
```ts
import { supalite } from "@supabase/lite/vite";
export default defineConfig({ plugins: [react(), tailwindcss(), supalite()] });
```
- counterfactual: separate `lite dev` + proxy wiring would have been more moving parts

### 2026-05-20T09:32:00Z — RLS + auth.uid() pattern from todo example transferred directly
- policies: select/insert/update/delete all scoped with `user_id = auth.uid()` and `to authenticated`
- why it mattered: satisfied “each user only sees their own list” without app-layer filtering
- versions: @supabase/lite@0.0.1 (pkg 203), @supabase/supabase-js@2.106.0
- doc/source: `gh api repos/supabase/lite/contents/examples/todo/supabase/schemas/schema.sql`

### 2026-05-20T09:32:30Z — auth + CRUD smoke test passed in one session
- `signUp` → insert book → update status → save rating/review via supabase-js against `window.location.origin`
- why it mattered: confirmed enum column `book_status`, nullable rating/review, and JWT session end-to-end
- not-confusing: anon key placeholder `"any-string-works-for-now"` matches lite README for local dev

### 2026-05-20T09:31:30Z — Tailwind v4 vite plugin zero config beyond import
```css
@import "tailwindcss";
```
- versions: tailwindcss@4.3.0, @tailwindcss/vite@4.3.0
- why it mattered: custom theme tokens (`--color-paper`, `--font-display`) without postcss setup
