### 2026-05-28T00:05:00Z — Supabase client compatibility worked with lite endpoint
- used standard `@supabase/supabase-js` client shape with no lite-specific client API changes:

```ts
const supabase = createClient(window.location.origin, 'local-dev-key')
```

- why it mattered: existing Supabase query patterns transferred directly (`from().select().insert().update()`), which reduced generation complexity for CRUD board behavior.
- parity win: this felt like normal Supabase client code, while still running local-lite runtime through the Vite plugin.

### 2026-05-28T00:06:00Z — Vite plugin path is straightforward for local runtime
- `@supabase/lite/vite` plugin integration was a one-line addition in `vite.config.ts` and immediately enabled same-origin API calls from browser app code.
- counterfactual: without this, wiring a local API server and CORS-aware client bootstrap would add setup overhead for a small app.

### 2026-05-28T13:20:00Z — schema diff made the config repair obvious
- after fixing `supabase/config.toml` to point at `./schemas/001_init.sql`, the Vite plugin restart printed a concrete schema diff showing `+ projects`, `+ tasks`, and the `tasks.project_id -> projects.id` foreign key.
- why it mattered: this confirmed the runtime had finally seen the app schema before I touched the browser again.
- lite-specific win: the same-process Vite plugin gave database migration feedback in the app dev server, so the broken UI could be tied back to schema loading quickly.
