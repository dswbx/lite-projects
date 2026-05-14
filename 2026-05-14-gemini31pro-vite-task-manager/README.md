# Task Manager

A simple task manager application that lets you keep track of your to-dos. You can create tasks, set due dates, assign priorities, and mark them as done. Each user has their own private task list.

## How to run it

1. Make sure you have [Bun](https://bun.sh) installed.
2. Open your terminal in this directory and run:

```bash
bun install
bun dev
```

3. Open your browser to `http://localhost:5173`.

## How to use it

1. **Sign Up / Sign In**: When you first open the app, you'll be asked to sign in. If you don't have an account, click "Don't have an account? Sign up" and create one with an email and password.
2. **Add a Task**: Once logged in, you'll see your task list. Type a task title, optionally pick a due date and priority, and click "Add Task".
3. **Mark as Done**: Click the circle icon next to a task to mark it as done (or undo it).
4. **Delete a Task**: Click the trash can icon to remove a task permanently.
5. **Filter Tasks**: Use the dropdowns at the top to filter your tasks by status (Pending/Done) or priority (Low/Medium/High).

## Troubleshooting

- **Port already in use**: If `bun dev` complains about port 5173 being in use, Vite will automatically try the next available port (like 5174). Check the terminal output for the correct URL.
- **Database issues**: If you want to reset your local database, you can run `bunx lite dev --recreate` to wipe the data and reapply the schema.

---
*Built with React, Vite, Tailwind CSS, and Supalite.*
