# AGENTS.md

Instructions for any LLM agent working in this repository.

## Purpose

This repo is a harness for one-shot generating applications with different LLM models across different stacks, targeting [supabase/lite](https://github.com/supabase/lite). Each run is a tuple of `{model, stack, prompt}` that produces a working project plus structured logs.

Goal: over many runs, compare models and stacks by reading back the logs.

## Layout

```
<slug>/                 generated application at repo root (see README requirement below)
.logs/<slug>/           logs for that run (required)
.logs/INDEX.md          one-line summary per run
AGENTS.md               this file
CLAUDE.md               pointer to this file
```

Generated projects live at the repo root, **not** nested under a `projects/` directory.

Slug format: `YYYY-MM-DD-<model>-<stack>-<short-name>`
Example: `2026-04-22-opus47-vite-todo`

Model shorthand: `opus47`, `sonnet46`, `haiku45`, `gpt5`, etc. Keep terse.

## Logging protocol

Every run MUST create `.logs/<slug>/` with four files. Append-only — never delete, correct via new entry referencing the prior one.

### `prompt.md`
Exact user prompt, verbatim. Written once at the start.

### `progress.md`
Sequential timeline. Write as you go, not retroactively.

Header (top of file, written first):
```
- model: <id>
- stack: <stack>
- started: <ISO timestamp>
- tokens / cost: <if known, update at end>
```

Then H3 entries:
```
### 2026-04-22T14:32Z — scaffold vite app
- ran `bun create vite@latest`
- assumed: user wants TS + React (default stack pref)
- fetched: https://tailwindcss.com/docs/installation/using-vite (why: v4 setup)
- outcome: ok
```

Every external fetch (docs, MCP query, web search) is logged here with URL and reason.
Every assumption is logged the moment it's made, not after.

### `friction.md`
Anything unclear, missing, broken, or requiring a workaround. Write before asking the user.

```
### 2026-04-22T14:40Z — tailwind v4 vite plugin name unclear [minor]
- expected: `@tailwindcss/vite` per docs
- actual: docs show both `@tailwindcss/vite` and postcss path, unclear which is canonical
- hypothesis: docs in transition
- suggested improvement: pick one in global prefs, note here
```

Severity tags: `[blocker]`, `[major]`, `[minor]`.

### `wins.md`
Things that worked well and should be preserved or templated.

```
### 2026-04-22T15:05Z — bun + vite cold start
- bun install + dev ready in ~2s
- why it mattered: kept iteration loop tight
- keep: yes, default for future vite runs
```

## Meta log

`.logs/INDEX.md` — one line per run, appended at end of run:

```
- 2026-04-22 | opus47 | vite+react+tailwind | todo app | done | [log](2026-04-22-opus47-vite-todo/)
```

Status: `done` / `partial` / `blocked`.

## Rules

- Never delete log entries. Correct by appending a new entry that references the prior timestamp.
- Log assumptions the moment they're made.
- Log every external fetch (URL + why) in `progress.md`.
- If blocked, write to `friction.md` before asking the user.
- Entries are terse: H3 heading + 1-5 bullets. Real newlines, not `\n`.
- Commit generated project and its logs together. One commit per run is fine.

## Project README (`<slug>/README.md`)

Every run MUST ship a `README.md` at the top of the generated project. It is the **first thing a non-technical user sees** — write for them, not for engineers. Replace the scaffold boilerplate entirely.

Requirements:

- **Plain language.** No jargon. If a term is unavoidable, explain it in one short phrase.
- **What it is** — one or two sentences a non-technical user understands. What does the app do for them?
- **How to open it** — exact, copy-pasteable steps. Assume nothing is installed. Mention Bun (and link to https://bun.sh if install is needed), then `bun install`, then `bun dev`, then which URL to open.
- **How to use it** — walk through the main screens and actions in order. What does the user click? What happens? Where does their data go (browser only? server?)?
- **Troubleshooting** — 1-3 common issues and fixes if relevant (e.g. port already in use).
- **Optional** — `bun run build` for a production build, short stack note at the bottom.

Rule of thumb: if a friend who doesn't code could not follow the README to run and use the app, rewrite it.

Log significant README assumptions in `progress.md` only if they affect behavior or reproducibility.

## Stack defaults

Unless the prompt says otherwise: ESM, TypeScript, Vite, Bun, Tailwind v4 (using the Vite plugin, per https://tailwindcss.com/docs/installation/using-vite). Note deviations in `progress.md`.

## supabase/lite (REQUIRED)

**Every generated project MUST use [supabase/lite](https://github.com/supabase/lite).** This is the entire purpose of this repository — runs that do not integrate supabase/lite are invalid.

- The `supabase/lite` repo is **private**. Use the `gh` CLI to fetch details (README, source, issues) before integrating — e.g. `gh repo view supabase/lite`, `gh api repos/supabase/lite/contents/README.md`, `gh search code --repo supabase/lite <query>`. Do not guess its API.
- Wire supabase/lite into the app as the data/runtime layer. Do not substitute another backend or skip it.
- If a prompt appears to conflict with this requirement, log the conflict in `friction.md` and still integrate supabase/lite — do not silently drop it.
- Runtime constraints are discovered per run. When one surfaces, log it in `friction.md` so constraints accumulate across runs.

## .gitignore

`.claude/settings.local.json`, `node_modules`, `dist`, `build`, `.env*` — already gitignored at repo root.
