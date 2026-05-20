create table contacts (
   id serial primary key,
   user_id uuid references auth.users(id) on delete cascade not null,
   name text not null,
   email text,
   phone text,
   company text,
   notes text,
   created_at timestamptz default now() not null,
   updated_at timestamptz default now() not null
);

create index contacts_user_id_idx on contacts (user_id);
create index contacts_name_idx on contacts (name);

alter table contacts enable row level security;

create policy contacts_select_own on contacts
   for select
   to authenticated
   using (user_id = auth.uid());

create policy contacts_insert_own on contacts
   for insert
   to authenticated
   with check (user_id = auth.uid());

create policy contacts_update_own on contacts
   for update
   to authenticated
   using (user_id = auth.uid())
   with check (user_id = auth.uid());

create policy contacts_delete_own on contacts
   for delete
   to authenticated
   using (user_id = auth.uid());
