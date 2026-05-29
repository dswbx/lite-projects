### 2026-05-27T17:40:00Z — TypeError on foreign key without column name [major]
- expected: `references meals on delete cascade` should default to the primary key of `meals` and translate correctly.
- actual: `Migration error: TypeError: Cannot read properties of null (reading 'replace')` is thrown during schema translation.
- workaround: Explicitly specify the column name: `references meals(id) on delete cascade`.
- versions: @supabase/lite@0.3.1-next.1

repro:
```sql
create table meals (
  id uuid primary key
);

create table meal_ingredients (
  id uuid primary key,
  meal_id uuid references meals on delete cascade not null
);
```
### 2026-05-29T12:35:00Z — TypeError on foreign key without column name [resolved]
- correction to: 2026-05-27T17:40:00Z
- retested with: @supabase/lite@0.3.1-next.3
- outcome: The schema parser now correctly infers the primary key when a foreign key references a table without specifying the column (e.g. `references meals on delete cascade`). The `TypeError` is gone.
