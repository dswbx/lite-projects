create table decks (
  id serial primary key,
  name text not null,
  created_at timestamp default current_timestamp
);

create table cards (
  id serial primary key,
  deck_id integer not null references decks (id) on delete cascade,
  question text not null,
  answer text not null,
  correct_count integer not null default 0,
  wrong_count integer not null default 0,
  created_at timestamp default current_timestamp
);

create index cards_deck_id_idx on cards (deck_id);

alter table decks enable row level security;
alter table cards enable row level security;

create policy decks_select on decks for select using (true);
create policy decks_insert on decks for insert with check (true);
create policy decks_update on decks for update using (true) with check (true);
create policy decks_delete on decks for delete using (true);

create policy cards_select on cards for select using (true);
create policy cards_insert on cards for insert with check (true);
create policy cards_update on cards for update using (true) with check (true);
create policy cards_delete on cards for delete using (true);
