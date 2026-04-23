See @AGENTS.md for agent instructions.

## Linear follow-ups

When asked to file follow-up tickets from a run's `friction.md` / `wins.md`, create them as sub-issues of **[LITE-146 "Frictions LLMs"](https://linear.app/supabase/issue/LITE-146/frictions-llms)** (team: Supalite, project: Supalite MVP).

For each sub-issue:
- `parentId: LITE-146`
- `assignee: "me"` (Dennis Senn) — always
- `priority`: 1=Urgent, 2=High (maps to `[blocker]`/`[major]`), 3=Normal, 4=Low (maps to `[minor]`). Pick from the friction severity.
- `estimate`: points (1=trivial, 2=small, 3=medium, 5=large, 8=unknown-but-big). Infer from scope; prefer low numbers.
- Link source: mention the run slug and which log file the friction/win came from.