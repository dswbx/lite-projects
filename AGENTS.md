# AGENTS.md

Instructions for any LLM agent working in this repository.

## Purpose

This repo is a harness for one-shot generating applications with different LLM models across different stacks, targeting the `@supabase/lite` npm package. Each run is a tuple of `{model, stack, prompt}` that produces a working project plus structured logs.

Goal: over many runs, compare models and stacks by reading back the logs.

## Fresh-session rule (IMPORTANT)

Each run is a **cold start**. Pretend no prior runs exist.

- **Do not read, list, grep, or otherwise inspect any sibling `<slug>/` directory** in this repo. Other runs are evaluation artifacts, not reference material — peeking at them contaminates the comparison.
- Do not copy code, configs, logs, `package.json`, lockfiles, READMEs, or friction/wins entries from previous runs.
- Do not use prior `friction.md` to pre-empt known issues. Rediscover them — that's the measurement.
- Your only external help is **publicly available information about `@supabase/lite`** (the npm registry page, the package contents after install — README, STATUS, type defs, source under `node_modules/@supabase/lite/`, and any official docs URL linked from npm) plus official docs for the chosen stack. No local cross-run shortcuts.
- **Do not use the `gh` CLI** (or any other means) to fetch a source repository for `@supabase/lite`. Treat it as a closed-source npm package. If information you need isn't available from public sources, log the gap in `proposals.md` and proceed with best-effort from what is public.
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

Every run MUST create `<slug>/.logs/` with five files. Append-only — never delete, correct via new entry referencing the prior one.

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

### `proposals.md`
Forward-looking suggestions to make future runs less painful, grounded in what you actually hit during **this** run. Log-only (like `wins.md`) — not filed as issues automatically; the human curates these into the package, docs, or a skill.

**Why this file exists.** `@supabase/lite` is treated as a closed-source npm package. Agents only see what ships on npm: the package's `README.md`, `STATUS.md`, type defs, and source in `node_modules/@supabase/lite/`, plus any official docs URL linked from the npm page. The package is therefore the single source of truth an LLM can read first-try. Reality (what an LLM actually trips over) should shape what lives there — not the maintainer's assumptions. Anything you needed and couldn't find publicly belongs in this file as a "publish-this" proposal.

**Two goals, in priority order:**

