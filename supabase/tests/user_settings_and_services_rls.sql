-- RLS tests for public.user_settings and public.user_services.
-- Run:  npx supabase db query --linked -f supabase/tests/user_settings_and_services_rls.sql
-- Safe on the real database: it always ends in an error that rolls back
-- everything. The error message holds the results.

do $$
declare
  me       uuid;
  friend   uuid;
  stranger uuid;
  lid      uuid;
  n        int;
  r        text;
  log      text := '';
begin
  -- Setup as the database owner. Inserting users fires the settings trigger.
  -- Stand-in accounts (rolled back with everything else), so the test works
  -- the same on a fresh CI database and on the real one.
  me       := gen_random_uuid();
  friend   := gen_random_uuid();
  stranger := gen_random_uuid();
  insert into auth.users (id, aud, role, email) values
    (me,       'authenticated', 'authenticated', 'rls-test-me@example.invalid'),
    (friend,   'authenticated', 'authenticated', 'rls-test-friend@example.invalid'),
    (stranger, 'authenticated', 'authenticated', 'rls-test-stranger@example.invalid');

  select count(*) into n from public.user_settings where user_id in (me, friend, stranger);
  log := log || E'\n01 new accounts got a settings row automatically (expect 3): ' || n;

  insert into public.user_services (user_id, provider_id) values (friend, 15);   -- she has Hulu

  execute 'set local role authenticated';

  -- ===== Me: settings =====
  perform set_config('request.jwt.claims', json_build_object('sub', me, 'role', 'authenticated')::text, true);

  select region into r from public.user_settings where user_id = me;
  log := log || E'\n02 me: my settings row exists (made by the trigger), region (expect US): ' || coalesce(r, 'MISSING');

  update public.user_settings set region = 'GB' where user_id = me;
  get diagnostics n = row_count;
  log := log || E'\n03 me: change my region to GB (expect 1 row): ' || n || ' rows';

  begin
    update public.user_settings set region = 'usa' where user_id = me;
    log := log || E'\n04 me: region ''usa'' (expect blocked): ALLOWED';
  exception when others then log := log || E'\n04 me: region ''usa'' (expect blocked): blocked - ' || sqlerrm; end;

  select count(*) into n from public.user_settings where user_id = friend;
  log := log || E'\n05 me: read my friend''s settings (expect 0): ' || n;

  update public.user_settings set region = 'GB' where user_id = friend;
  get diagnostics n = row_count;
  log := log || E'\n06 me: change my friend''s region (expect 0 rows): ' || n || ' rows';

  begin
    insert into public.user_settings (user_id) values (gen_random_uuid());
    log := log || E'\n07 me: create a settings row myself (expect blocked): ALLOWED';
  exception when others then log := log || E'\n07 me: create a settings row myself (expect blocked): blocked - ' || sqlerrm; end;

  -- ===== Me: services =====
  begin
    insert into public.user_services (provider_id) values (8);
    log := log || E'\n08 me: add Netflix (expect allowed): allowed';
  exception when others then log := log || E'\n08 me: add Netflix (expect allowed): BLOCKED ' || sqlerrm; end;

  begin
    insert into public.user_services (provider_id) values (8);
    log := log || E'\n09 me: add Netflix twice (expect blocked): ALLOWED';
  exception when others then log := log || E'\n09 me: add Netflix twice (expect blocked): blocked - ' || sqlerrm; end;

  begin
    insert into public.user_services (user_id, provider_id) values (friend, 337);
    log := log || E'\n10 me: add a service for my friend (expect blocked): ALLOWED';
  exception when others then log := log || E'\n10 me: add a service for my friend (expect blocked): blocked - ' || sqlerrm; end;

  begin
    insert into public.user_services (provider_id) values (0);
    log := log || E'\n11 me: provider id 0 (expect blocked): ALLOWED';
  exception when others then log := log || E'\n11 me: provider id 0 (expect blocked): blocked - ' || sqlerrm; end;

  select count(*) into n from public.user_services where user_id = friend;
  log := log || E'\n12 me, no shared list: my friend''s services (expect 0): ' || n;

  insert into public.lists (name) values ('Movie night') returning id into lid;
  insert into public.list_members (list_id, user_id) values (lid, friend);

  select count(*) into n from public.user_services where user_id = friend;
  log := log || E'\n13 me, sharing a list: my friend''s services (expect 1): ' || n;

  -- What the picker will ask: which services does at least one of us have?
  select count(distinct s.provider_id) into n
  from public.user_services s
  join public.list_members m on m.user_id = s.user_id
  where m.list_id = lid;
  log := log || E'\n14 me: services either of us has (expect 2: Netflix + Hulu): ' || n;

  delete from public.user_services where user_id = friend;
  get diagnostics n = row_count;
  log := log || E'\n15 me: remove my friend''s service (expect 0 rows): ' || n || ' rows';

  -- ===== The stranger =====
  perform set_config('request.jwt.claims', json_build_object('sub', stranger, 'role', 'authenticated')::text, true);
  select count(*) into n from public.user_services;
  log := log || E'\n16 stranger: services they can see (expect 0): ' || n;

  -- ===== Logged out =====
  execute 'set local role anon';
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  begin
    select count(*) into n from public.user_services;
    log := log || E'\n17 logged out: read services (expect blocked): ALLOWED, rows=' || n;
  exception when others then log := log || E'\n17 logged out: read services (expect blocked): blocked - ' || sqlerrm; end;

  raise exception 'TEST RESULTS (all rolled back):%', log;
end $$;
