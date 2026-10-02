-- user_settings: one row per person (just region for now).
-- user_services: which streaming services each person pays for.

-- ---------------------------------------------------------------------------
-- user_settings
-- ---------------------------------------------------------------------------

create table public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  region  text not null default 'US'
            check (region ~ '^[A-Z]{2}$')     -- 2-letter country code, as TMDB uses
);

comment on table public.user_settings is 'Private per-user settings. Created automatically for every account.';

-- Every new account gets a settings row automatically.
create function private.create_user_settings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_settings (user_id) values (new.id);
  return new;
end;
$$;

revoke all on function private.create_user_settings() from public, anon, authenticated;

create trigger on_auth_user_created_create_settings
  after insert on auth.users
  for each row execute function private.create_user_settings();

-- Backfill: accounts that existed before this migration.
insert into public.user_settings (user_id)
select id from auth.users
on conflict (user_id) do nothing;

revoke all on public.user_settings from anon, authenticated;
grant select on public.user_settings to authenticated;
grant update (region) on public.user_settings to authenticated;   -- only region can change

alter table public.user_settings enable row level security;

create policy "Users can read their own settings"
  on public.user_settings for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can change their own settings"
  on public.user_settings for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- user_services
-- ---------------------------------------------------------------------------

create table public.user_services (
  user_id     uuid not null default auth.uid()
                references auth.users (id) on delete cascade,
  provider_id integer not null check (provider_id > 0),   -- TMDB provider id, e.g. 8 = Netflix
  added_at    timestamptz not null default now(),
  primary key (user_id, provider_id)
);

comment on table public.user_services is 'Streaming services a user has, as TMDB provider ids.';

revoke all on public.user_services from anon, authenticated;
grant select, insert, delete on public.user_services to authenticated;

alter table public.user_services enable row level security;

-- List-mates can see each other's services: the picker needs to know what
-- either of you can watch.
create policy "Users can read their own and their list-mates' services"
  on public.user_services for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or user_id in (select private.list_mates())
  );

create policy "Users can add their own services"
  on public.user_services for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can remove their own services"
  on public.user_services for delete
  to authenticated
  using (user_id = (select auth.uid()));
