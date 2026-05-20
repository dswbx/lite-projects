# Contact book

A simple personal address book in your browser. You sign in with email and password, then add people with a name, email, phone number, and notes. You can search by name, edit entries, or delete them. **Only you see your contacts** — each account has its own private list stored on your computer.

## How to open it

You need [Bun](https://bun.sh) installed (a small tool that runs the app). If you do not have it yet, install Bun from https://bun.sh, then:

```bash
cd 2026-05-19-composer25-vite-contact-book
bun install
bun dev
```

Open the link shown in the terminal (usually **http://localhost:5173**).

## How to use it

1. **Sign up** — On the first visit, choose “Sign up”, enter your email and a password (at least 6 characters), then create your account.
2. **Sign in** — Next time, use “Sign in” with the same email and password.
3. **Add a contact** — Click **+ Add contact**, fill in name (required), email, phone, and notes, then save.
4. **Search** — Type in the search box to filter contacts **by name**.
5. **Edit** — Click **Edit** on a card, change fields, then **Save changes**.
6. **Delete** — Click **Delete** and confirm. The contact is removed permanently.
7. **Sign out** — Use **Sign out** when you are done on a shared computer.

Your contacts are saved in a local database on this machine (via [Supabase Lite](https://github.com/supabase/lite)), not on a public website. They stay private to your signed-in account.

## Troubleshooting

- **Port already in use** — Another app may be using port 5173. Stop the other app or change the port in `vite.config.ts`.
- **Cannot sign in** — Check email and password. If you just signed up, try signing in right away (email confirmation is off for local use).
- **Empty list after sign-in** — You may be on a different account than before. Contacts belong to the account that created them.

## Optional: production build

```bash
bun run build
bun run preview
```

Built with Vite, React, TypeScript, Tailwind CSS, and Supabase Lite (local build tarball from the lite CLI memory investigation branch; see `package.json`).