1. **Make the public package self-sufficient.** Propose concrete edits/additions to files that ship in the npm tarball (README, STATUS, a new LIMITATIONS.md, RECIPES.md, etc.) so the next cold-start LLM gets a true crash course: what works, what doesn't, what differs from hosted Supabase. The reuse-Supabase-knowledge angle is the headline win; the limitations angle is what prevents wasted tokens.
2. **Seed a dedicated `supalite` agent skill.** Collect items a future agent skill (consumable by any agent runtime, not just one vendor's) could encode: trigger phrases, must-fetch resources, anti-patterns to short-circuit, snippets that worked, gotchas to warn about up front. The skill doesn't exist yet — these entries are the raw material the human will hand to a skill-writing tool later.

   **Skills go stale; package contents don't (they ride the version pin).** A skill written today will be wrong by the next `@supabase/lite` release if it tries to encode API specifics. So skill seeds should lean toward **general principles** ("prefer the `@supabase/supabase-js` client shape; lite is drop-in compatible for X surface area") and **pointers to where current info lives** (`node_modules/@supabase/lite/README.md`, `STATUS.md`, type defs, official docs URL). The skill's job is to route the agent to fresh sources fast, not to be the source.

**Ground every entry in this run.** Do not invent best-practices, speculate about features you didn't use, or restate the hosted Supabase docs. If you didn't hit it in this session, don't propose it. The whole point is to replace assumption-driven docs with reality-driven docs.

**Bugs are not proposals.** Only propose docs/skill text for **limitations** — intentional gaps, design constraints, or fundamental properties of running locally that won't change (e.g. "no server-side cron", "auth runs in-browser"). If what you hit is a **bug** (crash, `TypeError`, wrong result, undocumented broken path, anything that should obviously be fixed in the package), it belongs in `friction.md` only. Do not encode a workaround as guidance — that freezes the workaround into agent behavior and outlives the eventual fix. When in doubt: would a maintainer call this "by design" or "a bug"? If the latter, friction-only.

**Substance over brevity.** Don't compress to the point of losing the *why*. The human curates these into docs/skill text later and needs enough context to act without replaying your session: what you observed, what surprised you, what you'd tell the next agent. Include snippets, links, and counterfactuals where they sharpen the point. Aim shorter than `friction.md` (no need for full repros) but longer than `wins.md` bullets when the proposal carries weight.

Structure with two H2 sections inside the file:

```
## README / package docs

### 2026-04-22T15:50Z — add LIMITATIONS.md to package
- observed: spent N minutes discovering <X> isn't supported (link to friction entry)
- propose: ship `LIMITATIONS.md` in the npm tarball with a short list: <X>, <Y>, <Z>
- why it helps LLMs: a cold-start agent reading `node_modules/@supabase/lite/` first would skip the dead end
- source for this proposal: friction.md L<n>-L<m>

## Skill seeds (future `supalite` skill)

### 2026-04-22T15:55Z — trigger phrase: "use supabase locally"
- observed: prompt said "use supabase locally", I had to guess between supabase CLI and @supabase/lite
- propose: skill should trigger on phrases like "supabase locally", "local supabase", "lite", "browser-only supabase"
- why it helps LLMs: disambiguates @supabase/lite vs the supabase CLI on first read

### 2026-04-22T16:02Z — must-fetch resource: package README + STATUS.md
- observed: README answered <X>, STATUS.md answered <Y>; both shipped in the tarball
- propose: skill should instruct agents to `cat node_modules/@supabase/lite/{README,STATUS}.md` immediately after install, before writing any code
- counterfactual: skimming hosted Supabase docs first wasted ~N fetches
```

**Public-only reminder.** All proposed skill content must point to public resources: npm tarball files, the npm registry page, official docs sites linked from npm. Do not propose linking to a source repository for `@supabase/lite` — agents won't be allowed to follow it. If you needed something that isn't public, the proposal is "ship this in the package" (README/STATUS/new file), not "tell the skill where the private source lives".

**Docs vs skill — when in doubt, propose docs.** Skills go stale; package docs ride the version pin. Skill-only items are things that can't live in a README: trigger logic, multi-step procedures, decision trees, "when the user says X do Y", and meta-guidance like "always read `STATUS.md` from the installed package before assuming a feature exists". Specific API shapes, version numbers, and feature lists belong in the package, with the skill pointing at them.

## Rules

- Never delete log entries. Correct by appending a new entry that references the prior timestamp.
- Log assumptions the moment they're made.
- Log every external fetch (URL + why) in `progress.md`.
- If blocked, write to `friction.md` before asking the user.
- Entries are terse by default: H3 heading + 1-5 bullets. Real newlines, not `\n`.
- Exception: `friction.md` entries should be as detailed as needed (code blocks, stack traces, versions, configs) so downstream tickets don't require session context to reproduce.
- `proposals.md` is reality-driven: every entry must point to something you actually observed in this run (a friction line, a win, a fetched doc). No speculative "wouldn't it be nice if" entries.
- `proposals.md` favors general principles + pointers to fresh sources (package files, official docs) over encoding specifics that will go stale.

## Handoff & commit

- **Do not commit.** When the run is done, present the work to the human: slug path, what was built, how to run it, notable friction/wins.
- Wait for explicit human approval before committing.
- On approval, commit the generated project and its logs together (one commit per run).
- Add the exact attribution trailer from the **Model attribution** table above. If the model is not listed, ask the human for the exact trailer before committing.
- After committing, file friction entries as issues (see **Filing frictions as issues**).

## Filing frictions as issues

After human approval and as part of publish, each `friction.md` entry is filed as a GitHub issue in [`dswbx/lite-projects`](https://github.com/dswbx/lite-projects). `wins.md` and `proposals.md` stay log-only — the human curates proposals into package docs or a future `supalite` skill out-of-band.

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

**Every generated project MUST use the `@supabase/lite` npm package.** This is the entire purpose of this repository — runs that do not integrate `@supabase/lite` are invalid.

- Treat `@supabase/lite` as a **closed-source package**. Allowed sources of truth: the npm registry page (`npm view @supabase/lite`), the package contents after install (`node_modules/@supabase/lite/` — README, STATUS, type defs, source), and any official docs URL linked from the npm page. Do not guess its API; read the installed package.
- **Do not use `gh`** (or web search for a source repo) to look up `@supabase/lite` internals. If something you need isn't public, log it in `proposals.md` (so it can be moved into the package later) and proceed with best-effort from public sources.
- Wire `@supabase/lite` into the app as the data/runtime layer. Do not substitute another backend or skip it.
- If a prompt appears to conflict with this requirement, log the conflict in `friction.md` and still integrate `@supabase/lite` — do not silently drop it.
- Runtime constraints are discovered per run. When one surfaces, log it in `friction.md` so constraints accumulate across runs.

### Pinned package versions

If the prompt names a specific `@supabase/lite` version (e.g. an npm tag, semver pin, or a `pkg.pr.new` URL like `https://pkg.pr.new/@supabase/lite@203`), the run MUST use **exactly that version**. Do not silently fall back to `latest` or another version.

- **If the pin is a `pkg.pr.new` URL, install it with `npm install <url>` and use `npm` for the rest of the run.** Bun cannot install `pkg.pr.new` `@supabase/lite` URLs — `bun add <url>` fails with a `DependencyLoop` error (Bun resolves the URL back to a published registry version and sees a self-reference). Do not waste a `bun add` attempt on a `pkg.pr.new` pin; go straight to npm. A `package-lock.json` becomes the lockfile and replaces `bun.lock` (delete the stale `bun.lock` so `npm ci` / frozen installs are consistent), and the project's README + any Playwright `webServer` command should use `npm` instead of `bun`.
- For non-`pkg.pr.new` pins (an npm dist-tag or semver), `bun add <spec>` is fine; if Bun rejects it, fall back to `npm install <spec>`.
- Note any Bun→npm switch in `progress.md`.
- If the pinned version cannot be installed via either Bun or npm, **abort the run**. Do not substitute another version. Log the failure in `friction.md` (this counts as a `@supabase/lite` friction) and stop.

## .gitignore

`.claude/settings.local.json`, `node_modules`, `dist`, `build`, `.env*` — already gitignored at repo root.

## Cloud / CI agent notes

This repo has no root-level `package.json`. Each generated project (slug directory) is fully self-contained with its own `package.json` and `bun.lock`.

### Running a generated project

```
cd <slug>/
bun install
bun run dev          # starts Vite dev server on http://localhost:5173
```

Other standard scripts per project: `bun run lint` (ESLint), `bun run build` (TypeScript + Vite production build), `bun run preview` (serve production build).

### Codebase gotchas

- `@supabase/lite` uses a Vite plugin that auto-initializes a local SQLite database on dev server start. The database file lives at `<slug>/supabase/.temp/data.db`. Schema migrations are applied automatically from `supabase/config.toml` and `supabase/migrations/`.
- Existing lint errors in generated projects are expected (they were produced by different LLM models). Do not fix them unless that is the task.
- If port 5173 is occupied, Vite will auto-increment (`5174`, `5175`, etc.). Kill the prior process or pass `--port <n>` to `vite`.

### Platform-specific instructions

- **Cursor Cloud**: [`.cursor/cloud-instructions.md`](.cursor/cloud-instructions.md)
