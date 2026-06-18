# Upgrade-test status

At-a-glance index of which generated projects have been through the [`supalite-upgrade-test`](.claude/skills/supalite-upgrade-test/SKILL.md) skill: one Playwright e2e suite run unchanged against both local supalite and the `lite upgrade`d full Supabase, used as a regression gate.

**Result** column reads `baseline ↔ upgraded` (e.g. `7/7 ↔ 7/7` = same pass set on both backends, so the upgrade preserved behavior).

| Project | Status | E2E tests | What's tested | lite version | Result | Date |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-04-23-opus47-vite-todo | ⬜ pending | – | – | – | – | – |
| 2026-04-24-gpt5-vite-job-board | ⬜ pending | – | – | – | – | – |
| 2026-04-24-sonnet46-vite-notes | ⬜ pending | – | – | – | – | – |
| 2026-04-30-composer2-lite-habit-tracker | ⬜ pending | – | – | – | – | – |
| 2026-05-08-composer2-vite-flashcards | ⬜ pending | – | – | – | – | – |
| 2026-05-13-opus47-vite-bookmarks | ⬜ pending | – | – | – | – | – |
| 2026-05-14-gemini31pro-vite-task-manager | ⬜ pending | – | – | – | – | – |
| 2026-05-14-grok43-vite-contacts | ⬜ pending | – | – | – | – | – |
| 2026-05-14-vite-daily-journal | ⬜ pending | – | – | – | – | – |
| 2026-05-19-composer25-vite-contact-book | ⬜ pending | – | – | – | – | – |
| 2026-05-20-composer25-vite-budget-planner | ⬜ pending | – | – | – | – | – |
| 2026-05-20-composer25-vite-reading-list | ⬜ pending | – | – | – | – | – |
| 2026-05-27-composer25-vite-goals | ⬜ pending | – | – | – | – | – |
| 2026-05-27-composer25-vite-workout-log | ⬜ pending | – | – | – | – | – |
| 2026-05-27-gemini31pro-vite-meal-planner | ⬜ pending | – | – | – | – | – |
| 2026-05-27-sonnet46-vite-travel-planner | ⬜ pending | – | – | – | – | – |
| 2026-05-28-composer25-vite-watchlist | ⬜ pending | – | – | – | – | – |
| 2026-05-28-gpt5.3-vite-project-board | ⬜ pending | – | – | – | – | – |
| 2026-05-28-gpt5.5-vite-password-vault | ⬜ pending | – | – | – | – | – |
| 2026-05-28-opus47-vite-inventory | ✅ done | 7 | auth (signup/signin/signout), items CRUD, category+location filters, RLS cross-user isolation | 0.5.0 | 7/7 ↔ 7/7 | 2026-06-18 |
| 2026-05-29-composer25-vite-event-planner | ✅ done | 7 | auth (signup/signin/signout), event+guest CRUD, RSVP summary, RLS cross-user isolation | canary @236 | 7/7 ↔ 7/7 | 2026-06-10 |
