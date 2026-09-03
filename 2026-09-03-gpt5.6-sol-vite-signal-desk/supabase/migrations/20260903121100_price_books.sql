create table public.price_books (
  id text primary key default gen_random_uuid(),
  workspace_id text not null references public.workspaces(id) on delete cascade,
  name text not null check (name <> ''),
  currency text not null default 'USD',
  is_active boolean not null default true,
  valid_from date,
  valid_until date,
  created_by uuid not null references auth.users(id),
  created_by_role text not null default 'owner' check (created_by_role in ('owner', 'admin', 'manager', 'member')),
  created_by_status text not null default 'active' check (created_by_status in ('invited', 'active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, name),
  foreign key (workspace_id, created_by) references public.workspace_members(workspace_id, user_id),
  foreign key (workspace_id, created_by, created_by_role, created_by_status) references public.workspace_members(workspace_id, user_id, role, status) on update cascade
);

create table public.price_book_items (
  id text primary key default gen_random_uuid(),
  workspace_id text not null references public.workspaces(id) on delete cascade,
  price_book_id text not null references public.price_books(id) on delete cascade,
  product_id text not null references public.products(id) on delete cascade,
  unit_price numeric(12,2) not null check (unit_price >= 0),
  minimum_quantity integer not null default 1 check (minimum_quantity > 0),
  created_by uuid not null references auth.users(id),
  created_by_role text not null default 'owner' check (created_by_role in ('owner', 'admin', 'manager', 'member')),
  created_by_status text not null default 'active' check (created_by_status in ('invited', 'active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (price_book_id, product_id),
  foreign key (workspace_id, created_by) references public.workspace_members(workspace_id, user_id),
  foreign key (workspace_id, created_by, created_by_role, created_by_status) references public.workspace_members(workspace_id, user_id, role, status) on update cascade
);
