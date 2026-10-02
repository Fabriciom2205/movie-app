-- RLS tests: list-mates can read each other's ratings (and nothing more).
-- Run:  npx supabase db query --linked -f supabase/tests/ratings_sharing_rls.sql
-- Safe on the real database: it always ends in an error that rolls back
-- everything. The error message holds the results.

do $$
declare
  me       uuid;
  friend   uuid;
  stranger uuid;
  lid      uuid;
  solo     uuid;
  n        int;
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
  insert into public.movies (id, title) values (949, 'Heat'), (603, 'The Matrix');
  insert into public.ratings (user_id, movie_id, verdict) values
    (me,       603, 'up'),     -- I've seen The Matrix
    (friend,   949, 'up'),     -- my friend has seen Heat
    (stranger, 949, 'down');   -- so has the stranger

  execute 'set local role authenticated';

  -- ===== Before sharing anything =====
  perform set_config('request.jwt.claims', json_build_object('sub', me, 'role', 'authenticated')::text, true);
  select count(*) into n from public.ratings;
  log := log || E'\n01 me, no shared list: ratings I can see (expect 1, only mine): ' || n;

  -- I make a list and add my friend
  insert into public.lists (name) values ('Movie night') returning id into lid;
  insert into public.list_members (list_id, user_id) values (lid, friend);

  -- ===== While sharing =====
  select count(*) into n from public.ratings where user_id = friend;
  log := log || E'\n02 me, sharing a list: my friend''s ratings (expect 1): ' || n;

  select count(*) into n from public.ratings where user_id = stranger;
  log := log || E'\n03 me, sharing a list: the stranger''s ratings (expect 0): ' || n;

  -- The real question the app will ask: who on this list has seen Heat?
  select count(*) into n
  from public.ratings r
  join public.list_members m on m.user_id = r.user_id
  where m.list_id = lid and r.movie_id = 949;
  log := log || E'\n04 me: list members who have seen Heat (expect 1, my friend): ' || n;

  update public.ratings set verdict = 'down' where user_id = friend;
  get diagnostics n = row_count;
  log := log || E'\n05 me: change my friend''s rating (expect 0 rows, read-only): ' || n || ' rows';

  delete from public.ratings where user_id = friend;
  get diagnostics n = row_count;
  log := log || E'\n06 me: delete my friend''s rating (expect 0 rows): ' || n || ' rows';

  perform set_config('request.jwt.claims', json_build_object('sub', friend, 'role', 'authenticated')::text, true);
  select count(*) into n from public.ratings where user_id = me;
  log := log || E'\n07 friend: my ratings (expect 1, it works both ways): ' || n;

  perform set_config('request.jwt.claims', json_build_object('sub', stranger, 'role', 'authenticated')::text, true);
  select count(*) into n from public.ratings where user_id <> stranger;
  log := log || E'\n08 stranger: anyone else''s ratings (expect 0): ' || n;

  -- A personal (one-member) list shares nothing
  insert into public.lists (name) values ('Just me') returning id into solo;
  select count(*) into n from public.ratings where user_id <> stranger;
  log := log || E'\n09 stranger with a personal list: others'' ratings (expect 0): ' || n;

  -- ===== After my friend leaves =====
  perform set_config('request.jwt.claims', json_build_object('sub', friend, 'role', 'authenticated')::text, true);
  delete from public.list_members where list_id = lid and user_id = friend;

  perform set_config('request.jwt.claims', json_build_object('sub', me, 'role', 'authenticated')::text, true);
  select count(*) into n from public.ratings where user_id = friend;
  log := log || E'\n10 me, after my friend left: her ratings (expect 0): ' || n;

  select count(*) into n from public.ratings where user_id = me;
  log := log || E'\n11 me: my own ratings are unaffected (expect 1): ' || n;

  raise exception 'TEST RESULTS (all rolled back):%', log;
end $$;
