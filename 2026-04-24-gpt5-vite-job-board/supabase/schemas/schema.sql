create table profiles (
   id uuid primary key references auth.users(id) on delete cascade,
   role text not null check (role in ('employer', 'seeker')),
   full_name text not null,
   company_name text,
   headline text,
   created_at timestamp default current_timestamp
);

create table job_listings (
   id serial primary key,
   employer_id uuid references auth.users(id) on delete cascade,
   title text not null,
   company_name text not null,
   location text not null,
   remote_type text not null,
   employment_type text not null,
   salary_min integer,
   salary_max integer,
   currency text not null default 'USD',
   summary text not null,
   description text not null,
   responsibilities text not null,
   requirements text not null,
   benefits text not null,
   interview_process text not null,
   contact_email text not null,
   status text not null default 'published' check (status in ('draft', 'published', 'closed')),
   created_at timestamp default current_timestamp
);

create table applications (
   id serial primary key,
   job_id integer not null references job_listings(id) on delete cascade,
   employer_id uuid references auth.users(id) on delete cascade,
   seeker_id uuid not null references auth.users(id) on delete cascade,
   applicant_name text not null,
   applicant_email text not null,
   cover_letter text not null,
   portfolio_url text,
   availability text not null,
   expected_salary integer,
   status text not null default 'submitted' check (status in ('submitted', 'reviewing', 'interview', 'offer', 'declined')),
   created_at timestamp default current_timestamp,
   unique (job_id, seeker_id)
);

alter table profiles enable row level security;
alter table job_listings enable row level security;
alter table applications enable row level security;

create policy profiles_select_own on profiles
   for select
   to authenticated
   using (id = auth.uid());

create policy profiles_insert_own on profiles
   for insert
   to authenticated
   with check (id = auth.uid());

create policy profiles_update_own on profiles
   for update
   to authenticated
   using (id = auth.uid())
   with check (id = auth.uid());

create policy job_listings_select_published on job_listings
   for select
   to anon, authenticated
   using (status = 'published');

create policy job_listings_select_employer on job_listings
   for select
   to authenticated
   using (employer_id = auth.uid());

create policy job_listings_insert_employer on job_listings
   for insert
   to authenticated
   with check (employer_id = auth.uid());

create policy job_listings_update_employer on job_listings
   for update
   to authenticated
   using (employer_id = auth.uid())
   with check (employer_id = auth.uid());

create policy applications_select_seeker on applications
   for select
   to authenticated
   using (seeker_id = auth.uid());

create policy applications_select_employer on applications
   for select
   to authenticated
   using (employer_id = auth.uid());

create policy applications_insert_seeker on applications
   for insert
   to authenticated
   with check (seeker_id = auth.uid());

create policy applications_update_employer on applications
   for update
   to authenticated
   using (employer_id = auth.uid());
