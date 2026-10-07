-- profiles: a display name per person, so shared lists can say who added a
-- movie and who has seen it.
-- invite_to_list(): add someone to a list by email.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 50)
);

comment on table public.profiles is 'Display names. Visible to yourself and the people you share a list with.';

-- "sam.smith@example.com" -> "sam.smith"
create function private.default_display_name(_email text)
returns text
language sql
immutable
set search_path = ''
as $$
  select coalesce(nullif(trim(left(split_part(_email, '@', 1), 50)), ''), 'Movie fan');
$$;

-- Every new account gets a profile, named after its email until changed.
create function private.create_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, private.default_display_name(new.email));
  return new;
end;
$$;

revoke all on function private.create_profile() from public, anon, authenticated;
revoke all on function private.default_display_name(text) from public, anon, authenticated;

create trigger on_auth_user_created_create_profile
  after insert on auth.users
  for each row execute function private.create_profile();

-- Backfill: accounts that existed before this migration.
insert into public.profiles (user_id, display_name)
select id, private.default_display_name(email) from auth.users
on conflict (user_id) do nothing;

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;   -- only the name can change

alter table public.profiles enable row level security;

create policy "Users can read their own and their list-mates' profiles"
  on public.profiles for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or user_id in (select private.list_mates())
  );

create policy "Users can rename themselves"
  on public.profiles for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- invite_to_list(list_id, email)
-- ---------------------------------------------------------------------------

-- Adds the account with this email to a list the caller created. Called from
-- the app as supabase.rpc('invite_to_list', ...).
--
-- SECURITY DEFINER because only the function owner can read auth.users.
-- Lives in public (not private) so the API exposes it.
--
-- Errors the app turns into messages:
--   42501  the caller didn't create this list
--   P0002  no account uses that email
--
-- Known trade-off: a list creator can learn whether an email has an account.
-- Sign-ups are invite-only, so that reveals very little.
create function public.invite_to_list(_list_id uuid, _email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitee uuid;
begin
  if not private.is_list_creator(_list_id) then
    raise exception 'Only the person who created a list can invite people to it'
      using errcode = '42501';
  end if;

  select u.id into invitee
  from auth.users u
  where lower(u.email) = lower(trim(_email));

  if invitee is null then
    raise exception 'No account uses that email' using errcode = 'P0002';
  end if;

  insert into public.list_members (list_id, user_id)
  values (_list_id, invitee)
  on conflict (list_id, user_id) do nothing;   -- already a member: nothing to do
end;
$$;

revoke all on function public.invite_to_list(uuid, text) from public, anon, authenticated;
grant execute on function public.invite_to_list(uuid, text) to authenticated;
