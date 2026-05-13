# Bookmarks

A tiny personal bookmark manager. You sign up with an email and password, save links with a title, URL, and optional description, and organize them into folders. Search by title or URL. Each account only ever sees its own bookmarks.

Everything runs locally on your laptop. The website, the login system, and the database all live in one running command and store data in a single file on disk.

## Open it

You only need [Bun](https://bun.sh) (a fast runtime that also installs packages). If you don't have it, follow the one-line install on https://bun.sh.

Once Bun is installed, open a terminal in this folder and run:

```bash
bun install
bun dev
```

Then open http://localhost:5173 in your browser.

The first time you run `bun dev`, it sets up the database. You don't have to do anything for that.

## Use it

1. **Sign up.** On the first screen, type any email and a password (at least 6 characters) and click *Sign up*. You stay signed in until you click *Sign out* in the bottom-left corner.
2. **Add a bookmark.** Click *+ Add bookmark* in the top right. Fill in a title and URL (a description is optional). Pick a folder if you want, or leave it as *Unfiled*. Click *Save*.
3. **Make folders.** Click *+ New* next to "Folders" in the left rail and give it a name. Click a folder to see just the bookmarks inside it. Hover a folder to rename (✎) or delete (✕) it. Deleting a folder doesn't delete its bookmarks — they move to *Unfiled*.
4. **Move bookmarks.** Each bookmark has a small folder dropdown on the right. Pick a folder (or *Unfiled*) to move it.
5. **Search.** The search box at the top filters the current folder by title or URL as you type.
6. **Open a bookmark.** Click the title or the small grey domain text — it opens in a new tab.

## Where does your data live?

In `supabase/.temp/data.db`, a single file inside this folder. Nothing leaves your machine. Each account's bookmarks are kept separate by row-level security inside the database, so even if two people share this folder, they can only see what they themselves saved.

If you want to start over with an empty database, stop the dev server, delete `supabase/.temp/data.db`, then run `bun dev` again.

## Troubleshooting

- **Port 5173 is already in use.** Stop whatever is using it (often another `vite` window), or set a different port: `bun dev --port 5180`.
- **`bun: command not found`.** Install Bun from https://bun.sh and restart your terminal.
- **Login says "Invalid login credentials."** Make sure you signed up first (the toggle below the button), and that the password is at least 6 characters.
- **Nothing shows up after I add a bookmark.** Make sure you're on *All bookmarks* in the left rail. If you have a search filter active, clear it.

## Build a production version (optional)

```bash
bun run build
```

This produces a static frontend in `dist/`. Note that this only builds the website part — the database/auth server is the `vite` dev server, so you'd need to host that part separately for a real deployment. This template is meant for local use.

## Stack

Vite + React + TypeScript + Tailwind v4 on the front. [supabase/lite](https://github.com/supabase/lite) (`lite-supa`) for auth + REST + SQLite database, running as a Vite plugin in the same process. Schema lives in `supabase/migrations/*.sql` and is applied automatically by `bun dev`.
