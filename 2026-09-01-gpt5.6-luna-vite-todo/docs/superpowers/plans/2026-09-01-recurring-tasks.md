# Recurring Tasks Implementation Plan

> **For agentic workers:** Execute this plan task-by-task with review checkpoints.

**Goal:** Let users mark a task as daily recurring and automatically create the next day’s occurrence when they complete it.

**Architecture:** Add `recurrence` and nullable `series_id` columns in an additive Supalite migration. New daily tasks get a generated series id; completing one updates the current row and inserts the next row for the next local calendar date only when that series/date does not already exist. The current task list keeps its existing per-user RLS query and date filters, while the composer and row metadata expose the recurrence state.

**Tech Stack:** React, TypeScript, Vite, Bun, Tailwind CSS v4, `@supabase/lite` Vite plugin, `@supabase/supabase-js`.

## Global Constraints

- Every generated project must use the `@supabase/lite` npm package as its data/runtime layer.
- Existing tasks must migrate to non-recurring without losing title, date, completion, or ownership.
- User ownership must remain enforced by the existing database RLS policies.
- Daily occurrence dates use local ISO calendar keys (`YYYY-MM-DD`), not UTC string slicing.
- Do not inspect sibling run directories in this repository.

---

### Task 1: Add recurring-task schema and types

**Files:**
- Create: `supabase/migrations/20260901190000_add_daily_recurrence_to_tasks.sql`
- Modify: `src/lib/supabase.ts`, `src/lib/dates.ts`
- Modify: `.logs/progress.md`, `.logs/friction.md`, `.logs/wins.md`, `.logs/proposals.md`

**Interfaces:**
- `Recurrence` is the union `"none" | "daily"`.
- `Task` gains `recurrence: Recurrence` and `series_id: string | null`.
- `addDays(dateKey: string, days: number): string` returns a local ISO date key.

- [x] **Step 1: Write the additive migration**

Create:

```sql
alter table public.tasks add column recurrence text not null default 'none' check (recurrence in ('none', 'daily'));
alter table public.tasks add column series_id uuid;
create index tasks_series_due_idx on public.tasks(user_id, series_id, due_date);
```

The existing RLS policies already cover all columns on `tasks`; do not create a second policy set.

- [x] **Step 2: Extend the task type and date helper**

Add the `Recurrence` type and fields to `Task`. Implement `addDays` by parsing `${dateKey}T12:00:00`, calling `setDate`, and formatting through the existing local `todayKey` helper so DST transitions do not shift a date.

- [x] **Step 3: Verify the migration applies without reset**

Run the existing Vite/Supalite dev server and confirm it reports the new migration as applied while preserving the existing database file and task rows.

### Task 2: Add recurring-task creation and display

**Files:**
- Modify: `src/components/TaskComposer.tsx`, `src/components/TaskRow.tsx`
- Modify: `src/App.tsx`, `src/index.css`

**Interfaces:**
- `TaskComposer.onCreate` becomes `(title: string, dueDate: string | null, recurrence: Recurrence) => Promise<void>`.
- Daily creation requires a due date and generates one `series_id` for the new task.

- [x] **Step 1: Add a repeat selector to the composer**

Render a labeled select with `No repeat` and `Every day` options. When `Every day` is selected, make the existing date input required, and reset both fields after a successful create.

- [x] **Step 2: Persist recurrence metadata**

Update `handleCreate` to insert `{ user_id, title, due_date: dueDate, recurrence, series_id: recurrence === "daily" ? crypto.randomUUID() : null }`.

- [x] **Step 3: Show recurrence status on task rows**

Add a small `Daily` metadata label with a repeat icon for daily tasks, next to the due-date label. Keep completed rows and existing due-date status styling intact.

### Task 3: Create the next daily occurrence on completion

**Files:**
- Modify: `src/App.tsx`, `src/index.css`
- Modify: `.logs/progress.md`, `.logs/wins.md`

**Interfaces:**
- Completing a daily task with `due_date` and `series_id` creates at most one next row with the same title, `recurrence: "daily"`, same `series_id`, and `due_date: addDays(task.due_date, 1)`.

- [x] **Step 1: Update the current task as before**

Keep the existing ownership-scoped update and local state change for `completed: true`.

- [x] **Step 2: Check for an existing next occurrence**

After a successful completion, query the current user’s `tasks` by `series_id` and next `due_date`, limiting to one row. Skip insertion if one already exists so repeated completion attempts do not duplicate the next occurrence.

- [x] **Step 3: Insert and surface the next occurrence**

When no next row exists, insert it with the current user id, same title/series/recurrence, and next date; prepend the returned row to local tasks and show a concise success message naming the next date.

- [x] **Step 4: Preserve non-recurring behavior**

Only daily tasks with both a due date and series id trigger the follow-up query/insert. Completing undated or non-recurring tasks changes only their completion state.

### Task 4: Document and verify recurring tasks

**Files:**
- Modify: `README.md`, `.logs/progress.md`, `.logs/friction.md`, `.logs/wins.md`, `.logs/proposals.md`

- [x] **Step 1: Update README usage instructions**

Explain selecting `Every day`, why a due date is required for recurring tasks, and that completing one creates the next day’s task automatically.

- [x] **Step 2: Run static verification**

Run `npm run build` and `git diff --check`. Expected: both pass.

- [x] **Step 3: Run the live recurring-task smoke test**

Against the local Vite/Supalite server, create one daily task due today, complete it, verify that the original is complete and exactly one new task exists for tomorrow with the same series id and daily recurrence, then complete the new occurrence and verify the following day is created. Also complete one non-recurring task and verify no extra row appears.

- [x] **Step 4: Record concrete verification results**

Append the migration result, recurrence counts, build result, and any Supalite-specific friction or win to the run logs. Do not add generic praise or speculative proposals.
