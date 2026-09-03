PLEASE IMPLEMENT THIS PLAN:
# Signal Desk CRM — Supalite Boundary Run

## Summary

Build `2026-09-03-gpt5.6-sol-vite-signal-desk`, a dense B2B sales CRM for multi-workspace teams.

Use React, TypeScript, Vite, Bun, Tailwind v4, shadcn/ui, `@supabase/lite@latest`, and `@supabase/supabase-js`. Lock the resolved package versions.

Every core module uses real Supalite operations. Do not add mock data paths or simulated auth and storage APIs.

## Product and UX

- Provide dashboard, accounts, contacts, leads, opportunity pipeline, activities, tasks, products, price books, quotes, campaigns, files, custom fields, saved views, members, and audit history.
- Support create, read, update, archive or delete, filtering, sorting, and pagination across all core modules.
- Implement lead conversion, opportunity stage changes, quote totals, assignments, relationship linking, and append-only audit events.
- Use a desktop-first split-pane layout with compact tables, a pipeline board, keyboard navigation, a command palette, and responsive mobile fallbacks.
- Name the product “Signal Desk.” Use Archivo and IBM Plex Mono with a navy, cobalt, amber, paper-blue, and coral semantic theme.
- Make the signature element a persistent deal-signal rail that displays stage age, activity recency, value, and risk.

### shadcn/ui

- Initialize the official `@shadcn` registry with the Radix-based Nova preset and a project-level `components.json`.
- Use the Bun CLI form: `bunx --bun shadcn@latest`.
- Inspect project information and fetch current component documentation before adding components.
- Install only required components. Review every generated source file before composing product screens.
- Use shadcn `Sidebar`, `Breadcrumb`, `Command`, `Dialog`, `Sheet`, `Drawer`, `Resizable`, `ScrollArea`, `Table`, `Pagination`, `Card`, `Chart`, `Tabs`, `Badge`, `Avatar`, `DropdownMenu`, `Popover`, `Calendar`, `Tooltip`, `HoverCard`, `Alert`, `Empty`, `Skeleton`, `Spinner`, `Progress`, `Sonner`, and form controls.
- Use `FieldGroup`, `Field`, and accessible validation attributes for forms.
- Use semantic theme tokens in the global Tailwind CSS file. Use `className` only for layout or exceptional product-specific presentation.
- Compose the opportunity board from shadcn cards and scroll areas with accessible drag-and-drop. Also provide a stage menu for keyboard and mobile users.
- Require titles for every dialog, sheet, and drawer. Preserve focus, support reduced motion, and provide loading, empty, error, and destructive-confirmation states.

## Architecture and Data

### Migration chain

Create exactly 26 forward-only, timestamped SQL migrations under `supabase/migrations/`. Apply them through Supalite’s native ordered migration mechanism.

1. Workspaces
2. Profiles
3. Workspace memberships
4. Teams and team memberships
5. Accounts
6. Contacts
7. Tags and account/contact links
8. Pipelines and stages
9. Leads and conversion records
10. Opportunities, contact links, and tag links
11. Products
12. Price books and price-book items
13. Quotes and quote lines
14. Activities and participants
15. Tasks and assignees
16. Notes
17. File metadata and entity links
18. Email threads and messages
19. Campaigns and campaign members
20. Custom-field definitions and values
21. Saved views
22. Notifications
23. Audit events
24. Dashboard and pipeline reporting views
25. Tenant RLS policies
26. Performance indexes and final constraints

The schema will contain approximately 38 relational tables. All schema changes must live in these migrations. Seed and storage scripts can insert data but cannot alter schema.

### Security and domain contracts

