### 2026-05-20T13:20Z — `@supabase/supabase-js` unchanged against Vite-embedded lite

- **what worked:** `createClient(window.location.origin, "dev-anon-key")` with Vite plugin serving `/auth/v1` and `/rest/v1` on same origin — no proxy config.
- **why it mattered:** Zero new client API; existing Supabase patterns (auth, `from().select()`, filters, embeds) transferred directly.
- **parity win:** drop-in supabase-js compatibility is the headline feature.
- **versions:** `@supabase/supabase-js@2.106.1`, `@supabase/lite@0.2.1-next.2`

```ts
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL ?? window.location.origin,
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? "dev-anon-key",
);
```

- **counterfactual:** separate CLI + proxy setup (README's non-Vite path) would have added config surface for an LLM to get wrong.

---

### 2026-05-20T13:20Z — Postgres DDL + RLS in one `schema.sql` file

- **what worked:** Wrote standard Postgres `CREATE TABLE`, `ENABLE ROW LEVEL SECURITY`, and `CREATE POLICY ... auth.uid()` in `supabase/schemas/schema.sql`; no sqlite-specific DDL hand-written.
- **why it mattered:** Could reuse Supabase RLS mental model; no second schema dialect to learn for this run.
- **versions:** `@supabase/lite@0.2.1-next.2`, driver `sqlite-postgres`
- **doc:** `node_modules/@supabase/lite/README.md` — "Writing schemas", STATUS.md RLS table

```sql
create policy "categories_select_own"
  on public.categories for select to authenticated
  using (user_id = auth.uid());
```

- **counterfactual:** sqlite-native migrations would have duplicated policy logic in a different syntax.

---

### 2026-05-20T13:24Z — RLS isolation verified without dashboard

- **what worked:** curl signup → insert category with `user_id` → second user sees `[]` → anon sees `[]`.
- **why it mattered:** Per-user data requirement from prompt confirmed without UI manual testing only.
- **supabase/lite-specific win:** application-layer RLS on SQLite behaved like hosted Supabase for this CRUD app.

```bash
# user 1 insert → [{"name":"Groceries"}]
# user 2 select → []
# anon select → []
```

---

### 2026-05-20T13:24Z — PostgREST resource embedding first try

- **what worked:** `.select("*, categories(name)")` on expenses with FK `category_id → categories.id`.
- **why it mattered:** Dashboard expense list shows category names without client-side join logic.
- **versions:** `@supabase/lite@0.2.1-next.2`

```ts
supabase
  .from("expenses")
  .select("*, categories(name)")
  .gte("expense_date", start)
  .lte("expense_date", end);
```

- **counterfactual:** manual join in React would be more generated code and more bug surface.

---

### 2026-05-20T13:19Z — README in package + `npm view` enough for "use public" run

- **what worked:** Full quick start, Vite plugin snippet, config.toml shape, and RLS notes available without `gh`.
- **why it mattered:** Prompt explicitly forbade GitHub access; no blocked discovery phase.
- **sources:** `npm view @supabase/lite@0.2.1-next.2`, `node_modules/@supabase/lite/README.md`, `STATUS.md`
