# Signal Desk

Signal Desk is a sales workspace for teams. It manages accounts, contacts, leads, deals, tasks, quotes, campaigns, and files.

Signal Desk keeps the data on your computer during local use.

## Open the app

1. Install [Bun](https://bun.sh) if it is not installed.
2. Open Terminal.
3. Change to this project folder.

   ```sh
   cd 2026-09-03-gpt5.6-sol-vite-signal-desk
   ```

4. Install the required packages:

   ```sh
   bun install
   ```

5. Create local development keys and load the demo database:

   ```sh
   bunx --bun lite generate-keys
   bun run db:reset
   ```

6. Start Signal Desk:

   ```sh
   bun dev
   ```

7. Keep Signal Desk running. Open a second Terminal window, change to the same project folder, and create the private file bucket plus its 18 sample objects:

   ```sh
   bun run storage:seed
   ```

8. Open [http://localhost:5173](http://localhost:5173) in a browser.

Vite can select port 5174 or a later port when port 5173 is busy. Use the address that Terminal shows.

## Sign in

The local database contains three confirmed demo users. Each user has this password: `SignalDesk123!`

| User | Email | Access |
| --- | --- | --- |
| Alex Morgan | `alex@signaldesk.local` | Owner of Atlas North |
| Sam Rivera | `sam@signaldesk.local` | Manager of Atlas North and owner of Polaris Europe |
| Jamie Chen | `jamie@signaldesk.local` | Member of Polaris Europe and owner of Lantern Pacific |

You can also create an account. Signal Desk requires email confirmation for new accounts. The local server prints the confirmation link in Terminal because it does not send real email by default.

## Use Signal Desk

1. Sign in with a demo user.
2. Review the Overview screen for account, contact, deal, and task totals. The demo records use company, buyer, campaign, and next-step names that resemble a working sales desk.
3. Open Accounts, Contacts, or Leads from the left sidebar.
4. Use the search field to filter a list.
5. Select **Create** to add a record.
6. Select anywhere on a row to view or edit it. Open **Connections** in the side panel to link it to a named account, contact, opportunity, price book, or other related record. The three-dot menu remains available for removal and quick actions.
7. Open Pipeline to review deals by stage. Select a deal name or **Open deal** to view and edit its details.
8. Drag a deal to a new stage, or use its stage menu for keyboard and mobile access.
9. Open Files, choose a named CRM record, and upload a private document. Select a file row to preview images, PDFs, CSV files, and text files when the browser supports that format.
10. Open Settings to change your display name, job title, and profile photo. Workspace owners can also change the organization name, timezone, and currency.
11. Open Audit history to review recorded changes.

In the local Supalite runtime, only the workspace owner can change memberships. This is stricter than the intended hosted owner-and-admin rule because the local RLS translator cannot safely evaluate the required admin-role subquery during membership writes.

Press `Command-K` on macOS or `Control-K` on Windows and Linux to open the command palette.

## Your local data

The local database is in `supabase/.temp/data.db`. Uploaded file bytes are under `supabase/.temp/storage`.

The app accepts PDF, PNG, JPEG, CSV, and plain-text files. Each file must be 10 MB or smaller. The `crm-files` bucket is private. In this Supalite release, only the person who uploaded an object can preview or download its bytes; teammates can still see its workspace metadata and CRM link. The RLS compiler cannot yet enforce a workspace-membership lookup inside a Storage policy, so the app keeps the stricter owner-only rule and records the gap in `.logs/friction.md`.

Profile photos accept PNG and JPEG files up to 2 MB. The photo is uploaded to the same private bucket. Because local Supalite Storage is experimental, Signal Desk also keeps the selected image in that browser as a display cache; the stored object path remains the saved profile value. A full Supabase connection uses a temporary signed link instead.

The first-run steps create 18 sample file objects that match the seeded file records. If you reset the database later, keep `bun dev` running and run the seeder again in a second Terminal window:

```sh
bun run storage:seed
```

Do not use the local demo setup for sensitive or production data. The values in this project are development credentials.

## Google sign-in

Google sign-in is off by default. The button stays disabled until you configure both Google and Signal Desk.

1. Create OAuth credentials in Google Cloud.
2. Add this authorized callback address:

   ```text
   http://localhost:5173/auth/v1/callback
   ```

3. Set `enabled = true` in `[auth.external.google]` inside `supabase/config.toml`.
4. Start the app with your credentials and the user-interface flag:

   ```sh
   GOOGLE_CLIENT_ID="your-client-id" \
   GOOGLE_CLIENT_SECRET="your-client-secret" \
   VITE_GOOGLE_AUTH_ENABLED=true \
   bun dev
   ```

Keep the Google secret out of source control.

## Verify the project

Run the fast checks:

```sh
bun run lint
bun run test
bun run build
```

Install the Chromium test browser once:

```sh
bunx playwright install chromium
```

Then run the browser suite:

```sh
bun run test:e2e
```

Run the upgrade readiness check:

```sh
bun run upgrade:check
```

The readiness check does not create a hosted project. Storage objects and bucket settings need a separate transfer during a future full-Supabase migration.

With `@supabase/lite@0.10.0`, the checker finds the complete schema and prints `Ready to upgrade`, then its in-memory rehearsal stops because it replays `auth.users` foreign keys before it creates the Auth schema. This package limitation is recorded in `.logs/friction.md`; the command currently exits with an error even though readiness passes.

## Troubleshooting

- If sign-in fails, run `bun run db:reset`. This command replaces local changes with the seeded demo data.
- If the page does not open, use the local address that Terminal shows.
- If file upload fails, stop the server and run `bun dev` again. The start command enables experimental local Storage. Run `bun run storage:seed` again if you reset the database and want the sample file previews back.

## Production build

Create an optimized build:

```sh
bun run build
```

Preview the build locally:

```sh
bun run preview
```

Signal Desk uses React, TypeScript, Vite, Tailwind CSS, shadcn/ui, Supabase JavaScript, and Supalite.
