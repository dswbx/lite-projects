# E2E coverage checklist

Every data operation, auth action, and RLS policy in the app is exercised by a test. This is what makes the upgrade verification meaningful: if behavior changes after `lite upgrade`, one of these fails.

## Data layer (`src/lib/events.ts`)

| Function | Covered by |
| --- | --- |
| `fetchUpcomingEvents` | events.spec — list shows created event + RSVP summary |
| `fetchEvent` | events.spec — `openEvent` loads detail view |
| `createEvent` (+ guests insert) | events.spec — create with 2 guests |
| `updateEvent` | events.spec — edit name/location |
| `deleteEvent` (cascade) | events.spec — delete removes from list |
| `addGuest` | events.spec — add guest |
| `updateGuestRsvp` | events.spec — change RSVP to "yes" |
| `removeGuest` | events.spec — remove guest |
| `formatEventDate` | rendered in list/detail (implicit, no crash) |
| `rsvpSummary` | events.spec — asserts "N yes · N no · N pending" strings |

## Auth (`@supabase/supabase-js`)

| Action | Covered by |
| --- | --- |
| `signUp` (confirmations disabled → auto session) | auth.spec + every test |
| `signInWithPassword` | auth.spec — sign out then sign in |
| `signOut` | auth.spec, rls.spec |

## RLS policies (`supabase/schemas/schema.sql`)

| Policy | Covered by |
| --- | --- |
| `events_select_own` | rls.spec — user B cannot see user A's event |
| `events_insert_own` | events.spec — create succeeds for owner |
| `events_update_own` | events.spec — edit succeeds for owner |
| `events_delete_own` | events.spec — delete succeeds for owner |
| `guests_*_own` | events.spec — add/update/remove guest as owner; rls.spec — isolation |

## Notes

- Each test creates a **unique random user** (`uniqueEmail()`), so the suite is idempotent and safe to re-run against a database that already holds migrated data after `lite upgrade`.
- The same suite runs against Supalite (default) and full Supabase (set `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`). Identical pass set before/after = upgrade preserved behavior.
