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
4. **Add tags.** In the open note, click the **Add a tag** box (just under the title), type a tag, and press **Enter**. Add as many as you like. Click the **×** on a tag to remove it. Tags are just labels like `work` or `shopping`.
5. **Filter by tag.** Tag buttons appear above the note list. Click one (for example `#work`) to show only notes with that tag; click **All** to show everything again.
6. **Switch notes.** Click any note in the left-hand list to open it.
7. **Share a note.** Open one of your notes and scroll to **Share this note** at the bottom. Type the email address of another person who uses the app and click **Share**. They will see the note the next time they open the app. To stop sharing, click **Remove** next to their email.
8. **Notes shared with you** appear in their own **Shared with me** section in the left column, marked **read-only**. You can open and read them, but you cannot change or delete them, and they never mix in with your own notes.
9. **Delete a note.** Open one of your own notes and click **Delete** (top right), then confirm.
10. **Sign out.** Click **Sign out** in the top-right corner. Sign back in anytime with the same email and password and your notes will be there.

**The web address updates as you go.** When you open a note, the address in your browser changes to point at that note, and choosing a tag filter adds it to the address too. That means you can bookmark a note or a filtered view, use the browser's Back and Forward buttons, or copy the address to jump straight back to where you were.

Your notes are private to your account. Someone signing in with a different account cannot see them, unless you explicitly share a note with them, and even then they can only read it.

### Where does my data go?

Everything is stored locally on your machine (a small database file inside this project). Nothing is sent to any server on the internet.

## Troubleshooting

- **"Port 5173 is already in use."** Another app is using that address. Stop it, or the app will pick the next free port (5174, 5175, …) and print the new address in the terminal. Open whichever address it shows.
- **The page is blank or won't load.** Make sure `bun dev` is still running in the terminal and open the exact address it printed.

## For developers

Optional: `bun run build` makes a production build. Stack: Vite + React + TypeScript + Tailwind CSS v4 + React Router, with [`@supabase/lite`](https://www.npmjs.com/package/@supabase/lite) providing the local database and authentication (a Supabase-compatible runtime running in-process via its Vite plugin). Tags are stored as a Postgres `text[]` column on each note; the selected note and tag filter live in the URL (`/note/:id?tag=...`). Sharing is a `note_shares` table (note + recipient email); read-only access for recipients and per-user isolation are both enforced by Postgres row-level security policies, not app code.
