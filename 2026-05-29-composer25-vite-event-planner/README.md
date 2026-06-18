# Event Planner

Plan parties, meetups, and get-togethers in one place. Give each event a name, date, and location, invite guests, and track who said yes, no, or is still deciding. Your events are private: only you see what you create after you sign in.

## How to open it

1. Install [Node.js](https://nodejs.org) if you do not have it yet (this gives you the `npm` command).
2. Open a terminal in this folder.
3. Run:

```bash
npm install
npm run dev
```

4. Open the link shown in the terminal (usually **http://localhost:5173**).

## How to use it

1. **Sign up or sign in** with your email and a password (at least 6 characters).
2. On the home screen, tap **New event** and fill in the name, date, time, location, and any guest names.
3. Your **upcoming events** appear in date order (soonest first). Tap an event to open it.
4. On the event page you can **edit** details, **add or remove guests**, and set each guest’s **RSVP** to Pending, Yes, or No.
5. Tap **Sign out** when you are done. Your data stays on this computer in a local database tied to your account.

## Where your data lives

Everything is stored locally in your browser session’s database on this machine (via Supabase Lite). It is not sent to Supabase’s cloud. If you clear site data or use another browser, you will need to sign in again; data may not carry over unless you use the same browser profile and folder.

## Troubleshooting

- **“Port already in use”** — Another app is using port 5173. Stop that app or run `npm run dev -- --port 5174` and open the new port in your browser.
- **Cannot sign in** — Check email and password. For a new account, use **Create an account** first.
- **Blank page after install** — Run `npm install` again, then `npm run dev`.

## Optional: production build

```bash
npm run build
npm run preview
```

Note: the local Supabase API is meant for development with `npm run dev`. Preview mode may not include the full backend.

Built with React, Vite, Tailwind, and `@supabase/lite`.
