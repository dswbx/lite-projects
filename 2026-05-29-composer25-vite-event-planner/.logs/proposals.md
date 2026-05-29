## README / package docs

### 2026-05-29T12:56:00Z — PATTERNS.md link from LIMITATIONS for child tables
- observed: guests table needed denormalized user_id; found answer in PATTERNS + LIMITATIONS anti-pattern, not README quick start
- propose: in LIMITATIONS or README "multi-table apps" bullet, link PATTERNS#per-user and note child rows should carry owner user_id on SQLite inserts
- why it helps LLMs: event+guest apps are common; avoids failed INSERT with EXISTS subquery
- source: progress.md schema step, PATTERNS.md read during run

## Skill seeds (future `supalite` skill)

### 2026-05-29T12:56:00Z — event planner stack recipe
- observed: event list + guest RSVPs + per-user isolation fit standard RLS + embedded select pattern
- propose: skill trigger "event planner", "guest list", "RSVP" → read PATTERNS per-user + plan events/guests tables with guests.user_id
- why it helps LLMs: routes to canonical pattern without inventing alternate auth
