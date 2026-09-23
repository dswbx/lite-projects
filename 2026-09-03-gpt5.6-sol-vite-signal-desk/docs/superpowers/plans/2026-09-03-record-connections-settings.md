# Record Connections and Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Make Signal Desk records directly explorable, expose and edit their relationships, preview stored files, support profile photos, add organization settings, and seed recognizable sales stories.

**Architecture:** Keep exactly 26 forward-only migrations, strengthening existing membership constraints where the security review requires it. Extend module metadata with relationship descriptors, load options through Supabase JS, and compose the existing shadcn Sheet/Tabs/Select primitives. Store avatars in the existing private `crm-files` bucket and persist their object path in `profiles.avatar_url`.

**Tech Stack:** React 19, TypeScript, Vite, TanStack Query, shadcn/ui Radix Nova, Supabase JS, `@supabase/lite@0.10.0`, Playwright, Vitest.

## Global Constraints

- All reads and writes use the real Supabase JS Data, Auth, or Storage APIs.
- Keep exactly 26 forward-only migrations; seed and Storage scripts do not alter schema.
- Use only existing official shadcn components and semantic theme tokens.
- Preserve keyboard access, focus restoration, reduced motion, loading, empty, error, and confirmation states.
- Do not commit without explicit human approval.

---

### Task 1: Clickable records and relationship-aware forms

**Files:**
- Modify: `src/components/app/module-definitions.ts`
- Modify: `src/components/app/module-page.tsx`
- Modify: `src/components/app/record-sheet.tsx`
- Test: `e2e/crm.spec.ts`

**Interfaces:**
- Produces: `ModuleField.relation` metadata and `RecordSheet.options` maps.
- Consumes: existing workspace-scoped Supabase queries and permission helpers.

- [x] Add a failing browser test that opens a record by clicking its row and edits an account/contact relationship through a named select.
- [x] Add relationship metadata for contacts, activities, tasks, quotes, and pipeline opportunities.
- [x] Load relationship options by workspace and render them as grouped shadcn Select items.
- [x] Make rows focusable and open the sheet on click, Enter, or Space without stealing overflow-menu events.
- [x] Show human labels in relationship columns and separate Connections from Details with shadcn Tabs.
- [x] Run the focused CRM browser test.

### Task 2: Pipeline detail editing

**Files:**
- Modify: `src/components/app/pipeline-board.tsx`
- Test: `e2e/pipeline-files.spec.ts`

**Interfaces:**
- Produces: selected-opportunity state and audited `crmRepository.update` editing.
- Consumes: relationship options and `RecordSheet` from Task 1.

- [x] Add a failing test that opens a deal card, changes its value and linked account, and sees the saved values.
- [x] Make the card body keyboard-clickable while leaving the drag handle and stage menu independent.
- [x] Pass the selected opportunity and account options into the detail sheet.
- [x] Save edits through the audited repository and invalidate pipeline/dashboard queries.
- [x] Run the focused pipeline test and axe scan.

### Task 3: File preview and named link target

**Files:**
- Modify: `src/components/app/file-manager.tsx`
- Test: `e2e/pipeline-files.spec.ts`

**Interfaces:**
- Produces: preview dialog for images, PDFs, CSV, and text.
- Consumes: `fileRepository.download` and workspace relationship options.

- [x] Add a failing test that opens a text-file preview and reads its stored contents.
- [x] Replace raw entity-ID entry with a named workspace record selector.
- [x] Make file rows clickable and download bytes only when preview opens.
- [x] Render images with `img`, PDFs with `object`, and text/CSV with a scrollable preformatted preview; always retain Download.
- [x] Revoke object URLs when the preview closes and preserve destructive confirmation.
- [x] Run the focused Storage test.

### Task 4: Profile photo and organization settings

**Files:**
- Create: `src/components/app/settings-page.tsx`
- Create: `src/hooks/use-profile.ts`
- Modify: `src/components/app/workspace-app.tsx`
- Modify: `src/components/app/module-definitions.ts`
- Test: `e2e/settings.spec.ts`

**Interfaces:**
- Produces: `useProfile(session, workspace)` and `/settings` tabs.
- Consumes: private `crm-files` Storage and the existing `profiles.avatar_url`, `workspaces.name/timezone/currency` columns.

- [x] Add failing tests for profile text updates, image upload, and owner-only organization settings.
- [x] Query the current profile and resolve its private avatar object to an in-memory URL.
- [x] Validate PNG/JPEG avatars up to 2 MiB, upload raw bytes with upsert, then update `profiles.avatar_url`.
- [x] Show the image with shadcn Avatar plus fallback in settings and the sidebar footer.
- [x] Add Profile and Organization tabs; save workspace name, timezone, and currency with an audit event.
- [x] Hide organization editing for non-owners and run the focused test plus axe.

### Task 5: Meaningful deterministic fixtures and full verification

**Files:**
- Modify: `supabase/seed.sql`
- Modify: `supabase/seed-storage.ts`
- Modify: `src/lib/seed.test.ts`
- Modify: `README.md`
- Modify: `e2e/COVERAGE.md`
- Append: `.logs/progress.md`, `.logs/friction.md`, `.logs/wins.md`, `.logs/proposals.md`

**Interfaces:**
- Produces: recognizable accounts, people, deals, activities, tasks, campaigns, files, and messages while retaining exact row counts.
- Consumes: the unchanged migration chain and deterministic seed hash test.

- [x] Replace numbered visible labels with deterministic company, person, deal, task, campaign, and document stories linked across tables.
- [x] Update Storage sample content/path names to match relational file metadata.
- [x] Reset twice, verify equal row counts and hashes, and update the locked seed digest.
- [x] Update README workflows and the coverage matrix.
- [x] Run unit tests, lint, build, clean migration, Storage seed, serialized Playwright, and upgrade dry run.
- [x] Append observed results to the run logs and hand off without committing.
