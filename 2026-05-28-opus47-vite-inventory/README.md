# Home Inventory

A small web app to keep track of the things you own at home. Add items, say how
many you have, where you keep them, and what kind of thing they are — then
filter the list to find what you need. Each account only sees its own stuff.

## How to open it

You need [Bun](https://bun.sh) installed (a one-line install — follow the link).

In a terminal, from this folder, run:

```bash
bun install
bun dev
```

Then open the address that the terminal prints (it will look like
`http://localhost:5173`). That's the app.

The first time you visit, you'll see a sign-in screen. Click "Sign up" to make
an account with an email and password (anything works — no real email is
sent). Sign in once you've created the account.

## How to use it

1. **Sign up / sign in.** Use any email and a password of at least 6
   characters. Your data is private to that account.
2. **Add an item.** Fill in the "Add an item" form at the top:
   - **Name** — what the thing is (e.g. "Hammer").
   - **Category** — a group, like "Tools" or "Kitchen". Categories you've used
     before will autocomplete.
   - **Qty** — how many you have.
   - **Location** — where you keep it, like "Garage" or "Hall closet". Past
     locations autocomplete too.
   - Click **Add item**.
3. **Browse and filter.** The table below shows everything you've added. Use
   the **All categories** and **All locations** dropdowns to narrow the list.
   "Clear filters" resets them.
4. **Edit or delete.** Each row has Edit and Delete links on the right. Edit
   loads the item back into the form at the top — make changes and click
   "Save changes". Delete asks for confirmation.
5. **Sign out** with the button in the top-right.

## Where does my data go?

All data lives on your computer, in a local SQLite database file at
`supabase/.temp/data.db` inside this project folder. Nothing is sent to a
server on the internet. If you delete that file, you start fresh.

## Troubleshooting

- **"Port 5173 is in use"** — close the other thing using it, or run
  `bun dev --port 5174` and open that port instead.
- **Forgot your password?** This local app doesn't send recovery emails — the
  simplest fix is to delete `supabase/.temp/data.db` and sign up again. (You'll
  lose your inventory.)
- **Nothing happens after sign-up.** Open the browser's developer console
  (F12) and check for an error message in the Network or Console tab.

## Production build

```bash
bun run build
```

The output lands in `dist/`. Note: the backend (auth + database) only runs
inside `bun dev`. To deploy this for real you'd need to host the backend
separately — see the [@supabase/lite docs](https://www.npmjs.com/package/@supabase/lite).

## Stack

Vite + React + TypeScript + Tailwind v4, with [@supabase/lite](https://www.npmjs.com/package/@supabase/lite/v/0.3.1-next.1) (0.3.1-next.1) providing the auth and database layer through its Vite plugin.
