# Simple Project Board

This app lets you keep track of projects and tasks on a drag-and-drop board. You can create projects, add tasks, and move tasks between **To Do**, **In Progress**, and **Done**.

Each username only sees their own projects in this app.

## How to open it

1. Install Node.js (https://nodejs.org) if needed.
2. Open a terminal in this folder.
3. Run:

```bash
npm install
npm i https://pkg.pr.new/supabase-community/lite/@supabase/lite@222
```

4. Open `index.html` in your browser.

## How to use it

1. Type a username and click **Continue**.
2. Add a project from **New project name**.
3. Select a project.
4. Add tasks from **Task title**.
5. Drag task cards between columns to change status.

Your data is stored in your browser local storage for this prototype.

## Troubleshooting

- If nothing appears, refresh the page.
- If you want a clean reset, clear your browser local storage for this page.

## Tech note

This run includes `@supabase/lite@222` as requested.
