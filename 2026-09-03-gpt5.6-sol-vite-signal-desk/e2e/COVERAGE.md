# End-to-end coverage

This matrix describes the browser contract for Signal Desk. The suite runs with one worker and uses the real Supabase JavaScript client.

## Test identity rules

- `auth-accessibility.spec.ts` creates a unique email address for each sign-up run.
- Mutation tests create unique record names and IDs.
- Confirmed flows use the seeded users because local confirmation emails appear only in the server console.
- Alex owns Atlas North. Sam manages Atlas North. Jamie has no Atlas North access.
- Sam owns Polaris Europe. Jamie is a Polaris Europe member.

These roles let the suite check owner, manager, member, and outsider behavior. The same tests can target an external Supabase API with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

## Browser and authentication actions

| Action | Automated coverage |
| --- | --- |
| `auth.signUp` with email confirmation | `auth-accessibility.spec.ts` — unique user reaches the confirmation screen |
| `auth.resend` | `auth-accessibility.spec.ts` — an immediate real request returns the expected 429 safety cooldown and the UI explains when the user can try again |
| `auth.signInWithPassword` | All authenticated browser tests and `rls.spec.ts` |
| `auth.getSession` and session persistence | `auth-accessibility.spec.ts` — reload keeps the dashboard open |
| `auth.onAuthStateChange` | Sign-in and sign-out UI transitions in `auth-accessibility.spec.ts` |
| `auth.signOut` | `auth-accessibility.spec.ts` — returns to the sign-in screen |
| Google disabled state | `auth-accessibility.spec.ts` — button is disabled and setup text is visible |
| `auth.signInWithOAuth({ provider: "google" })` | Manual test only. Live Google credentials are not part of automated acceptance. See below. |
| `auth.exchangeCodeForSession` and `/auth/callback` | Manual Google test below. The app uses PKCE and detects the callback session. |
| Email confirmation callback | Manual check. Copy the confirmation link from the development server output and open it. |

## CRM and calculated behavior

| Operation or result | Automated coverage |
| --- | --- |
| Generic repository `list` with exact count, sort, range, and pagination | Contact page movement and account list in `crm.spec.ts`; repository unit tests cover page mapping |
| Generic repository `create` and appended audit event | Account create in `crm.spec.ts` |
| Generic repository `update` and before/after audit data | `crm.spec.ts` opens the account by selecting its full row, edits it, and waits for the new value |
| Generic repository `remove` and destructive confirmation | Account removal in `crm.spec.ts` |
| Generic repository `archive` | The shared repository unit test exercises the archive query contract. The current screen presents remove instead of archive. |
| Generic repository `get` | The shared repository unit test exercises the scoped single-record query contract. It is not called by a current product screen. |
| Search and `ilike` mapping | Account search in `crm.spec.ts`; filter mapping unit tests cover all operators |
| Account create, search, update, and remove | `crm.spec.ts` runs the full browser flow against the real Data API. |
| Lead required-field validation | `crm.spec.ts` — the required control stays focused, its native validity is false, and the sheet stays open. |
| Opportunity create | `pipeline-files.spec.ts` — creates a unique deal in the first stage |
| Opportunity detail/update and stage update | `pipeline-files.spec.ts` opens a deal from its card, edits its value and named account connection, verifies both after reopening, then moves it to Qualified and Closed won with the stage menu; the won card remains visible |
| Personal profile and owner organization settings | `settings.spec.ts` updates the display name, uploads a private PNG, verifies its avatar, changes the organization name, verifies the appended audit event, and runs axe afterward |
| Stage-change activity and audit append | The stage move waits for the success toast, which occurs after the audited opportunity update and activity insert succeed |
| Accessible drag-and-drop alternative | `pipeline-files.spec.ts` uses Enter and the stage menu; pointer drag stays a manual check |
| Dashboard account, contact, opportunity, and task queries | Dashboard load in authenticated tests |
| Weighted pipeline, open value, stage age, activity recency, and risk | Dashboard and signal rail rendering are covered by browser smoke and axe checks. The individual numeric formulas are not directly asserted. |
| Quote subtotal, discount, tax, and total | Repository unit tests cover the quote calculation contract |
| Lead conversion retry, reuse, and compensating cleanup | A repository unit test covers a retried conversion that compensates after a later write fails. Successful reuse is not automated. Lead row actions expose the conversion control. |
| Accounts, contacts, leads, activities, tasks, products, price books, quotes, campaigns, custom fields, saved views, members | `crm.spec.ts` proves the shared screen and repository behavior with accounts and contact list queries, and proves Members exposes existing memberships without an invalid create picker. The other screens load seeded records, but their full mutation paths are not individually automated. |
| Notes, email threads, and email messages | Not automated. These records are modeled without message delivery or synchronization. |
| Named direct relationships | `crm.spec.ts` creates a contact through the Connections tab, selects a named account, and verifies the account name in the contact table. Activities, tasks, opportunities, quotes, members, and files use the same named relation controls. |
| Relationship tables for tags, participants, assignees, quote lines, campaign members, and custom values | The browser Storage flow exercises `file_links`. The current product screens do not expose every many-to-many relationship editor, so those paths are not automated. |
| Audit append-only behavior | `rls.spec.ts` proves owner and manager read, member denial, and rejected update and delete attempts. `crm.spec.ts` opens a full audit row as read-only details with a named actor connection and no save action. |

