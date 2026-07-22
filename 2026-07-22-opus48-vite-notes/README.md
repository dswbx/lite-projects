# Notes

A simple private notes app. Sign up with an email and password, then create, edit, and delete notes. Every account only sees its own notes. Your data stays on your own computer in a small local database file.

## How to open it

You need **Bun**, a fast tool for running web apps. If you don't have it, install it from https://bun.sh (one command, takes a few seconds).

Then, in a terminal, from this folder:

```bash
bun install     # download the app's building blocks (first time only)
bun dev         # start the app
```

You'll see a line like `Local: http://localhost:5173/`. Open that address in your web browser.

To stop the app later, go back to the terminal and press `Ctrl + C`.

## How to use it

1. **Create an account.** On the first screen click **Sign up**, enter any email and a password (at least 6 characters), and click **Sign up**. You're signed in right away, no email confirmation needed.
2. **Create a note.** Click **+ New note** on the left. A blank note opens on the right.
3. **Write.** Type a title and your text. Changes save automatically a moment after you stop typing, so there's no save button.
4. **Switch notes.** Click any note in the left-hand list to open it.
5. **Delete a note.** Open it and click **Delete** (top right of the note), then confirm.
6. **Sign out.** Click **Sign out** in the top-right corner. Sign back in anytime with the same email and password and your notes will be there.

Your notes are private to your account. Someone signing in with a different account cannot see them.

### Where does my data go?

Everything is stored locally on your machine (a small database file inside this project). Nothing is sent to any server on the internet.

## Troubleshooting

- **"Port 5173 is already in use."** Another app is using that address. Stop it, or the app will pick the next free port (5174, 5175, …) and print the new address in the terminal. Open whichever address it shows.
- **The page is blank or won't load.** Make sure `bun dev` is still running in the terminal and open the exact address it printed.

## For developers

Optional: `bun run build` makes a production build. Stack: Vite + React + TypeScript + Tailwind CSS v4, with [`@supabase/lite`](https://www.npmjs.com/package/@supabase/lite) providing the local database and authentication (a Supabase-compatible runtime running in-process via its Vite plugin).
