# Northstar — Goal Tracker

Northstar helps you set personal goals, add a short description and target date, break each goal into smaller milestones, and check milestones off as you go. Everything is saved on your computer while the app is running, and each person only sees their own goals after signing in.

## How to open it

You need [Bun](https://bun.sh) installed (a small tool that runs JavaScript). If you do not have it yet, install Bun from that link, then:

1. Open a terminal in this folder.
2. Run `bun install` (downloads what the app needs — only needed the first time).
3. Run `bun dev` (starts the app).
4. Open the link shown in the terminal, usually **http://localhost:5173**.

## How to use it

1. **Sign up** with your email and a password (at least 6 characters), or **sign in** if you already have an account.
2. Click **New goal**, enter a title, optional description, and optional target date, then **Create goal**.
3. Click a goal card to open it.
4. Under **Milestones**, type a step and click **Add**. Check the box when a step is done.
5. Use **Edit goal** or **Delete goal** on the detail screen if you need to change or remove a goal.
6. Click **Sign out** when you are done.

Your goals and milestones are stored in a local database file under `supabase/.temp/` on this machine. They are not sent to Supabase’s cloud. Row-level security means your account cannot read another user’s goals.

## Troubleshooting

- **“Port already in use”** — Another app is using port 5173. Stop the other app or change the port in `vite.config.ts`.
- **Blank list after sign-in** — Make sure `bun dev` is still running and refresh the page.
- **Sign-in errors** — Double-check email and password; for a new account, use **Sign up** first.

## Optional: production build

Run `bun run build`, then `bun run preview` to try a built version locally.

Built with Vite, React, Tailwind, and [@supabase/lite](https://www.npmjs.com/package/@supabase/lite) (`@supabase/lite@next`).
