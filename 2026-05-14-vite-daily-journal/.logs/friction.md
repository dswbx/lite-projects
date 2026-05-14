# friction

### 2026-05-14T09:01Z — npm peer dependency: vite 8 vs lite-supa@0.4.0 [minor]

- expected: `npm install` succeeds with default Vite 8 + `@vitejs/plugin-react@6`
- actual: `ERESOLVE` — `lite-supa@0.4.0` has `peerOptional vite@"^5.0.0 || ^6.0.0 || ^7.0.0"`; project had `vite@8`
- fix applied: pinned `vite` to `^7.2.2` and `@vitejs/plugin-react` to `^5.1.2` (plugin 6 requires Vite 8)
- versions at time: `lite-supa@0.4.0` from tarball, `vite@7.3.3`, `@vitejs/plugin-react@5.1.2`

### 2026-05-14T09:05Z — ESLint react-hooks rules on data load UI [minor]

- rules: `react-hooks/set-state-in-effect`, `react-hooks/refs` (no updating `ref.current` during render)
- actual: syncing textarea draft from selected date via `useEffect` + ref mirror triggered failures
- fix applied: `pickDate()` sets `selectedDate` and `draftBody` in handlers; `loadEntries(dateForDraft)` takes explicit date for post-fetch draft sync; narrow `eslint-disable` for mount-only fetch effect (strict rule treats async continuation from `useEffect` as problematic)
- file: `src/components/JournalWorkspace.tsx`