## Storage operations

| Operation | Automated coverage |
| --- | --- |
| Private `crm-files` bucket use | `zz-storage.spec.ts` uploads through the real private bucket |
| File type and 10 MB validation | File repository unit tests |
| `storage.upload` | Browser file upload in `zz-storage.spec.ts` |
| `file_assets.insert` | Upload does not show success until metadata exists |
| `file_links.insert` | Upload does not show success until the account link exists |
| `file_assets.select` | Uploaded object appears in the file table |
| `storage.download` | Playwright waits for the full browser download, verifies its original name and exact bytes, then removes it |
| Text preview | `zz-storage.spec.ts` selects the full file row and verifies the downloaded private text inside a titled preview dialog |
| Explicit link and unlink repository actions | The browser upload creates an account link, and browser removal deletes it. There is no separate link-editor test. |
| `storage.remove`, `file_links.delete`, and `file_assets.delete` | Browser removal waits for success and removes the row |
| Upload compensation after a metadata or link error | Not automated. |

Storage cannot run against the local full-Supabase upgrade target described by the installed package. That target disables Storage, and `lite upgrade` does not transfer objects.

## RLS policy matrix

The final tenant migration contains the named policies below. The table groups policies that use the same contract and names every policy.

| Policy names | Expected contract | Automated coverage |
| --- | --- | --- |
| `workspaces_select`, `workspaces_insert`, `workspaces_update`, `workspaces_delete` | A member can read a workspace. Only its owner can update or delete it. The creator becomes owner. | Sign-in workspace discovery covers select. Workspace creation is a manual browser check. |
| `profiles_select`, `profiles_insert`, `profiles_update`, `profiles_delete` | Users read themselves and active shared-workspace profiles. A user can change only their profile. | `rls.spec.ts` proves Atlas and Polaris users see only themselves plus active shared-workspace members, excluding unrelated profiles. `settings.spec.ts` updates the signed-in owner's profile and uploads a real private PNG. |
| `workspace_members_select`, `workspace_members_insert`, `workspace_members_update`, `workspace_members_delete` | Users read their membership. Only the workspace owner changes membership because Supalite cannot enforce an admin-role membership subquery during writes. | Seeded role discovery covers select. `rls.spec.ts` proves a member cannot add or promote membership. Owner editing remains a manual UI check. |
| `teams_select`, `teams_insert`, `teams_update`, `teams_delete`; `team_memberships_select`, `team_memberships_insert`, `team_memberships_update`, `team_memberships_delete` | Members read team data. Owners and admins manage it. Administrative inserts must attest an active owner/admin membership through a composite foreign key. | `rls.spec.ts` proves the shared administrative contract with products: owner success, forged manager-role rejection, suspended-owner rejection, and a different active admin updating the owner's record. The current screen has no team editor. |
| `accounts_select`, `accounts_insert`, `accounts_update`, `accounts_delete` | Active members read workspace accounts. Owners and managers change assigned workspace accounts. Outsiders and suspended members cannot mutate them. | All actions, manager access, outsider read/update denial, rejected cross-workspace INSERT, and suspended-member INSERT/update/delete rejection run in `crm.spec.ts` and `rls.spec.ts`. Creator status is backed by a membership FK and cascades on suspension. |
| `contacts_select`, `contacts_insert`, `contacts_update`, `contacts_delete`; `leads_select`, `leads_insert`, `leads_update`, `leads_delete`; `opportunities_select`, `opportunities_insert`, `opportunities_update`, `opportunities_delete`; `activities_select`, `activities_insert`, `activities_update`, `activities_delete`; `tasks_select`, `tasks_insert`, `tasks_update`, `tasks_delete`; `notes_select`, `notes_insert`, `notes_update`, `notes_delete` | Members read sales data. Managers change all sales data. Members change owned or assigned data. | Opportunity create and update run in browser. Permission unit tests cover the intended shared role rules. Account RLS tests exercise one representative Data API policy, but every table is not tested directly. |
| `file_assets_select`, `file_assets_insert`, `file_assets_update`, `file_assets_delete` | Workspace members read metadata. Owners and managers change records. Object access stays private. | Browser upload, list, download, link creation, and delete run as an owner. Other roles are not automated for file metadata. |
| `email_threads_select`, `email_threads_insert`, `email_threads_update`, `email_threads_delete` | Workspace members read email records. Owners and managers change records. Message creation binds to its owner. | Not automated. Signal Desk models these records but does not send email messages. |
| `campaigns_select`, `campaigns_insert`, `campaigns_update`, `campaigns_delete` | Members read campaign records. Owners and managers change them. | Not directly automated. |
| `saved_views_select`, `saved_views_insert`, `saved_views_update`, `saved_views_delete` | Owners read and change private views. Members read shared views. | Not directly automated. |
| `tags_select`, `tags_insert`, `tags_update`, `tags_delete` | Workspace members read tags. Owners and admins manage tags. Administrative inserts use the same active role/status membership attestation tested with products. | Not directly automated. The current screen has no tag editor. |
| `pipelines_select`, `pipelines_insert`, `pipelines_update`, `pipelines_delete` | Members read pipeline data. Owners and admins manage its structure. Administrative inserts use the same active role/status membership attestation tested with products. | Pipeline list and stage list run in `pipeline-files.spec.ts`. Structure changes are a manual owner check. |
| `products_select`, `products_insert`, `products_update`, `products_delete`; `price_books_select`, `price_books_insert`, `price_books_update`, `price_books_delete` | Members read catalog data. Owners and admins manage it. Administrative inserts must match the creator's active membership role and status. | `rls.spec.ts` proves owner product insertion, manager rejection even with forged owner values, suspended-owner rejection, and membership restoration. |
| `custom_field_definitions_select`, `custom_field_definitions_insert`, `custom_field_definitions_update`, `custom_field_definitions_delete` | Members read custom fields. Owners and admins manage definitions. Administrative inserts use the same active role/status membership attestation tested with products. | The settings screen list loads during its axe check. Definition mutations are not directly automated. |
| `account_tags_select`, `account_tags_insert`, `account_tags_update`, `account_tags_delete`; `contact_tags_select`, `contact_tags_insert`, `contact_tags_update`, `contact_tags_delete`; `pipeline_stages_select`, `pipeline_stages_insert`, `pipeline_stages_update`, `pipeline_stages_delete`; `lead_conversions_select`, `lead_conversions_insert`, `lead_conversions_update`, `lead_conversions_delete`; `opportunity_contacts_select`, `opportunity_contacts_insert`, `opportunity_contacts_update`, `opportunity_contacts_delete`; `opportunity_tags_select`, `opportunity_tags_insert`, `opportunity_tags_update`, `opportunity_tags_delete`; `price_book_items_select`, `price_book_items_insert`, `price_book_items_update`, `price_book_items_delete`; `quotes_select`, `quotes_insert`, `quotes_update`, `quotes_delete`; `quote_lines_select`, `quote_lines_insert`, `quote_lines_update`, `quote_lines_delete`; `activity_participants_select`, `activity_participants_insert`, `activity_participants_update`, `activity_participants_delete`; `task_assignees_select`, `task_assignees_insert`, `task_assignees_update`, `task_assignees_delete`; `file_links_select`, `file_links_insert`, `file_links_update`, `file_links_delete`; `email_messages_select`, `email_messages_insert`, `email_messages_update`, `email_messages_delete`; `campaign_members_select`, `campaign_members_insert`, `campaign_members_update`, `campaign_members_delete`; `custom_field_values_select`, `custom_field_values_insert`, `custom_field_values_update`, `custom_field_values_delete` | A workspace member can read links. New links bind `created_by` to the current user. Role checks control updates and deletes. | The file browser flow exercises `file_links`; the lead-conversion unit test exercises recovery calls with a fake client. The other relation policies are not directly automated. |
| `notifications_select`, `notifications_insert`, `notifications_update`, `notifications_delete` | A user reads and changes only their notifications. | Not automated. Notification detail is not exposed in the current screen. |
| `audit_events_select`, `audit_events_insert` | Owners, admins, and managers read audit events. Events bind actor and creator to the current user. There are no update or delete policies. | `rls.spec.ts` proves owner insert/read, manager read, same-workspace member denial, and append-only update/delete rejection. |
| `crm_files_select`, `crm_files_insert`, `crm_files_update`, `crm_files_delete` | A user accesses only owned objects in `crm-files`. The path binds the object to that user. Workspace-shared object reads are blocked by the documented Supalite cross-schema Storage RLS limitation. | Browser upload, two downloads (preview and saved file), and delete run through the real private bucket. |

