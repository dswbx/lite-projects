# E2E coverage

One Playwright suite, run unchanged against two backends:

- **supalite** (default): `bun run test:e2e` — Vite plugin serves the API same-origin.
- **upgraded Supabase**: `VITE_SUPABASE_URL=… VITE_SUPABASE_ANON_KEY=… bun run test:e2e` after `lite upgrade --target local`.

The suite is the contract we assert the upgrade preserves: identical pass set on both backends = behavior preserved.

## Data layer → test mapping

Enumerated from `src/App.tsx`, `src/Auth.tsx`, `src/Inventory.tsx`, and the RLS policies in `supabase/schemas/schema.sql`.

| Function / policy | Source | Covered by |
| --- | --- | --- |
| `auth.signUp` | Auth.tsx:18 | every test (`signUp` helper); `auth.spec` explicitly |
| `auth.signInWithPassword` | Auth.tsx:17 | `auth.spec` — sign out then sign in |
| `auth.signOut` | Inventory.tsx:115 | `auth.spec`, `rls.spec` (`signOut` helper) |
| `auth.getSession` / `onAuthStateChange` | App.tsx:12,16 | exercised on every page load + post-auth re-render |
| `from('items').select(...).order(created_at desc)` | Inventory.tsx:25-28 | `items.spec` (list shows created items), `rls.spec` |
| `from('items').insert(payload)` | Inventory.tsx:59 | `items.spec` create; `addItem` helper |
| `from('items').update(...).eq('id', …)` | Inventory.tsx:53-56 | `items.spec` edit |
| `from('items').delete().eq('id', …)` | Inventory.tsx:84 | `items.spec` delete (accepts confirm dialog) |
| Client-side category/location filters | Inventory.tsx:89-105 | `items.spec` filter + clear |
| `items_select` (RLS) | schema.sql | `rls.spec` — user B can't see A's item |
| `items_insert` (RLS, `WITH CHECK user_id = auth.uid()`) | schema.sql | `items.spec` create (insert includes own `user_id`) |
| `items_update` (RLS) | schema.sql | `items.spec` edit (owner updates own row) |
| `items_delete` (RLS) | schema.sql | `items.spec` delete (owner deletes own row) |

## Idempotency

Every test creates a **unique random user** (`uniqueEmail()`) and asserts only its own data, so the suite is safe to re-run against the migrated database after `lite upgrade` (no fixed-email collisions, no shared seed data).

## Known non-coverage (intentional)

- Required-field validation (`Name, category, and location are required.`) is client-only and identical on both backends; not a data-layer behavior the upgrade can change, so it is not asserted.
- The `quantity >= 0` CHECK constraint and `quantity` numeric input are exercised via normal item values; a dedicated constraint-violation path is not asserted (the form's `min={0}` blocks it in the UI).
