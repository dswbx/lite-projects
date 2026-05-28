# lite-projects

Harness for one-shot generating apps with different LLMs against the [`@supabase/lite`](https://www.npmjs.com/package/@supabase/lite) npm package. Each run is a `{model, stack, prompt}` tuple producing a working project plus structured logs (`prompt.md`, `progress.md`, `friction.md`, `wins.md`, `proposals.md`) under `<slug>/.logs/`. Comparing runs surfaces what works, what trips models up, and what `@supabase/lite` should ship to make cold-start LLM use painless.

See [`AGENTS.md`](./AGENTS.md) for the protocol agents follow.

## Models tested

- Claude Opus 4.7 (`opus47`)
- Claude Sonnet 4.6 (`sonnet46`)
- GPT-5 (`gpt5`)
- GPT 5.5 (`gpt5.5`)
- Cursor Composer 2 (`composer2`)
- Cursor Composer 2.5 (`composer25`)
- Gemini 3.1 Pro (`gemini31pro`)
- Grok 4.3 (`grok43`)

## Cloud sandboxes

- Cursor Cloud
- Claude Code Cloud
