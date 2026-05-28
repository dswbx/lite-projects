# Movie Watchlist

A personal list of films you want to see and ones you have already watched. You can add a title and optional notes, mark films as watched with a star rating and short review, and filter or sort your list. Only you see your movies after you sign in.

## How to open it

1. Install [Bun](https://bun.sh) if you do not have it yet.
2. Open a terminal in this folder.
3. Run:

```bash
bun install
bun dev
```

4. Open the link shown in the terminal (usually http://localhost:5173).

## How to use it

1. **Sign up or sign in** with your email and a password (at least 6 characters). Each account has its own list.
2. **Add a film** using the form at the top: title is required; notes are optional (for example where to watch or who recommended it).
3. **Mark as watched** on a card: pick 1–5 stars and optionally write a review, then save.
4. **Filter** with the pills: All, To watch, or Watched.
5. **Sort** with the dropdown: recently added, or rating high-to-low / low-to-high (handy for watched films).
6. **Edit or remove** items from each card.

Your list is stored locally in the browser through Supabase Lite (SQLite in the dev server). It is not sent to Supabase’s cloud unless you later deploy somewhere else.

## Troubleshooting

- **Port already in use:** Another app may be using port 5173. Stop that app or let Vite pick another port and use the URL it prints.
- **Cannot sign in:** Double-check email and password. Use “Sign up” first if you are new.
- **Blank list after sign-in:** Add a film with the form at the top.

## Optional

```bash
bun run build
```

Creates a production build in `dist/`. Note: the built preview does not include the local database API; use `bun dev` for full functionality.

Built with React, Vite, Bun, Tailwind, and `@supabase/lite`.
