# Personal Todo Implementation Plan

> **For agentic workers:** Execute this plan task-by-task with review checkpoints.

**Goal:** Build a polished, browser-based to-do list where authenticated users can create, complete, and delete only their own tasks.

**Architecture:** A Vite + React single-page app uses `@supabase/lite/vite` to run a local SQLite-backed Supabase-compatible API in the Vite process. Supabase Auth identifies the current user; a `tasks` table stores ownership in `user_id`, and row-level security policies enforce that every read/write is limited to `auth.uid() = user_id`.

**Tech Stack:** ESM, TypeScript, Vite, React, Bun, Tailwind CSS v4, `@supabase/lite`, `@supabase/supabase-js`.

## Global Constraints

- Every generated project must use the `@supabase/lite` npm package as its data/runtime layer.
- The project must ship a plain-language `README.md` with Bun setup and usage instructions.
- User-owned task isolation must be enforced by database row-level security, not only by client-side filtering.
- The UI must work on mobile widths, expose visible keyboard focus, and respect reduced-motion preferences.
- Do not inspect sibling run directories in this repository.

---

### Task 1: Scaffold the Vite application and inspect Supalite

**Files:**
- Create: `package.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `tsconfig*.json`
- Create: `supabase/config.toml`, `supabase/migrations/20260901170000_create_tasks.sql`
- Modify: `.logs/progress.md`, `.logs/friction.md`, `.logs/wins.md`, `.logs/proposals.md`

**Interfaces:**
- Produces a runnable Vite React TypeScript project with the installed `@supabase/lite` package and the package's documented Vite plugin.

- [ ] **Step 1: Install the runtime dependencies and inspect shipped package docs**

Run:

```bash
bun add vite @vitejs/plugin-react typescript react react-dom @types/react @types/react-dom @supabase/lite @supabase/supabase-js tailwindcss @tailwindcss/vite lucide-react
```

Then read `node_modules/@supabase/lite/LIMITATIONS.md` and `node_modules/@supabase/lite/README.md`; read `STATUS.md` if auth or RLS details are needed. Record every public URL consulted in `.logs/progress.md`.

- [ ] **Step 2: Add the Vite/Tailwind scripts and plugin configuration**

Configure `vite.config.ts` with `react()`, `tailwindcss()`, and the documented `@supabase/lite/vite` plugin. Add scripts for `dev`, `build`, and `preview` in `package.json`.

- [ ] **Step 3: Add the browser entry point and base styles**

Render `<App />` from `src/main.tsx`. In `src/index.css`, import Tailwind and define the paper/ink/citrus color tokens, type scale, focus treatment, responsive layout helpers, and reduced-motion behavior used by the app.

- [ ] **Step 4: Verify the scaffold builds**

Run `bun run build`. Expected: TypeScript and Vite complete without errors.

### Task 2: Create the owned-task data model and client boundary

**Files:**
- Create: `src/lib/supabase.ts`
- Modify: `supabase/migrations/20260901170000_create_tasks.sql`, `src/App.tsx`
- Modify: `.logs/progress.md`, `.logs/friction.md`, `.logs/wins.md`, `.logs/proposals.md`

**Interfaces:**
- Produces `supabase` from `createClient(window.location.origin, "local-dev-key")` and a `tasks` table with `id`, `user_id`, `title`, `completed`, `created_at`, and `updated_at`.

- [ ] **Step 1: Write the migration with ownership and RLS**

Create the `tasks` table with a UUID primary key, `user_id uuid not null`, non-empty trimmed `title`, `completed boolean not null default false`, and timestamps. Enable RLS and add select/insert/update/delete policies whose `USING` and `WITH CHECK` clauses require `auth.uid() = user_id`; do not use a SQLite-incompatible `DEFAULT auth.uid()`.

- [ ] **Step 2: Create the Supabase-compatible client**

Export a single client from `src/lib/supabase.ts` using the URL and non-empty key shape documented for the Vite plugin.

- [ ] **Step 3: Add typed task and session helpers**

Define the local `Task` and `TaskInsert` TypeScript shapes and implement the minimal query/mutation calls in the app layer: `getSession`, `onAuthStateChange`, `from("tasks").select("*").order("created_at", { ascending: false })`, insert with `user_id`, update `completed`, delete by `id`, and sign-out.

- [ ] **Step 4: Verify the migration is discovered by the dev server**

Run `bun run dev -- --host 127.0.0.1`, load the app, and confirm the local database initializes and the migration runs. Record any Supalite-specific behavior in the appropriate log before changing code.

### Task 3: Implement auth and task interactions

**Files:**
- Create: `src/components/AuthPanel.tsx`, `src/components/TaskComposer.tsx`, `src/components/TaskList.tsx`, `src/components/TaskRow.tsx`
- Modify: `src/App.tsx`, `src/index.css`

**Interfaces:**
- `AuthPanel` accepts `onSubmit(email, password, mode)` and renders sign-in/sign-up states.
- `TaskComposer` accepts `onCreate(title)` and emits a trimmed title.
- `TaskList` accepts `tasks`, `onToggle(id, completed)`, and `onDelete(id)`.
- `TaskRow` renders one task with an accessible completion control and delete button.

- [ ] **Step 1: Build the auth panel**

Implement email/password sign-in and sign-up with clear loading, error, and confirmation states. Keep the form keyboard-accessible and make the mode switch explicit (`Sign in` / `Create account`).

- [ ] **Step 2: Build task creation**

Implement a single-line composer with a useful placeholder, disabled empty submit state, Enter-to-submit behavior through the form, and a visible pending state while the insert runs.

- [ ] **Step 3: Build task list, completion, and deletion**

Render an empty state, active/completed counts, and rows with optimistic-feeling but server-confirmed update behavior. Use accessible labels for check and delete controls; provide inline error feedback when a mutation fails.

- [ ] **Step 4: Compose the signed-out and signed-in screens**

Show a branded welcome/auth view when there is no session. Show the task workspace with current-user email and sign-out when authenticated. Load tasks whenever the session changes and clear task state on sign-out.

### Task 4: Apply the final visual system and documentation

**Files:**
- Modify: `src/App.tsx`, `src/components/*.tsx`, `src/index.css`
- Create: `README.md`, `.gitignore`
- Modify: `.logs/progress.md`, `.logs/friction.md`, `.logs/wins.md`, `.logs/proposals.md`

**Interfaces:**
- Produces the complete user-facing experience and run instructions for a non-technical user.

- [ ] **Step 1: Add the distinctive desk-pad visual language**

Use a warm mineral background, compact serif display treatment for the product title, clean sans-serif body copy, thin rule lines, a small progress ring/marker, and a citrus completion accent. Avoid generic gradients and excessive rounded cards; keep the task list calm and legible.

- [ ] **Step 2: Add responsive and accessibility polish**

Check the 375px layout, visible `:focus-visible` states, semantic headings/forms, contrast, and `@media (prefers-reduced-motion: reduce)` behavior.

- [ ] **Step 3: Write the plain-language README**

Document installing Bun, running `bun install`, starting `bun dev`, opening the printed localhost URL, creating an account, managing tasks, the browser-local data boundary, troubleshooting, and `bun run build`.

- [ ] **Step 4: Run final verification**

Run `bun run build`, inspect the changed-file list, and use the dev server to verify sign-up/sign-in, task creation, completion, deletion, refresh persistence, and the fact that the signed-out screen does not display task data. Record concrete wins, frictions, and doc proposals in `.logs/`.
