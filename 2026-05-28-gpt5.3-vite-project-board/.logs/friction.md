### 2026-05-28T00:09:00Z — Missing `tslib` when using `@supabase/lite/vite` during Vite build [major]
- expected: fresh Vite + React + TypeScript app with `@supabase/lite` plugin should build after install
- actual: `npm run build` failed while loading `vite.config.ts` because `@supabase/functions-js` required `tslib` that was not present
- versions: `@supabase/lite` installed from `https://pkg.pr.new/supabase-community/lite/@supabase/lite@222`, Vite `8.0.14`, Node `v22.18.0`
- command:

```bash
npm run build
```

- error output:

```text
failed to load config from /workspace/lite-projects/2026-05-28-gpt5.3-vite-project-board/vite.config.ts
error during build:
Error: Cannot find module 'tslib'
Require stack:
- /workspace/lite-projects/2026-05-28-gpt5.3-vite-project-board/node_modules/@supabase/functions-js/dist/main/FunctionsClient.js
- /workspace/lite-projects/2026-05-28-gpt5.3-vite-project-board/node_modules/@supabase/functions-js/dist/main/index.js
```

- attempted fix sequence:
  1. reproduced with unchanged dependency graph after scaffold + lite install
  2. installed `tslib` explicitly via `npm i tslib`
  3. reran build and confirmed success
- workaround result: explicit `tslib` install unblocks build, but this appears to be a packaging/transitive dependency gap for the lite plugin path.
