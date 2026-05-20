# AGENTS.md

Instructions for any LLM agent working in this repository.

## Purpose

This repo is a harness for one-shot generating applications with different LLM models across different stacks, targeting [@supabase/lite](https://github.com/supabase-community/lite). Each run is a tuple of `{model, stack, prompt}` that produces a working project plus structured logs.

Goal: over many runs, compare models and stacks by reading back the logs.

## Fresh-session rule (IMPORTANT)

Each run is a **cold start**. Pretend no prior runs exist.

- **Do not read, list, grep, or otherwise inspect any sibling `<slug>/` directory** in this repo. Other runs are evaluation artifacts, not reference material — peeking at them contaminates the comparison.
- Do not copy code, configs, logs, `package.json`, lockfiles, READMEs, or friction/wins entries from previous runs.
- Do not use prior `friction.md` to pre-empt known issues. Rediscover them — that's the measurement.
- Your only external help is the **remote [@supabase/lite](https://github.com/supabase-community/lite) repository** (fetched via `gh`, unless the prompt says "use public" — see below) plus official docs for the chosen stack. No local cross-run shortcuts.
- Files you may read in this repo: `AGENTS.md`, `CLAUDE.md`, and files inside your own `<slug>/` once created. Nothing else.

## Layout

```
<slug>/                 generated application at repo root (see README requirement below)
<slug>/.logs/           logs for that run (required, inside the project)
AGENTS.md               this file
CLAUDE.md               pointer to this file
```

Generated projects live at the repo root, **not** nested under a `projects/` directory. The directory listing itself is the index — no separate INDEX file.

Slug format: `YYYY-MM-DD-<model>-<stack>-<short-name>`
Example: `2026-04-22-opus47-vite-todo`

Model shorthand: `opus47`, `sonnet46`, `haiku45`, `gpt5.4`, etc. Keep terse.

## Model attribution

Each run uses two model identifiers:

- **Slug/log model**: short and filesystem-friendly, used in `<slug>` and `.logs/progress.md`.
- **Commit trailer**: exact Git co-author identity, used only when the human approves a commit.

Do not infer the commit trailer from the slug, product name, UI label, API model id, or agent name alone. Use the table below when it applies.

If the provider/model is not listed, the agent must determine the trailer before committing:

1. Check its runtime/session context for the exact provider, product, agent, and model identity.
2. Search authoritative sources, such as provider docs, release docs, or repository instructions, for the correct Git co-author name and email.
3. Use GitHub's co-author format: `Co-authored-by: name <name@example.com>`. GitHub requires a name and email for each co-author: https://docs.github.com/en/pull-requests/committing-changes-to-your-project/creating-and-editing-commits/creating-a-commit-with-multiple-authors
4. Log the source or reasoning used in `.logs/progress.md` before committing.
5. If the trailer still cannot be determined with confidence, stop before committing and ask the human for help resolving it. Do not invent a noreply address or normalize the model name yourself.

Example for an unlisted run after checking context and docs:

```text
I am about to commit a run made with Cursor Composer 2. It is not listed in AGENTS.md, and I could not verify an official co-author trailer from local context or provider docs.
What exact co-author trailer should I use? GitHub format:
Co-authored-by: <display name> <email>
```

| Provider / model | Slug/log model | Commit trailer |
| --- | --- | --- |
| Codex GPT 5.5 | `gpt5.5` | `Co-Authored-By: GPT 5.5 <codex@openai.com>` |
| Claude Opus 4.7 | `opus47` | `Co-authored-by: claude-opus-4-7 <noreply@anthropic.com>` |

## Logging protocol

Every run MUST create `<slug>/.logs/` with four files. Append-only — never delete, correct via new entry referencing the prior one.

### `prompt.md`
Exact user prompt, verbatim. Written once at the start.

### `progress.md`
Sequential timeline. Write as you go, not retroactively.

Header (top of file, written first):
```
- model: <id>
- stack: <stack>
- started: <ISO timestamp>
- ended: <ISO timestamp, written at handoff>
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
Anything unclear, missing, broken, or requiring a workaround **in `@supabase/lite` itself** — its API, docs, install, runtime behavior, or integration story. Write before asking the user.

**Scope: `@supabase/lite` only.** Frictions with third-party libraries, the chosen stack (Vite, Bun, Tailwind, React, etc.), the OS (occupied ports, permissions), or generic tooling do **not** belong here. Log those in `progress.md` instead. If unsure, ask: "would fixing this require a change in the `supabase-community/lite` repo?" If no → `progress.md`.

**Be thorough, not terse.** These entries feed downstream Linear tickets — include everything a maintainer would need to reproduce and fix without re-running the session. Do not rely on the LLM's conversation context to fill gaps; the ticket author won't have it.

Include where relevant:
- exact commands run and their full error output (fenced code blocks)
- offending code snippets (fenced, with file path + line range)
- relevant config excerpts (`package.json`, `vite.config.ts`, etc.)
- stack traces, network responses, or log excerpts verbatim
- versions (`bun -v`, package versions from lockfile, supabase/lite commit SHA)
- links to the specific doc section or source file consulted
- what you tried, in order, and why each attempt failed
- minimal repro if you found one

Bullets are fine for short items; use code blocks and sub-headings freely for longer ones. Length is not a problem — missing detail is.

```
### 2026-04-22T14:40Z — @supabase/lite createClient hangs on first query [major]
- expected: `from("todos").select()` resolves like `@supabase/supabase-js`
- actual: promise never resolves; no error thrown
- hypothesis: missing init step not documented in README
- versions: @supabase/lite@0.4.2, bun@1.1.38
- doc link: https://github.com/supabase-community/lite/blob/<sha>/README.md#quick-start

repro:
​```ts
import { createClient } from "@supabase/lite";
const supabase = createClient();
await supabase.from("todos").select(); // hangs
​```
```

(Counter-example — NOT a friction: "port 5173 already in use when starting vite". That's an OS/tooling issue unrelated to `@supabase/lite` → log in `progress.md`.)

Severity tags: `[blocker]`, `[major]`, `[minor]`. Resolution tag: `[resolved]` on a correction entry closes the linked issue at next publish (see **Filing frictions as issues**).

### `wins.md`
Appreciation log. What felt easy, obvious, or delightful from an LLM's perspective. Equal in weight to `friction.md` — we need to know exactly what to double down on, not just what to fix.

**Be thorough, not terse.** Same reasoning as friction: downstream readers won't have session context. Concrete detail beats vague praise.

Capture things like:
- APIs that worked first try with no doc-diving
- naming/shape that matched Supabase conventions so prior knowledge transferred cleanly
- moments where supabase/lite being **Supabase-compatible but not Supabase** was clear and non-confusing (e.g. same client SDK worked, same SQL dialect, but local-only semantics were obvious)
- error messages that pointed directly at the fix
- defaults that were correct out of the box (no config needed)
- docs/examples that answered the exact question asked
- fast feedback loops (cold start, HMR, type errors surfacing early)
- ergonomics that let you skip boilerplate an LLM would otherwise generate

Include where relevant:
- the exact API call / snippet that "just worked" (fenced code block)
- versions, so we know which release shipped the good thing
- link to the doc or source file that made it click
- counterfactual: what would have been painful without this? (helps judge impact)
- whether this is a Supabase parity win (familiar) or a supabase/lite-specific win (distinct + good)

Length is not a problem — vague praise is. "Supabase client worked" is not a win entry; show the code, the version, and why it was obvious.

```
### 2026-04-22T15:05Z — bun + vite cold start
- bun install + dev ready in ~2s on M-series
- why it mattered: kept iteration loop tight, no mental context switch
- keep: yes, default for future vite runs
- versions: bun@1.1.38, vite@5.4.10
```

```
### 2026-04-22T15:40Z — supabase-js client worked against lite unchanged
- used `@supabase/supabase-js` pointed at lite's local URL, auth + from().select() worked first try
- why it mattered: zero new API surface to learn; existing Supabase knowledge transferred
- parity win: drop-in compatibility is the headline feature — users keep their muscle memory
- not-confusing: lite's README made clear it's a local-first runtime, not a hosted Supabase, so I didn't reach for dashboard-only features
- versions: @supabase/supabase-js@2.45.0, supabase/lite@<sha>
- snippet:
​```ts
const supabase = createClient(LITE_URL, LITE_ANON_KEY);
const { data } = await supabase.from("todos").select();
​```
- counterfactual: if the client shape differed, I'd have burned time diffing APIs and probably mis-generated types
```

## Rules

- Never delete log entries. Correct by appending a new entry that references the prior timestamp.
- Log assumptions the moment they're made.
- Log every external fetch (URL + why) in `progress.md`.
- If blocked, write to `friction.md` before asking the user.
- Entries are terse by default: H3 heading + 1-5 bullets. Real newlines, not `\n`.
- Exception: `friction.md` entries should be as detailed as needed (code blocks, stack traces, versions, configs) so downstream tickets don't require session context to reproduce.

## Handoff & commit

- **Do not commit.** When the run is done, present the work to the human: slug path, what was built, how to run it, notable friction/wins.
- Wait for explicit human approval before committing.
- On approval, commit the generated project and its logs together (one commit per run).
- Add the exact attribution trailer from the **Model attribution** table above. If the model is not listed, ask the human for the exact trailer before committing.
- After committing, file friction entries as issues (see **Filing frictions as issues**).

## Filing frictions as issues

After human approval and as part of publish, each `friction.md` entry is filed as a GitHub issue in [`dswbx/lite-projects`](https://github.com/dswbx/lite-projects). `wins.md` stays log-only.

### First publish

For each H3 entry in `friction.md`:

`gh issue create --repo dswbx/lite-projects --title "<title>" --label <severity> --body <entry + permalink>`

- title = H3 with the leading `<ISO timestamp> — ` stripped (GitHub's creation date + permalink already carry the temporal info). Severity tag stays in the title.
- severity label is one of `blocker`, `major`, `minor` from the entry's tag. Create the label if missing: `gh label create <severity> --repo dswbx/lite-projects --force`.
- body is the entry contents followed by a permalink to the friction entry on the publish commit, e.g. `https://github.com/dswbx/lite-projects/blob/<sha>/<slug>/.logs/friction.md#L<n>-L<m>`. The `<sha>` is the publish commit (the one created seconds earlier) — the link works immediately and stays valid after PR merge.

Flow: publish commit → `gh issue create` per entry. No back-link is written into `friction.md` (the issue → friction direction is enough; GitHub's issue search by title or commit ref covers the reverse lookup).

### Same-session follow-up (new canary builds)

If the human asks the agent to retest with a new canary in the same session:

1. Append correction entries to `friction.md` referencing the prior timestamp (existing convention). Do not edit the original entry.
2. At next publish, for each correction entry: `gh issue comment <url> --body <correction body + permalink>` on the original entry's issue. The agent recalls issue URLs from session context; if unavailable, look up via `gh issue list --repo dswbx/lite-projects --search "<title in quotes>"`. One comment per canary; do not edit the issue body.
3. If the correction is tagged `[resolved]`, close the issue: `gh issue close <url> --comment <correction body>`.
4. New frictions discovered on the canary file as new issues, same as first publish. The human directs which prior frictions to re-test; the agent does not re-run the full list.

The cold-start rule still applies. A future run in a separate session does not look up or update prior issues — matching across sessions is out of scope.

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

## @supabase/lite (REQUIRED)

**Every generated project MUST use [@supabase/lite](https://github.com/supabase-community/lite)** (npm package name: `@supabase/lite`; repo: `supabase-community/lite`). This is the entire purpose of this repository — runs that do not integrate `@supabase/lite` are invalid.

- The `supabase-community/lite` repo is **private**. Default path: use the `gh` CLI to fetch details (README, source, issues) before integrating — e.g. `gh repo view supabase-community/lite`, `gh api repos/supabase-community/lite/contents/README.md`, `gh search code --repo supabase-community/lite <query>`. Do not guess its API.
- Wire `@supabase/lite` into the app as the data/runtime layer. Do not substitute another backend or skip it.
- If a prompt appears to conflict with this requirement, log the conflict in `friction.md` and still integrate `@supabase/lite` — do not silently drop it.
- Runtime constraints are discovered per run. When one surfaces, log it in `friction.md` so constraints accumulate across runs.

### Pinned package versions

If the prompt names a specific `@supabase/lite` version (e.g. an npm tag, semver pin, or a `pkg.pr.new` URL like `https://pkg.pr.new/@supabase/lite@203`), the run MUST use **exactly that version**. Do not silently fall back to `latest` or another version.

- Install it as given. With Bun, `pkg.pr.new` URLs work via `bun add <url>` in most cases; if Bun rejects the URL or the install fails, retry with `npm install <url>` (and use `npm` for the rest of the run, noting the switch in `progress.md`).
- If the pinned version cannot be installed via either Bun or npm, **abort the run**. Do not substitute another version. Log the failure in `friction.md` (this counts as a `@supabase/lite` friction) and stop.

### "use public" mode

If the prompt contains **"use public"**, the agent must NOT use `gh` to inspect `supabase-community/lite` (or any related private repo). Rely only on publicly available information:

- The npm package page / tarball (`npm view @supabase/lite`, README shipped in the package).
- Type definitions, source, and docs available inside `node_modules/@supabase/lite/` after install.
- Official public documentation sites linked from the npm page.

Do not run `gh repo view`, `gh api repos/supabase-community/lite/...`, `gh search code --repo supabase-community/lite ...`, or equivalent. If information is missing under this constraint, log the gap as friction and proceed with best-effort from public sources.

## .gitignore

`.claude/settings.local.json`, `node_modules`, `dist`, `build`, `.env*` — already gitignored at repo root.
