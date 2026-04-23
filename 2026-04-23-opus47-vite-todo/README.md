# Todos

A tiny app for keeping track of things you need to do.

Each todo is either **public** (anyone visiting the site can see it) or **private** (only you can see it, after you sign in). You can add new todos, tick them off when done, and delete them when you're finished.

## How to open it

You need a tool called **Bun** on your computer. Bun runs this app. If you don't have it yet, install it from https://bun.sh (one command, takes about 30 seconds).

Then, in a terminal, from this folder:

1. `bun install` — downloads the pieces the app needs. Do this once.
2. `bun dev` — starts the app.
3. Open http://localhost:5173 in your browser.

That's it. Your todos live in a file on your computer (`supabase/.temp/data.db`), not on the internet.

## How to use it

**As a guest (not signed in)**

When you open the app, you'll see a list of **public** todos that other people on this computer's app have shared. You can't add, change, or delete anything until you sign in.

**Sign up / sign in**

Scroll down to the box at the bottom. Pick **Sign up**, type an email and a password (at least 6 characters), and click **Sign up**. No email confirmation — you're in right away. Next time you visit, use **Sign in** with the same email and password.

**Adding a todo**

Once signed in, type what you need to do in the box at the top and click **Add**. If you want everyone to see it, tick the **public** checkbox before clicking Add. Leave it unticked to keep it private (only you will see it, even after signing out and back in).

**Checking it off**

Click the checkbox to the left of any of your todos to mark it done. Done todos get greyed out with a line through them. Click again to un-check.

**Deleting**

Click **delete** on the right side of any of your todos to remove it for good.

**Signing out**

Top right corner, click **Sign out**. You'll go back to the guest view — you can still see public todos from anyone, but not your private ones.

## Troubleshooting

- **"Port 5173 is already in use"** — another app is using that port. Stop it, or run `bun dev -- --port 5174` and open http://localhost:5174 instead.
- **I want to start fresh** — stop the app (Ctrl+C in the terminal), delete the file `supabase/.temp/data.db`, then run `bun dev` again. All users and todos are gone.

## Optional

- `bun run build` — builds a production version into the `dist/` folder.

**Stack:** Vite + React + TypeScript + Tailwind v4, with [supabase/lite](https://github.com/supabase/lite) providing the auth + database inline in the dev server.
