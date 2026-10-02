-- Let people who share a list see each other's ratings, so the app can tell
-- you "your friend has already seen this". Writing stays own-ratings-only.
--
-- Note: sharing ANY list shows ALL of your ratings to that person, not just
-- ratings of movies on the shared list. That's deliberate: the picker needs
-- to know everything either of you has seen.

-- Everyone who shares at least one list with me (not including me).
-- SECURITY DEFINER so it reads list_members directly instead of going
-- through list_members' own policies again.
create function private.list_mates()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select distinct other.user_id
  from public.list_members mine
  join public.list_members other on other.list_id = mine.list_id
  where mine.user_id = (select auth.uid())
    and other.user_id <> (select auth.uid());
$$;

revoke all on function private.list_mates() from public, anon, authenticated;
grant execute on function private.list_mates() to authenticated;

-- Replace the read policy. "in (select ...)" makes Postgres compute the set of
-- list-mates once per query, instead of calling a function once per row.
drop policy "Users can read their own ratings" on public.ratings;

create policy "Users can read their own and their list-mates' ratings"
  on public.ratings for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or user_id in (select private.list_mates())
  );
