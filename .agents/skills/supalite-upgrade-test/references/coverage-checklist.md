# Coverage checklist — prove the suite covers all cases

The upgrade gate is only meaningful if the suite exercises everything the app does. Derive coverage from the code, then write it down and confirm no gaps. Ship the checklist next to the tests (e.g. `e2e/COVERAGE.md`).

## How to enumerate

1. **Data layer.** Find every supabase call (`grep -rn "supabase\.\(from\|auth\|rpc\|storage\)" src`). For each `from(table)`, list the `.select/.insert/.update/.delete` operations and embedded selects. Each gets at least one test.
2. **Auth.** Every `auth.*` call: `signUp`, `signInWithPassword`/`signInWithOtp`, `signOut`, session restore, etc.
3. **RLS policies.** Open `supabase/schemas/*.sql` (or migrations). For **each policy** (select/insert/update/delete per table), assert it: the owner can do the action, and — critically — a **second user cannot** see/modify the first user's rows (isolation). This is the highest-value check and the most likely to behave differently across backends.
4. **Computed/derived UI.** Any client-side formatting/aggregation (date formatting, summaries, counts) that users rely on — assert the rendered string.
5. **Error/validation paths** worth locking in (required fields, constraint violations surfaced to the user).

## Idempotency rule (required)

Every test creates a **unique random user** (`uniqueEmail()`), creates only its own data, and asserts only its own data. Reasons:

- The suite re-runs against a database that already holds **migrated** rows after `lite upgrade` — fixed emails/IDs would collide.
- Tests stay independent and order-free under a single worker.

Avoid global seed data the tests depend on; create what each test needs.

## Write it down

A simple table mapping each function / auth action / policy → the test that covers it. Example shape:

```
| Function / policy            | Covered by                         |
| ---------------------------- | ---------------------------------- |
| fetchX (select)              | x.spec — list shows created X      |
| createX (insert)             | x.spec — create flow               |
| updateX / deleteX            | x.spec — edit / delete flows       |
| x_select_own  (RLS)          | rls.spec — user B can't see A's X   |
| x_insert/update/delete_own   | x.spec — owner CRUD succeeds        |
| auth.signUp/signIn/signOut   | auth.spec + every test             |
```

Confirm the left column lists **every** item from the enumeration above. A gap here is a behavior the upgrade could silently break without any test catching it.

## Gut check

If you can describe a thing a user can do that no test does, add a test. The suite is the contract you're asserting the upgrade preserves.
