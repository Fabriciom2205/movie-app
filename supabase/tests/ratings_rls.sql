-- RLS tests for public.ratings (and write access to public.movies).
-- Run:  npx supabase db query --linked -f supabase/tests/ratings_rls.sql
-- Safe on the real database: it always ends in an error that rolls back
-- everything, including the stand-in friend user. The error message holds
-- the results; each line says what it expects.

do $$
declare
  me     uuid;
  friend uuid;
  n      int;
  log    text := '';
begin
  -- Setup as the database owner (bypasses RLS)
  -- Stand-in accounts (rolled back with everything else), so the test works
  -- the same on a fresh CI database and on the real one.
  me     := gen_random_uuid();
  friend := gen_random_uuid();
  insert into auth.users (id, aud, role, email) values
    (me,     'authenticated', 'authenticated', 'rls-test-me@example.invalid'),
    (friend, 'authenticated', 'authenticated', 'rls-test-friend@example.invalid');
  insert into public.movies (id, title) values (949, 'Heat'), (603, 'The Matrix');
  insert into public.ratings (user_id, movie_id, verdict) values (friend, 949, 'up');

  -- Become "me", exactly like a logged-in API request
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims',
    json_build_object('sub', me, 'role', 'authenticated')::text, true);

  select count(*) into n from public.ratings;
  log := log || E'\n01 read: rows visible before rating anything (expect 0): ' || n;

  begin
    insert into public.ratings (movie_id, verdict) values (949, 'down');
    log := log || E'\n02 add my own rating (expect allowed): allowed';
  exception when others then log := log || E'\n02 add my own rating (expect allowed): BLOCKED ' || sqlerrm; end;

  select count(*) into n from public.ratings;
  log := log || E'\n03 read: rows visible now (expect 1, only mine): ' || n;

  begin
    insert into public.ratings (user_id, movie_id, verdict) values (friend, 603, 'down');
    log := log || E'\n04 add a rating AS my friend (expect blocked): ALLOWED';
  exception when others then log := log || E'\n04 add a rating AS my friend (expect blocked): blocked - ' || sqlerrm; end;

  update public.ratings set verdict = 'down' where user_id = friend;
  get diagnostics n = row_count;
  log := log || E'\n05 change my friend''s rating (expect 0 rows): ' || n || ' rows';

  begin
    update public.ratings set user_id = friend where user_id = me;
    log := log || E'\n06 hand my rating to my friend (expect blocked): ALLOWED';
  exception when others then log := log || E'\n06 hand my rating to my friend (expect blocked): blocked - ' || sqlerrm; end;

  delete from public.ratings where user_id = friend;
  get diagnostics n = row_count;
  log := log || E'\n07 delete my friend''s rating (expect 0 rows): ' || n || ' rows';

  begin
    insert into public.ratings (movie_id, verdict) values (949, 'up');
    log := log || E'\n08 rate the same movie twice (expect blocked): ALLOWED';
  exception when others then log := log || E'\n08 rate the same movie twice (expect blocked): blocked - ' || sqlerrm; end;

  begin
    insert into public.ratings (movie_id, verdict) values (603, 'meh');
    log := log || E'\n09 verdict ''meh'' (expect blocked): ALLOWED';
  exception when others then log := log || E'\n09 verdict ''meh'' (expect blocked): blocked - ' || sqlerrm; end;

  begin
    insert into public.ratings (movie_id, verdict) values (999999999, 'up');
    log := log || E'\n10 rate a movie not in the cache (expect blocked): ALLOWED';
  exception when others then log := log || E'\n10 rate a movie not in the cache (expect blocked): blocked - ' || sqlerrm; end;

  begin
    insert into public.movies (id, title) values (1, 'Hacked');
    log := log || E'\n11 write to movies as a user (expect blocked): ALLOWED';
  exception when others then log := log || E'\n11 write to movies as a user (expect blocked): blocked - ' || sqlerrm; end;

  -- Become a logged-out visitor
  execute 'set local role anon';
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  begin
    select count(*) into n from public.ratings;
    log := log || E'\n12 read ratings logged out (expect blocked): ALLOWED, rows=' || n;
  exception when others then log := log || E'\n12 read ratings logged out (expect blocked): blocked - ' || sqlerrm; end;

  raise exception 'TEST RESULTS (all rolled back):%', log;
end $$;
