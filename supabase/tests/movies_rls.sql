-- RLS tests for public.movies, the shared TMDB cache (including genre_ids).
-- Run:  npx supabase db query --linked -f supabase/tests/movies_rls.sql
-- Safe on the real database: it always ends in an error that rolls back
-- everything. The error message holds the results.

do $$
declare
  me  uuid;
  n   int;
  g   integer[];
  log text := '';
begin
  -- Setup as the database owner (the server's secret key bypasses RLS the same way).
  me := gen_random_uuid();
  insert into auth.users (id, aud, role, email) values
    (me, 'authenticated', 'authenticated', 'rls-test-me@example.invalid');
  insert into public.movies (id, title, genre_ids) values (999000001, 'Test Movie', '{878,12}');

  begin
    insert into public.movies (id, title, genre_ids) values (999000002, 'Junk', array_fill(1, array[21]));
    log := log || E'\n01 owner: movie with 21 genres (expect blocked): ALLOWED';
  exception when others then log := log || E'\n01 owner: movie with 21 genres (expect blocked): blocked - ' || sqlerrm; end;

  insert into public.movies (id, title) values (999000003, 'Cached before genres');
  select genre_ids into g from public.movies where id = 999000003;
  log := log || E'\n02 owner: genres left out are unknown (expect null): ' || coalesce(g::text, 'null');

  -- ===== Logged in =====
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub', me, 'role', 'authenticated')::text, true);

  select genre_ids into g from public.movies where id = 999000001;
  log := log || E'\n03 me: read a movie''s genres (expect 878/12): ' || coalesce(array_to_string(g, '/'), 'HIDDEN');

  begin
    insert into public.movies (id, title) values (999000004, 'Fake');
    log := log || E'\n04 me: add a movie to the cache (expect blocked): ALLOWED';
  exception when others then log := log || E'\n04 me: add a movie to the cache (expect blocked): blocked - ' || sqlerrm; end;

  begin
    update public.movies set genre_ids = '{27}' where id = 999000001;
    get diagnostics n = row_count;
    log := log || E'\n05 me: change a movie''s genres (expect blocked): ALLOWED, rows=' || n;
  exception when others then log := log || E'\n05 me: change a movie''s genres (expect blocked): blocked - ' || sqlerrm; end;

  begin
    delete from public.movies where id = 999000001;
    get diagnostics n = row_count;
    log := log || E'\n06 me: delete a cached movie (expect blocked): ALLOWED, rows=' || n;
  exception when others then log := log || E'\n06 me: delete a cached movie (expect blocked): blocked - ' || sqlerrm; end;

  -- ===== Logged out =====
  execute 'set local role anon';
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  begin
    select count(*) into n from public.movies;
    log := log || E'\n07 logged out: read movies (expect blocked): ALLOWED, rows=' || n;
  exception when others then log := log || E'\n07 logged out: read movies (expect blocked): blocked - ' || sqlerrm; end;

  raise exception 'TEST RESULTS (all rolled back):%', log;
end $$;
