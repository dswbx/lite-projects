# Contacts

A simple private contact book that runs entirely on your computer. Add people you know, keep their details, and find them quickly. Only you can see your contacts.

## How to open it

1. Install Bun from https://bun.sh if you don't have it yet (takes 30 seconds).
2. Open a terminal in this folder.
3. Run `bun install`
4. Run `bun dev`
5. Open http://localhost:5173 in your browser.

That's it. The app starts instantly and keeps your data in a local file.

## How to use it

- Sign up with any email and password (or sign in if you already have an account). Everything stays private to you.
- Click **Add contact** to create a new entry. Fill in name (required), email, phone, and any notes.
- Your contacts appear as clean cards. Use the search bar at the top to filter by name instantly.
- Hover a card to reveal edit and delete buttons.
- Edit lets you change any detail. Delete asks for confirmation.

All data lives only in the browser and a local SQLite file inside the `supabase/` folder. Nothing is sent to the internet.

## Troubleshooting

- Port 5173 already in use? The terminal will tell you. Close the other app or change the port in vite.config.ts.
- If you see a login error, double-check the email/password or try signing up first.

## Optional

Run `bun run build` to create a production-ready version in the `dist` folder.

Built with Vite, React, TypeScript, Tailwind, and Supabase Lite (local Supabase-compatible backend).
