# Daymark

Daymark is a quiet, personal to-do list. Create a private account, keep your next steps in one place, mark them complete, and remove them when they are no longer needed.

## Open Daymark

1. Install [Bun](https://bun.sh) if it is not already installed.
2. Open a terminal in this folder.
3. Install the app packages:

   ```bash
   bun install
   ```

4. Start the app:

   ```bash
   bun dev
   ```

5. Open the `http://localhost:5173` address shown in the terminal.

## Use the app

1. Choose **Create account**, enter your email and a password with at least six characters, then choose **Make my list**. If you already have an account, choose **Sign in** instead.
2. Type a task into **What needs your attention?**, choose an optional **Due date**, and select **No repeat** or **Every day**. Daily tasks require a due date. Select **Add task**; pressing Enter also adds it.
3. Use **All**, **Due today**, or **Overdue** above the list to change what you see. Overdue shows unfinished tasks whose date has passed.
4. Select the circle beside a task to mark it complete. For an **Every day** task, Daymark automatically adds the next occurrence for the following day. Select the circle again to make a completed task active.
5. Select the trash icon to delete a task.
6. The account indicator in the top-right shows who is signed in. Use its sign-out button to leave the list.

Each account has its own task list. The app stores the data in the local Supalite workspace, and the database rules also prevent one signed-in account from reading or changing another account’s tasks. Tasks without a date remain visible under **All**.

## Troubleshooting

- If port 5173 is already in use, Vite will choose the next available port. Open the URL it prints.
- If the page does not load after changing the database migration, stop the dev server and run `bun dev` again so the local database can apply the migration from the beginning.
- If sign-in does not work, check the email and password, then make sure the dev server is still running in the terminal.

## Build for production

```bash
bun run build
```

Daymark uses React, TypeScript, Vite, Tailwind CSS, and `@supabase/lite` with its Vite plugin.
