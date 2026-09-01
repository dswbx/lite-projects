# Due Dates and Filters Implementation Plan

> **For agentic workers:** Execute this plan task-by-task with review checkpoints.

**Goal:** Add an optional due date to each task and let a user view all tasks, tasks due today, or unfinished overdue tasks.

**Architecture:** Extend the existing `tasks` table with a nullable `due_date date` column through a new additive Supalite migration. Keep the existing user ownership and RLS policies unchanged. Load the signed-in user’s tasks once, derive the selected view locally from ISO date strings, and pass the resulting list into the existing task list component.

**Tech Stack:** React, TypeScript, Vite, Bun, Tailwind CSS v4, `@supabase/lite` Vite plugin, `@supabase/supabase-js`.

## Global Constraints

- Every generated project must use the `@supabase/lite` npm package as its data/runtime layer.
- Existing tasks must remain readable after the schema change.
- User ownership must remain enforced by the existing database RLS policies.
- Use calendar dates (`YYYY-MM-DD`) for due-date comparison; do not compare locale-formatted strings.
- Do not inspect sibling run directories in this repository.

---

### Task 1: Add the due-date field

**Files:**
- Create: `supabase/migrations/20260901180000_add_due_date_to_tasks.sql`
- Modify: `src/lib/supabase.ts`
- Modify: `.logs/progress.md`, `.logs/friction.md`, `.logs/wins.md`, `.logs/proposals.md`

**Interfaces:**
- `Task` gains `due_date: string | null`.
- The migration adds `tasks.due_date date` without changing existing rows or RLS policies.

- [ ] **Step 1: Write the additive migration**

Create this migration:

```sql
alter table public.tasks add column due_date date;
```

Keep it nullable so previously-created tasks remain valid and undated tasks are supported.

- [ ] **Step 2: Update the TypeScript task shape**

Add `due_date: string | null` to `Task` in `src/lib/supabase.ts`. No ownership policy changes are needed because the column is part of the already-protected row.

- [ ] **Step 3: Run the dev server and confirm migration application**

Run `CHOKIDAR_USEPOLLING=true bun dev -- --host 127.0.0.1` and confirm the new migration applies without errors. Stop the server after this check if it is not needed for later verification.

### Task 2: Add due-date creation and display

**Files:**
- Modify: `src/components/TaskComposer.tsx`, `src/components/TaskRow.tsx`, `src/components/TaskList.tsx`
- Modify: `src/App.tsx`, `src/index.css`

**Interfaces:**
- `TaskComposer.onCreate` becomes `(title: string, dueDate: string | null) => Promise<void>`.
- `TaskRow` displays the task’s date and a status label when the date is today or overdue.

- [ ] **Step 1: Add a date input to the composer**

Add an accessible `type="date"` input labeled “Due date” beside the task title. Keep it optional and pass `null` when empty. Reset it after a successful create.

- [ ] **Step 2: Persist due dates on create**

Update `handleCreate` to insert `{ user_id, title, due_date: dueDate }` and prepend the returned row with its server-generated fields.

- [ ] **Step 3: Display due dates in each task row**

Format `YYYY-MM-DD` for display using a local date-safe helper (`new Date(`${dueDate}T12:00:00`)`) and show “Today” or “Overdue” status text when applicable. Keep undated tasks free of placeholder noise.

- [ ] **Step 4: Style the date controls and metadata responsively**

Add styles for the date input, task metadata, today accent, and overdue accent. Preserve the existing mobile layout and visible focus states.

### Task 3: Add local filters

**Files:**
- Create: `src/components/TaskFilters.tsx`
- Create: `src/lib/dates.ts`
- Modify: `src/App.tsx`, `src/index.css`

**Interfaces:**
- `TaskFilters` accepts `value: TaskFilter` and `onChange: (value: TaskFilter) => void`.
- `TaskFilter` is the union `"all" | "today" | "overdue"`.

- [ ] **Step 1: Add the filter type and date helpers**

Define `TaskFilter` and use a local `todayKey()` helper that returns the current local date as `YYYY-MM-DD`. Define filtering as:

```ts
filter === "all" ||
(filter === "today" && task.due_date === today) ||
(filter === "overdue" && !task.completed && task.due_date !== null && task.due_date < today)
```

- [ ] **Step 2: Build the filter control**

Render three keyboard-accessible buttons labeled “All”, “Due today”, and “Overdue”. Include counts for due-today and overdue items, and expose the active state with `aria-pressed`.

- [ ] **Step 3: Filter the rendered list and empty state**

Keep the full task array for counts and updates. Derive `visibleTasks` with `useMemo`, pass it to `TaskList`, and show filter-specific empty copy when the selected view has no matching tasks.

### Task 4: Document and verify the feature

**Files:**
- Modify: `README.md`, `.logs/progress.md`, `.logs/friction.md`, `.logs/wins.md`, `.logs/proposals.md`

- [ ] **Step 1: Update README usage instructions**

Explain choosing a due date, recognizing Today/Overdue labels, and using the three filters. Mention that undated tasks remain in All.

- [ ] **Step 2: Run static verification**

Run `npm run build` and `git diff --check`. Expected: both pass.

- [ ] **Step 3: Run the live date/filter smoke test**

Against the local Vite/Supalite server, create one task due today, one task due yesterday, and one undated task. Query the task rows, verify the three date values persist, and verify the client filter predicates produce counts `all=3`, `today=1`, and `overdue=1` before completing the overdue task; after completion, overdue becomes `0`.

- [ ] **Step 4: Record concrete verification results**

Append the migration result, build result, filter counts, and any Supalite-specific friction or win to the run logs. Do not add generic praise or speculative proposals.
