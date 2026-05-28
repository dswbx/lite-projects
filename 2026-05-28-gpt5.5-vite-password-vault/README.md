# Personal Password Vault

This app lets you keep a small private list of website logins. You can create an account, save a site name, username, and password, search by site name, edit entries, reveal a saved password when needed, and delete entries you no longer want.

Passwords are encrypted in your browser before they are saved. The app is a local prototype for testing the flow, so do not store real passwords in it.

## How to open it

1. Install Bun from https://bun.sh if you do not already have it.
2. Open a terminal in this folder.
3. Run `bun install`.
4. Run `bun dev`.
5. Open the URL shown in the terminal, usually `http://localhost:5173`.

If Bun is not available, `npm install` and `npm run dev` also work for this project.

## How to use it

1. Choose **Create account** the first time you open the app, enter an email and a password of at least 8 characters, then click **Create my vault**.
2. After you are signed in, use **Save a new entry** to enter the site name, username, and password. Click **Save entry**.
3. Your entries appear in **Your vault**. Type in **Search by site name** to narrow the list.
4. Click **Reveal** to show a saved password, then **Hide** to cover it again.
5. Click **Edit** to change a saved entry. Click **Delete** to remove one.
6. Click **Sign out** when you are done. If you refresh while still signed in, the app asks for your password again so it can decrypt saved passwords in this browser session.

Each signed-in user only sees their own vault entries. The local Supabase Lite database enforces that rule, and the app also filters entries for the signed-in user.

## Where the data goes

The app runs Supabase Lite inside the Vite dev server. Account records and vault entries are saved in the local development database under `supabase/.temp`, which is ignored by git. Saved password values are encrypted before they are written, while site names and usernames stay readable so the app can display and search them.

## Troubleshooting

- If the terminal says the port is already in use, stop the other dev server or run `bun dev -- --port 5174` and open the new URL it prints.
- If the vault will not unlock after a refresh, sign out and sign in again with the account password you used when saving entries.
- If the database looks out of date during development, stop the dev server, delete `supabase/.temp`, and run `bun dev` again.

## Optional build

Run `bun run build` to create a production build in `dist`. The static build does not include a hosted backend, so use `bun dev` for the full local Supabase Lite experience.

## Stack

Built with React, TypeScript, Vite, Tailwind CSS, `@supabase/lite@0.3.1-next.1`, and `@supabase/supabase-js`.
