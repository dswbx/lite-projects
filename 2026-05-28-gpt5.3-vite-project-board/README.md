# Simple Project Board

This is a personal project board you can run on your own computer. You can create projects, add tasks, and move tasks between **to-do**, **in progress**, and **done**.

Each browser user sees only their own projects. Your data is stored locally by the app runtime on your machine.

## How to open it

1. Install Bun (if you do not already have it): https://bun.sh
2. Open a terminal in this folder.
3. Install dependencies:
   ```bash
   bun install
   ```
4. Start the app:
   ```bash
   bun dev
   ```
5. Open the URL shown in terminal (usually http://localhost:5173).

## How to use it

1. In **Projects**, type a project name and click **Create project**.
2. Choose your project from the project list.
3. In **Tasks**, type a task title and click **Add task**.
4. Change a task's status either by clicking the buttons on the task card or by dragging the card into a different column:
   - to-do
   - in progress
   - done
5. Refresh the page — your projects/tasks stay available in your local setup.

## Troubleshooting

- **Port already in use**: run `bun dev --port 5174` and open the new URL.
- **Blank page after install**: stop dev server, run `bun install` again, then `bun dev`.
- **No tasks showing**: confirm a project is selected before adding tasks.

## Optional build command

```bash
bun run build
```

Built with Vite + React + TypeScript + `@supabase/lite`.
