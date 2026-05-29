See @AGENTS.md for agent instructions.

## Screening tracker

[`SCREENED.md`](SCREENED.md) tracks which runs have already been screened for friction/proposal harvesting. Before screening, check it to skip done runs; after screening a run, append it to the table.

## Linear follow-ups

When asked to file follow-up tickets from a run's `friction.md` / `wins.md`, create them as sub-issues of **[LITE-146 "Frictions LLMs"](https://linear.app/supabase/issue/LITE-146/frictions-llms)** (team: Supalite, project: Supalite MVP).

For each sub-issue:
- `parentId: LITE-146`
- `assignee: "me"` (Dennis Senn) — always
- `priority`: 1=Urgent, 2=High (maps to `[blocker]`/`[major]`), 3=Normal, 4=Low (maps to `[minor]`). Pick from the friction severity.
- `estimate`: points (1=trivial, 2=small, 3=medium, 5=large, 8=unknown-but-big). Infer from scope; prefer low numbers.
- Link source: mention the run slug and which log file the friction/win came from.

### Dedup before filing

Before creating a Linear sub-issue, run a quick deduplication check:
- GitHub: scan current open issues in `dswbx/lite-projects` for the same friction.
- Linear: scan existing sub-issues of LITE-146 for the same friction.

If a match exists, comment on / reference the existing one instead of creating a duplicate.

### Closing transferred GitHub issues

When a GitHub issue has been transferred to Linear, close the GitHub issue with a comment referencing the Linear ticket (e.g. `gh issue close <url> --comment "Transferred to LITE-XXX: <linear-url>"`).