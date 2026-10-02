-- RLS tests for public.list_items.
-- Run:  npx supabase db query --linked -f supabase/tests/list_items_rls.sql
-- Safe on the real database: it always ends in an error that rolls back
-- everything. The error message holds the results.

do $$
declare
  me       uuid;
  friend   uuid;
  stranger uuid;
  lid      uuid;
  n        int;
  seen     text;
  log      text := '';
begin
  -- Setup as the database owner
  -- Stand-in accounts (rolled back with everything else), so the test works
  -- the same on a fresh CI database and on the real one.
  me       := gen_random_uuid();
  friend   := gen_random_uuid();
  stranger := gen_random_uuid();
  insert into auth.users (id, aud, role, email) values
    (me,       'authenticated', 'authenticated', 'rls-test-me@example.invalid'),
    (friend,   'authenticated', 'authenticated', 'rls-test-friend@example.invalid'),
    (stranger, 'authenticated', 'authenticated', 'rls-test-stranger@example.invalid');
  insert into public.movies (id, title) values (949, 'Heat'), (603, 'The Matrix'), (13, 'Forrest Gump');
  insert into public.ratings (user_id, movie_id, verdict) values (friend, 949, 'up');  -- she's seen Heat

  execute 'set local role authenticated';

  -- ===== Me: make a shared list =====
  perform set_config('request.jwt.claims', json_build_object('sub', me, 'role', 'authenticated')::text, true);
  insert into public.lists (name) values ('Movie night') returning id into lid;
  insert into public.list_members (list_id, user_id) values (lid, friend);

  begin
    insert into public.list_items (list_id, movie_id) values (lid, 949), (lid, 13);
    log := log || E'\n01 me: add Heat and Forrest Gump (expect allowed): allowed';
  exception when others then log := log || E'\n01 me: add Heat and Forrest Gump (expect allowed): BLOCKED ' || sqlerrm; end;

  select count(*) into n from public.list_items where list_id = lid and added_by = me;
  log := log || E'\n02 me: added_by filled in as me automatically (expect 2): ' || n;

  begin
    insert into public.list_items (list_id, movie_id) values (lid, 949);
    log := log || E'\n03 me: add Heat a second time (expect blocked): ALLOWED';
  exception when others then log := log || E'\n03 me: add Heat a second time (expect blocked): blocked - ' || sqlerrm; end;

  begin
    insert into public.list_items (list_id, movie_id, added_by) values (lid, 603, friend);
    log := log || E'\n04 me: add a movie "as my friend" (expect blocked): ALLOWED';
  exception when others then log := log || E'\n04 me: add a movie "as my friend" (expect blocked): blocked - ' || sqlerrm; end;

  begin
    insert into public.list_items (list_id, movie_id) values (lid, 999999999);
    log := log || E'\n05 me: add a movie that isn''t cached (expect blocked): ALLOWED';
  exception when others then log := log || E'\n05 me: add a movie that isn''t cached (expect blocked): blocked - ' || sqlerrm; end;

  begin
    update public.list_items set movie_id = 603 where list_id = lid and movie_id = 13;
    log := log || E'\n06 me: edit an item (expect blocked, nothing to edit): ALLOWED';
  exception when others then log := log || E'\n06 me: edit an item (expect blocked, nothing to edit): blocked - ' || sqlerrm; end;

  -- The real feature: for each movie on our list, which members have seen it?
  select string_agg(format('%s=%s', mv.title, coalesce(w.seen_by, 0)), ', ' order by mv.title) into seen
  from public.list_items li
  join public.movies mv on mv.id = li.movie_id
  left join lateral (
    select count(*) as seen_by
    from public.ratings r
    join public.list_members m on m.user_id = r.user_id and m.list_id = li.list_id
    where r.movie_id = li.movie_id
  ) w on true
  where li.list_id = lid;
  log := log || E'\n07 me: members who have seen each movie (expect Forrest Gump=0, Heat=1): ' || seen;

  -- ===== My friend =====
  perform set_config('request.jwt.claims', json_build_object('sub', friend, 'role', 'authenticated')::text, true);

  select count(*) into n from public.list_items where list_id = lid;
  log := log || E'\n08 friend: movies she can see on our list (expect 2): ' || n;

  begin
    insert into public.list_items (list_id, movie_id) values (lid, 603);
    log := log || E'\n09 friend: add The Matrix (expect allowed): allowed';
  exception when others then log := log || E'\n09 friend: add The Matrix (expect allowed): BLOCKED ' || sqlerrm; end;

  delete from public.list_items where list_id = lid and movie_id = 13;   -- added by me
  get diagnostics n = row_count;
  log := log || E'\n10 friend: remove a movie I added (expect 1 row): ' || n || ' rows';

  -- ===== The stranger =====
  perform set_config('request.jwt.claims', json_build_object('sub', stranger, 'role', 'authenticated')::text, true);

  select count(*) into n from public.list_items where list_id = lid;
  log := log || E'\n11 stranger: movies on our list (expect 0): ' || n;

  begin
    insert into public.list_items (list_id, movie_id) values (lid, 13);
    log := log || E'\n12 stranger: add a movie to our list (expect blocked): ALLOWED';
  exception when others then log := log || E'\n12 stranger: add a movie to our list (expect blocked): blocked - ' || sqlerrm; end;

  delete from public.list_items where list_id = lid;
  get diagnostics n = row_count;
  log := log || E'\n13 stranger: delete our movies (expect 0 rows): ' || n || ' rows';

  -- ===== My friend leaves =====
  perform set_config('request.jwt.claims', json_build_object('sub', friend, 'role', 'authenticated')::text, true);
  delete from public.list_members where list_id = lid and user_id = friend;
  select count(*) into n from public.list_items where list_id = lid;
  log := log || E'\n14 friend, after leaving: movies she can see (expect 0): ' || n;

  -- ===== Me: what she added stays; deleting the list removes the items =====
  perform set_config('request.jwt.claims', json_build_object('sub', me, 'role', 'authenticated')::text, true);
  select count(*) into n from public.list_items where list_id = lid and added_by = friend;
  log := log || E'\n15 me: the movie she added is still on my list (expect 1): ' || n;

  delete from public.lists where id = lid;
  execute 'reset role';
  select count(*) into n from public.list_items where list_id = lid;
  log := log || E'\n16 items left after deleting the list (expect 0): ' || n;

  -- ===== Logged out =====
  execute 'set local role anon';
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  begin
    select count(*) into n from public.list_items;
    log := log || E'\n17 logged out: read list items (expect blocked): ALLOWED, rows=' || n;
  exception when others then log := log || E'\n17 logged out: read list items (expect blocked): blocked - ' || sqlerrm; end;

  raise exception 'TEST RESULTS (all rolled back):%', log;
end $$;
