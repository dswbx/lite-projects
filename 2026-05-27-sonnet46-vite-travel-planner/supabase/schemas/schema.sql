-- travel planner schema

create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  destination text not null,
  start_date date not null,
  end_date date not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists trip_days (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  day_date date not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  trip_day_id uuid not null references trip_days(id) on delete cascade,
  title text not null,
  description text,
  time_of_day text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists packing_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  name text not null,
  packed boolean not null default false,
  category text,
  created_at timestamptz not null default now()
);

-- rls: only trip owner can access their rows
alter table trips enable row level security;
alter table trip_days enable row level security;
alter table activities enable row level security;
alter table packing_items enable row level security;

create policy "users can manage own trips"
  on trips for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users can manage trip_days for own trips"
  on trip_days for all
  to authenticated
  using (
    exists (
      select 1 from trips where trips.id = trip_days.trip_id and trips.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from trips where trips.id = trip_days.trip_id and trips.user_id = auth.uid()
    )
  );

create policy "users can manage activities for own trips"
  on activities for all
  to authenticated
  using (
    exists (
      select 1 from trip_days
      join trips on trips.id = trip_days.trip_id
      where trip_days.id = activities.trip_day_id
        and trips.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from trip_days
      join trips on trips.id = trip_days.trip_id
      where trip_days.id = activities.trip_day_id
        and trips.user_id = auth.uid()
    )
  );

create policy "users can manage packing_items for own trips"
  on packing_items for all
  to authenticated
  using (
    exists (
      select 1 from trips where trips.id = packing_items.trip_id and trips.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from trips where trips.id = packing_items.trip_id and trips.user_id = auth.uid()
    )
  );
