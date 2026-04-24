# Notes

A personal notes app. Sign up, log in, and keep private notes that only you can see.

## How to open it

You need [Bun](https://bun.sh) installed. If you don't have it yet, run this in your terminal:

```bash
curl -fsSL https://bun.sh/install | bash
```

Then:

```bash
bun install
bun dev
```

Open your browser at **http://localhost:5173**.

## How to use it

1. **Sign up** — enter your email and a password (at least 6 characters), then click "Create account".
2. **Log in** — next time, click "Log in" and enter the same email and password.
3. **Create a note** — click "+ New note", give it a title, write your content, and click "Save".
4. **Edit a note** — click any note in the left panel, change the title or content, and click "Save".
5. **Delete a note** — hover over a note in the list and click the trash icon that appears.
6. **Search** — type in the search box to filter notes by title.

Your notes are stored locally on your machine. Nobody else can see them.

## Troubleshooting

**Port already in use:** If `bun dev` fails with a port error, close other dev servers or run `bun dev --port 5174`.

**Blank screen after sign up:** The app signs you in automatically after sign up. If the screen stays blank, try refreshing the page.

## Build for production

```bash
bun run build
```

Output goes to `dist/`. Serve it with any static file server.

---

Stack: React 19 + TypeScript + Vite + Tailwind v4 + supabase/lite (local SQLite backend)
