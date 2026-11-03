create schema if not exists adigunelectrocad;

create table if not exists adigunelectrocad.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id),
  name text not null check (char_length(name) between 1 and 120),
  description text not null default '' check (char_length(description) <= 1000),
  document jsonb not null check (jsonb_typeof(document) = 'object'),
  revision integer not null default 1 check (revision >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists adigunelectrocad.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id),
  theme text not null default 'dark' check (theme in ('dark', 'light')),
  locale text not null default 'en' check (locale in ('en', 'de', 'yo', 'pcm')),
  favorites jsonb not null default '[]'::jsonb check (jsonb_typeof(favorites) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

alter table adigunelectrocad.projects enable row level security;
alter table adigunelectrocad.user_preferences enable row level security;

grant usage on schema adigunelectrocad to authenticated;
grant select, insert, update, delete on adigunelectrocad.projects to authenticated;
grant select, insert, update, delete on adigunelectrocad.user_preferences to authenticated;

drop policy if exists "Users can only access their own data" on adigunelectrocad.projects;
create policy "Users can only access their own data"
on adigunelectrocad.projects for all to authenticated
using ( (select auth.uid()) = user_id )
with check ( (select auth.uid()) = user_id );

drop policy if exists "Only permanent users can insert" on adigunelectrocad.projects;
create policy "Only permanent users can insert"
on adigunelectrocad.projects as restrictive for insert to authenticated
with check ( (select (auth.jwt()->>'is_anonymous')::boolean) is false );

drop policy if exists "Users can only access their own data" on adigunelectrocad.user_preferences;
create policy "Users can only access their own data"
on adigunelectrocad.user_preferences for all to authenticated
using ( (select auth.uid()) = user_id )
with check ( (select auth.uid()) = user_id );

drop policy if exists "Only permanent users can insert" on adigunelectrocad.user_preferences;
create policy "Only permanent users can insert"
on adigunelectrocad.user_preferences as restrictive for insert to authenticated
with check ( (select (auth.jwt()->>'is_anonymous')::boolean) is false );