## Accessibility and keyboard matrix

| Screen or control | Automated coverage |
| --- | --- |
| Authentication screen | Axe scan in `auth-accessibility.spec.ts` |
| Dashboard and deal-signal rail | Axe scan in `crm.spec.ts` |
| Data table | Axe scan on Accounts |
| Detail sheet and form | Axe scan with Create account open |
| Pipeline | Axe scan after keyboard stage movement |
| Settings | `settings.spec.ts` scans the profile and organization screen after both forms are saved; `crm.spec.ts` also scans Custom fields |
| Command palette | Keyboard shortcut, focus, search, and selection in `auth-accessibility.spec.ts` |
| Dialog, sheet, menu, validation focus | Workspace dialog is a manual check. Record sheet and stage menu are automated. |
| Destructive confirmation | Account and file alert dialogs are automated. |
| Reduced motion | The global CSS rule is a code-level check. Use operating-system reduced-motion mode for a manual visual check. |
| Mobile drawer and responsive table | Manual check at 390 by 844 CSS pixels. |

## Manual Google OAuth test

1. Configure Google as described in `README.md`.
2. Start Signal Desk with `VITE_GOOGLE_AUTH_ENABLED=true`.
3. Open a private browser window.
4. Select **Continue with Google**.
5. Complete Google sign-in with a test account.
6. Make sure that Google returns to `/auth/callback`.
7. Make sure that Signal Desk restores the session and opens the dashboard.
8. Sign out.
9. Sign in with Google again.
10. Make sure that Signal Desk opens the same user and does not create a duplicate profile.

## Upgrade lane

Run the baseline first:

```sh
bun run test:e2e
```

For an external Supabase API, use the same suite:

```sh
VITE_SUPABASE_URL="http://127.0.0.1:54321" \
VITE_SUPABASE_ANON_KEY="your-anon-key" \
bun run test:e2e
```

The requested acceptance run stops after `bun run upgrade:check`. It does not create a Docker or hosted Supabase project.
