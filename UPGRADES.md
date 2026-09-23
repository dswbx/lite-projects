# Upgrade-test status

At-a-glance index of which generated projects have been through the [`supalite-upgrade-test`](.claude/skills/supalite-upgrade-test/SKILL.md) skill: one Playwright e2e suite run unchanged against both local supalite and the `lite upgrade`d full Supabase, used as a regression gate.

**Result** column reads `baseline ↔ upgraded` (e.g. `7/7 ↔ 7/7` = same pass set on both backends, so the upgrade preserved behavior).

**Status** values: `✅ done` = gate passed at the recorded lite version, and the project still pins that version. `♻️ stale` = gate passed, but the project has since moved to a newer lite version, so the result no longer describes the current code. `⬜ pending` = never run.

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
| 2026-05-28-opus47-vite-inventory | ✅ done | 7 | auth (signup/signin/signout), items CRUD, category+location filters, RLS cross-user isolation | 0.10.1-next.7 | 7/7 ↔ 7/7 | 2026-09-23 |
| 2026-05-29-composer25-vite-event-planner | ♻️ stale | 7 | auth (signup/signin/signout), event+guest CRUD, RSVP summary, RLS cross-user isolation | canary @236 (project now on 0.10.1-next.6) | 7/7 ↔ 7/7 | 2026-06-10 |
| 2026-07-22-opus48-vite-notes | ⬜ pending | – | – | – | – | – |
| 2026-08-21-gpt5.6-vite-event-planner | ⬜ pending | 1 (not from this skill) | event create + list | – | – | – |
| 2026-09-01-gpt5.6-luna-vite-todo | ⬜ pending | – | – | – | – | – |

## Version drift (2026-09-23)

All 24 projects were upgraded to `@supabase/lite@0.10.1-next.6` in one pass. See PR [#70](https://github.com/dswbx/lite-projects/pull/70). That pass re-ran the existing Playwright suites **unchanged against local supalite only**. It did **not** run `lite upgrade` or re-run the suites against full Supabase.

`2026-05-28-opus47-vite-inventory` was then bumped to `0.10.1-next.7` and got a full re-run of the skill (baseline and upgraded, both 7/7). Its row is `✅ done`.

`2026-05-29-composer25-vite-event-planner` is still `♻️ stale`. Its baseline passes 7/7 at `0.10.1-next.6`, but the `↔ upgraded` half still dates from canary @236. To clear it, re-run the `supalite-upgrade-test` skill on it and update the version, result, and date cells.

`2026-08-21-gpt5.6-vite-event-planner` has its own single Playwright test that predates this skill. It also passes at `0.10.1-next.6`, but it was never part of an upgrade gate, so the project stays `⬜ pending` here.
