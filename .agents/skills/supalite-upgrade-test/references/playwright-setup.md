# Playwright setup for dual-backend e2e

Goal: one suite that runs against supalite (default) and full Supabase (env override), driven through the real browser so auth + RLS are exercised end to end.

## 1. Env-configurable client

`src/lib/supabase.ts` (or wherever `createClient` lives):

```ts
import { createClient } from "@supabase/supabase-js";

// Not set in the shell → the supalite Vite plugin injects the page origin
// and the project's real publishable key.
// Set in the shell → full Supabase (e.g. after `lite upgrade`). Same app, either backend.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);
```

Do not hardcode a key or add a string fallback such as `?? "any-string"`. When `config.toml` sets `auth.publishable_key`, supalite enforces API keys and rejects a made-up key. Check the installed `docs/integrations/vite.mdx` for the current injection rules.

Declare the vars for TypeScript in `src/vite-env.d.ts`:

```ts
/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}
interface ImportMeta { readonly env: ImportMetaEnv; }
```

## 2. Skip the embedded supalite plugin when targeting external Supabase

`vite.config.ts` — otherwise the plugin still boots its own same-origin API and may read a `config.toml` the upgrade rewrote:

```ts
export default defineConfig(() => {
  const useExternalSupabase = Boolean(process.env.VITE_SUPABASE_URL);
  return {
    plugins: [
      react(),
      tailwindcss(),
      ...(useExternalSupabase ? [] : [supalite()]),
    ],
  };
});
```

## 3. `playwright.config.ts`

`webServer` inherits the parent env, so the same config serves both backends — just set (or don't set) the `VITE_SUPABASE_*` vars when you invoke `test:e2e`.

```ts
import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:5173";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,            // serialize: avoids auth/session races and DB contention
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: { baseURL, trace: "on-first-retry" },
  webServer: {
    // pass the port so E2E_BASE_URL on a non-default port works
    command: `bun run dev -- --port ${new URL(baseURL).port || 5173} --strictPort`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
```

## 4. Install + scripts

```bash
bun add -d @playwright/test
bunx playwright install chromium
```

`package.json`: `"test:e2e": "playwright test"`.

## 5. Helpers worth having (`e2e/helpers.ts`)

- `uniqueEmail()` → `e2e-${Date.now()}-${rand}@example.com` (idempotency; see coverage checklist).
- `futureDatetimeLocal()` → a `YYYY-MM-DDTHH:MM` string in the future, for `datetime-local` inputs / "upcoming" filters.
- `signUp` / `signIn` / `signOut` wrappers, plus domain actions (create/open record), so specs read as user flows.

## 6. Selector tips (no test-ids needed)

Prefer accessible queries: `getByRole("button", { name })`, `getByLabel(...)` (works even when the visible text is a `<span>` inside the `<label>`), `getByPlaceholder(...)`. Use `getByText(x, { exact: true })` when a string also appears inside an `sr-only` label, to avoid strict-mode ambiguity. For `window.confirm`, register `page.once("dialog", d => d.accept())` before the click.

## 7. Running

```bash
# baseline (supalite)
bun run test:e2e

# upgraded Supabase (values from `lite upgrade` output / `supabase status -o json`)
VITE_SUPABASE_URL="http://127.0.0.1:NNNNN" \
VITE_SUPABASE_ANON_KEY="<anon key>" \
bun run test:e2e
```
