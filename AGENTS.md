# AGENTS.md

Instructions for any LLM agent working in this repository.

## Purpose

This repo is a harness for one-shot generating applications with different LLM models across different stacks, targeting [supabase/lite](https://github.com/supabase/lite). Each run is a tuple of `{model, stack, prompt}` that produces a working project plus structured logs.

Goal: over many runs, compare models and stacks by reading back the logs.

## Layout

```
projects/<slug>/        generated application (see README requirement below)
.logs/<slug>/           logs for that run (required)
.logs/INDEX.md          one-line summary per run
AGENTS.md               this file
CLAUDE.md               pointer to this file
```

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

## Project README (`projects/<slug>/README.md`)

Every run MUST ship a `README.md` inside the generated project that describes **that** app, not the upstream scaffold boilerplate.

Replace or rewrite the default template README so it matches what was built. Include at least:

- **What it does** — one short paragraph on purpose and scope (e.g. client-only vs API-backed).
- **How to start** — prerequisites (e.g. Bun), `bun install` if needed, and the dev command (`bun dev` unless the stack differs).
- **How to use** — the main user flows (screens, actions, where data lives).
- **Optional** — production build command (`bun run build`) and stack note if helpful for the harness.

Log significant README assumptions in `progress.md` only if they affect behavior or reproducibility.

## Stack defaults

Unless the prompt says otherwise: ESM, TypeScript, Vite, Bun, Tailwind v4 (using the Vite plugin, per https://tailwindcss.com/docs/installation/using-vite). Note deviations in `progress.md`.

## supabase/lite compatibility

Generated apps should run under [supabase/lite](https://github.com/supabase/lite). Runtime constraints are discovered per run — when one surfaces, log it in `friction.md` so constraints accumulate across runs.

## .gitignore

`.claude/settings.local.json`, `node_modules`, `dist`, `build`, `.env*` — already gitignored at repo root.
