## README / package docs

### 2026-09-03T11:25Z — clarify filesystem Storage support in the Vite plugin
- observed: the Storage overview explicitly says the CLI auto-wires `FilesystemStorageAdapter`, but the Vite guide only says to add the `/storage/v1` prefix
- propose: add a Vite-specific Storage recipe that states whether the plugin auto-wires the adapter and includes the complete working configuration
- why it helps LLMs: Vite is the recommended frontend path, and file uploads otherwise require inspecting bundled implementation or trial-and-error
- source for this proposal: friction.md entry at 2026-09-03T11:25Z

### 2026-09-03T12:32Z — list view-security translation limits
- observed: `security_invoker`, `auth.uid()` inside a view, and `REVOKE` each failed in the migration translator while hardening reporting views
- propose: add a reporting-view section to the packaged limitations document that lists supported view security patterns and recommends a non-exposed schema when enforcement cannot be expressed
- why it helps LLMs: a cold-start agent can avoid publishing a security-definer reporting view that silently bypasses tenant base-table RLS
- source for this proposal: friction.md entry at 2026-09-03T12:32Z

## Skill seeds (future `supalite` skill)

### 2026-09-03T11:25Z — route multi-tenant schemas through the installed RLS guide
- observed: the natural membership-subquery insert policy is incompatible with the SQLite `WITH CHECK` evaluator
- propose: tell agents building shared workspaces to read the installed `docs/database/rls.mdx` before defining tenant write policies
- why it helps LLMs: the package-versioned guide prevents an insecure policy assumption without freezing a version-specific workaround into the skill

### 2026-09-03T12:38Z — always inspect the installed upgrade guide before promising readiness
- observed: readiness succeeded for the complete application, but the subsequent packaged rehearsal failed while replaying Auth-linked schema before the Auth base schema existed
- propose: the future skill should direct agents to the installed `UPGRADE.md` and run the exact pinned CLI dry run early, while treating readiness output and process exit status as separate results
- why it helps LLMs: it prevents “Ready to upgrade” in intermediate output from being mistaken for a successful command
