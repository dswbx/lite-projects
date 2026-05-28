# Wins

### 2026-05-28T07:03Z - Vite plugin applied schema and exposed Auth plus REST in one dev server
- used `@supabase/lite/vite` in `vite.config.ts` with `config: "./supabase/config.toml"` and ran `npm run dev -- --host 127.0.0.1`.
- why it mattered: one Vite process served the React app, `/auth/v1`, `/rest/v1`, and the Lite system UI, so the app did not need a separate backend process or proxy.
- versions: `@supabase/lite@0.3.1-next.1`, `vite@8.0.14`, `@vitejs/plugin-react@6.0.2`.
- snippet:

```ts
import { supalite } from "@supabase/lite/vite";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    supalite({
      config: "./supabase/config.toml",
    }),
  ],
});
```

- counterfactual: without this plugin, I would have had to create and document a separate Lite server command before the frontend could authenticate or query data.

### 2026-05-28T07:04Z - Supabase client and RLS behavior transferred cleanly
- used `@supabase/supabase-js` against the same Vite origin with a local anon key, then called familiar Auth and table APIs: `auth.signUp`, `auth.signInWithPassword`, `from("vault_entries").insert`, `select`, `ilike`, and `delete`.
- runtime smoke result: Alice inserted a vault row and could find it with `ilike("site_name", "%email%")`; Bob selected from the same table and received zero rows because Lite enforced the `auth.uid()` RLS policy.
- why it mattered: the user's "each user only sees their own vault" requirement could be implemented with normal Supabase RLS instead of custom server code.
- versions: `@supabase/lite@0.3.1-next.1`, `@supabase/supabase-js@2.106.2`.
- snippet:

```ts
const aliceSearch = await alice.client.from("vault_entries").select("*").ilike("site_name", "%email%");
const bobRows = await bob.client.from("vault_entries").select("*");
```

- parity win: the familiar Supabase client shape made the local-only Lite runtime feel like the hosted workflow for this CRUD and Auth surface.
