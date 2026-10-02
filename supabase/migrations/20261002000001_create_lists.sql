-- lists + list_members: a list with one member is personal, with more it's shared.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.lists (
  id         uuid primary key default gen_random_uuid(),   -- unguessable, safe in URLs
  name       text not null check (char_length(trim(name)) between 1 and 100),
  created_by uuid not null default auth.uid()
               references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.lists is 'Watchlists. Who can see one is decided by list_members.';

create table public.list_members (
  list_id  uuid not null references public.lists (id) on delete cascade,
  user_id  uuid not null references auth.users (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (list_id, user_id)                -- each person once per list
);

comment on table public.list_members is 'Who belongs to each list. One member = personal list.';

-- The primary key covers lookups by list_id; this covers "which lists am I in?".
create index list_members_user_id_idx on public.list_members (user_id);
create index lists_created_by_idx on public.lists (created_by);

-- ---------------------------------------------------------------------------
-- Helpers in a private schema: usable from policies, not exposed by the API
-- ---------------------------------------------------------------------------

create schema if not exists private;
grant usage on schema private to authenticated;

-- "Am I a member of this list?" SECURITY DEFINER lets it read list_members
-- without re-running list_members' own policies (which would recurse forever).
-- It only ever answers about the caller, so it can't be used to snoop.
create function private.is_list_member(_list_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.list_members m
    where m.list_id = _list_id
      and m.user_id = (select auth.uid())
  );
$$;

-- "Did I create this list?"
create function private.is_list_creator(_list_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.lists l
    where l.id = _list_id
      and l.created_by = (select auth.uid())
  );
$$;

-- New functions are executable by everyone by default; allow only logged-in users.
revoke all on function private.is_list_member(uuid)  from public, anon, authenticated;
revoke all on function private.is_list_creator(uuid) from public, anon, authenticated;
grant execute on function private.is_list_member(uuid)  to authenticated;
grant execute on function private.is_list_creator(uuid) to authenticated;

-- Trigger: whoever creates a list automatically becomes its first member.
create function private.add_creator_as_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.list_members (list_id, user_id)
  values (new.id, new.created_by);
  return new;
end;
$$;

revoke all on function private.add_creator_as_member() from public, anon, authenticated;

create trigger lists_add_creator_as_member
  after insert on public.lists
  for each row execute function private.add_creator_as_member();

-- ---------------------------------------------------------------------------
-- Layer 1, table access (GRANT)
-- ---------------------------------------------------------------------------

revoke all on public.lists        from anon, authenticated;
revoke all on public.list_members from anon, authenticated;

grant select, insert, delete on public.lists to authenticated;
grant update (name)          on public.lists to authenticated;   -- only the name can change
grant select, insert, delete on public.list_members to authenticated;

-- ---------------------------------------------------------------------------
-- Layer 2, row access (RLS)
-- ---------------------------------------------------------------------------

alter table public.lists        enable row level security;
alter table public.list_members enable row level security;

-- lists
create policy "Members can see their lists"
  on public.lists for select
  to authenticated
  -- created_by check: lets "insert ... returning" see the new row before the
  -- trigger has added the creator as a member.
  using (created_by = (select auth.uid()) or private.is_list_member(id));

create policy "Users can create lists as themselves"
  on public.lists for insert
  to authenticated
  with check (created_by = (select auth.uid()));

create policy "Members can rename their lists"
  on public.lists for update
  to authenticated
  using (private.is_list_member(id))
  with check (private.is_list_member(id));

create policy "Creators can delete their lists"
  on public.lists for delete
  to authenticated
  using (created_by = (select auth.uid()));

-- list_members
create policy "Members can see who is in their lists"
  on public.list_members for select
  to authenticated
  using (private.is_list_member(list_id));

create policy "Creators can add people to their lists"
  on public.list_members for insert
  to authenticated
  with check (private.is_list_creator(list_id));

create policy "Creators can remove members; anyone can leave"
  on public.list_members for delete
  to authenticated
  using (user_id = (select auth.uid()) or private.is_list_creator(list_id));