- Put `workspace_id`, ownership fields, timestamps, foreign keys, checks, unique constraints, and indexes on applicable records.
- Use PostgreSQL-compatible SQL accepted by Supalite’s SQLite compatibility layer.
- Members can read records in their workspaces.
- Owners and admins manage membership, teams, pipelines, catalog data, and custom fields.
- Managers manage all sales records.
- Members can create records and modify records they own or tasks assigned to them.
- Audit events are append-only and visible to managers, admins, and owners.
- Exercise membership-subquery RLS and cross-workspace isolation. Log any Supalite enforcement gap instead of concealing it in application code.
- Generate TypeScript database types when the installed package supports generation.
- Define shared contracts for workspace roles, entity types, lifecycle statuses, filters, pagination, attachments, and audit events.
- Keep repositories grouped by domain. Use typed result objects and consistent user-facing error mapping.
- Avoid unsupported RPC and embedded dotted-path filters.
- Make multi-step lead conversion retry-safe with a unique conversion record and compensating cleanup.

### Auth, files, and seed

- Use the Vite plugin with the same-origin Supalite API.
- Support optional `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` overrides. Disable the plugin when an external URL is present.
- Require email confirmation for new users. Implement sign-up, pending confirmation, resend, callback, sign-in, session restoration, and sign-out.
- Implement real `signInWithOAuth({ provider: "google" })` behavior.
- Gate Google login with a non-secret environment flag. Show setup instructions when credentials are absent.
- Use a private `crm-files` Storage bucket through `supabase.storage`.
- Accept PDF, PNG, JPEG, CSV, and text files up to 10 MB. Store files under workspace and entity paths.
- Model email and campaign records without sending messages or synchronizing external services.
- Seed 2,000–3,000 deterministic, interconnected rows across three workspaces and all lifecycle states.
- Provide pre-confirmed demo users with documented local credentials.
- Use `supabase/seed.sql` for relational data and a public-API storage script for sample objects.
- Document that a future full-Supabase migration must transfer Storage objects and bucket configuration separately.

## Implementation and Verification

- Create the five required `.logs` files before installation. Preserve the original prompt verbatim.
- Record every assumption, command, package version, external fetch, friction, win, and proposal during the run.
- Read the installed package’s `LIMITATIONS.md`, `README.md`, relevant `STATUS.md` sections, and `UPGRADE.md` before implementing its APIs.
- Treat missing support for required auth or storage behavior as a blocker. Do not substitute simulations.
- Add Vitest coverage for permissions, calculations, validation, query mapping, seed determinism, and lead-conversion recovery.
- Add a serialized Playwright suite with unique users.
- Cover every data-layer operation, auth action, storage action, calculated result, and RLS policy.
- Maintain `e2e/COVERAGE.md` as the operation-to-test matrix.
- Prove cross-user and cross-workspace isolation.
- Test file upload, download, linking, unlinking, and removal.
- Test the Google-disabled state automatically. Document a manual OAuth test for environments with credentials.
- Exercise keyboard access and focus management for dialogs, sheets, menus, forms, the command palette, and pipeline movement.
- Run automated accessibility checks on authentication, dashboard, data-table, pipeline, detail, and settings screens.
- Pass lint, unit tests, production build, fresh-database migration, deterministic seed, and Supalite Playwright tests.
- Run `lite upgrade --dry-run`. Require a successful readiness result, allowing only documented Storage warnings.
- Do not create a Docker or hosted Supabase project.

## Documentation and Assumptions

- Write the README in plain language for a non-technical user.
- Include Bun installation, exact commands, local URL, demo credentials, workflow instructions, data location, OAuth setup, storage limits, troubleshooting, and production build instructions.
- “At least 20” means at least 20 migrations; this plan uses exactly 26.
- All migrations remain forward-only, as requested.
- The package target is the latest public npm release when implementation begins.
- Google OAuth is real but configuration-gated. Live credentials are not required for automated acceptance.
- Email verification uses the real Supalite Auth flow.
- Upgrade validation stops after the official dry run.
- No email delivery, Google Workspace synchronization, hosted deployment, commit, or issue publication is included.
