# Iron Log

A simple workout tracker that runs entirely in your browser on your computer. Create workouts, log exercises with sets, reps, and weight, and look back at your history later.

Each account only sees its own workouts. Your data is stored locally on this machine (not on Supabase’s cloud).

## What you need

Install [Bun](https://bun.sh) if you do not have it yet. Bun is a small tool that runs the app on your computer.

## How to open the app

1. Open Terminal (Mac) or your command line.
2. Go into this project folder:
   ```bash
   cd 2026-05-27-composer25-vite-workout-log
   ```
3. Install dependencies (first time only):
   ```bash
   bun install
   ```
4. Start the app:
   ```bash
   bun dev
   ```
5. In your browser, open the address shown in the terminal (usually **http://localhost:5173**).

## How to use it

1. **Create an account** — enter an email and password, then tap **Create account**. Or **Sign in** if you already have one.
2. **Log a workout** — on the **Log workout** tab, name your session, pick a date, and add exercises. For each exercise, fill in reps and weight (in pounds) for each set. Tap **Save workout**.
3. **Browse history** — open the **History** tab to see past workouts. Tap one to view all sets. You can delete a workout from the detail screen.
4. **Sign out** — use **Sign out** in the top corner when you are done.

## Where your data lives

Everything is saved in a local database file on your computer (`supabase/.temp/data.db`), managed by Supabase Lite. It does not sync to the internet unless you change the setup yourself.

## Troubleshooting

- **“Port already in use”** — another app is using port 5173. Stop that app or change the port in `vite.config.ts`.
- **Blank page after sign-in** — refresh the browser once. If it persists, stop the server (`Ctrl+C`) and run `bun dev` again.
- **Cannot save workout** — make sure you are signed in and each exercise has at least one set with reps filled in.

## Production build (optional)

```bash
bun run build
bun run preview
```

Built with React, Vite, Tailwind CSS, and `@supabase/lite` (local Supabase-compatible API).
