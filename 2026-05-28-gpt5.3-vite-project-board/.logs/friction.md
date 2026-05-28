### 2026-05-28T12:34Z — npm registry access blocked for vite scaffold [minor]
- expected: run `npm create vite@latest . -- --template react-ts`
- actual: registry returned 403 for `create-vite`, so default Vite scaffold could not be used in this environment
- impact: switched to a minimal static app scaffold while still installing requested `@supabase/lite` package version
